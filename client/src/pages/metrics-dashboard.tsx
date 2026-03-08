import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity, AlertTriangle, CheckCircle, Clock, Database, Zap,
  TrendingUp, Server, RefreshCw, ShieldCheck, BarChart3, Layers
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LatencyRow {
  endpoint: string;
  method: string;
  count: number;
  p50: number;
  p95: number;
  p99: number;
  avg_ms: number;
  errors: number;
  client_errors: number;
}

interface ErrorRow { hour: string; total: number; errors: number; error_rate_pct: number; }

interface MatchQualityRow { bucket: string; count: number; avg_score: number; }

interface GrowthRow { day: string; count: number; }

interface EmbeddingCache {
  total_active_jobs: number;
  with_embedding: number;
  fresh_embeddings: number;
  coverage_pct: number;
}

interface JobFeedRow {
  source: string; status: string; count: number;
  avg_ghost_score: number; oldest_job: string; newest_job: string;
}

interface SystemHealth {
  groqLimiter: {
    tokenBucket: number; reqBucket: number; consecutive429s: number;
    circuitOpen: boolean; circuitPauseSecondsRemaining: number;
    queueLengths: Record<string, number>; summaryCacheSize: number;
  };
  redis: { enabled: boolean };
  mlModel: { model: string; dimensions: number };
  inngest: { enabled: boolean };
  sentry: { enabled: boolean };
  environment: string;
  vercel: boolean;
  uptime: number;
  memoryMb: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function latencyColor(ms: number) {
  if (ms < 200) return 'text-green-600';
  if (ms < 800) return 'text-yellow-600';
  return 'text-red-600';
}

function errorRateColor(pct: number) {
  if (pct < 1) return 'bg-green-100 text-green-800';
  if (pct < 5) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

function statusBadge(enabled: boolean, label: string) {
  return enabled
    ? <Badge className="bg-green-100 text-green-800">{label}: On</Badge>
    : <Badge variant="outline" className="text-muted-foreground">{label}: Off</Badge>;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MetricsDashboard() {
  const [secret, setSecret] = useState(() => sessionStorage.getItem('admin_secret') || '');
  const [authenticated, setAuthenticated] = useState(!!sessionStorage.getItem('admin_secret'));
  const [timeRange, setTimeRange] = useState('24');
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [latency, setLatency] = useState<LatencyRow[]>([]);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [matchQuality, setMatchQuality] = useState<{ distribution: MatchQualityRow[]; summary: any }>({ distribution: [], summary: null });
  const [growth, setGrowth] = useState<{ users: GrowthRow[]; jobs: GrowthRow[]; applications: GrowthRow[] }>({ users: [], jobs: [], applications: [] });
  const [embeddingCache, setEmbeddingCache] = useState<EmbeddingCache | null>(null);
  const [jobFeed, setJobFeed] = useState<{ breakdown: JobFeedRow[]; tableSize: string }>({ breakdown: [], tableSize: '' });
  const [system, setSystem] = useState<SystemHealth | null>(null);

  const headers = { 'x-admin-secret': secret };

  const fetchAll = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const [lat, err, mq, gr, ec, jf, sys] = await Promise.all([
        fetch(`/api/admin/metrics/latency?hours=${timeRange}`, { headers }).then(r => r.json()),
        fetch(`/api/admin/metrics/errors?hours=${timeRange}`, { headers }).then(r => r.json()),
        fetch('/api/admin/metrics/match-quality', { headers }).then(r => r.json()),
        fetch('/api/admin/metrics/growth?days=30', { headers }).then(r => r.json()),
        fetch('/api/admin/metrics/embedding-cache', { headers }).then(r => r.json()),
        fetch('/api/admin/metrics/job-feed', { headers }).then(r => r.json()),
        fetch('/api/admin/metrics/system', { headers }).then(r => r.json()),
      ]);
      setLatency(lat.data || []);
      setErrors(err.data || []);
      setMatchQuality({ distribution: mq.distribution || [], summary: mq.summary });
      setGrowth({ users: gr.users || [], jobs: gr.jobs || [], applications: gr.applications || [] });
      setEmbeddingCache(ec);
      setJobFeed({ breakdown: jf.breakdown || [], tableSize: jf.tableSize });
      setSystem(sys);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Failed to fetch metrics:', e);
    } finally {
      setLoading(false);
    }
  }, [authenticated, timeRange, secret]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Auth gate ──────────────────────────────────────────────────────────────

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader><CardTitle>Metrics Dashboard</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              placeholder="Admin secret"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  sessionStorage.setItem('admin_secret', secret);
                  setAuthenticated(true);
                }
              }}
            />
            <Button className="w-full" onClick={() => {
              sessionStorage.setItem('admin_secret', secret);
              setAuthenticated(true);
            }}>
              Enter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Summary stats from latency data ───────────────────────────────────────

  const totalRequests = latency.reduce((s, r) => s + r.count, 0);
  const totalErrors = latency.reduce((s, r) => s + r.errors, 0);
  const overallErrorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(1) : '0.0';
  const slowestEndpoint = [...latency].sort((a, b) => b.p95 - a.p95)[0];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Platform Metrics</h1>
          {lastRefresh && (
            <p className="text-sm text-muted-foreground">
              Last updated {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1h</SelectItem>
              <SelectItem value="6">6h</SelectItem>
              <SelectItem value="24">24h</SelectItem>
              <SelectItem value="72">3 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Activity className="h-4 w-4" />Requests</div>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">last {timeRange}h (20% sample)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><AlertTriangle className="h-4 w-4" />Error Rate</div>
            <div className={`text-2xl font-bold ${parseFloat(overallErrorRate) >= 5 ? 'text-red-600' : parseFloat(overallErrorRate) >= 1 ? 'text-yellow-600' : 'text-green-600'}`}>
              {overallErrorRate}%
            </div>
            <div className="text-xs text-muted-foreground">{totalErrors} 5xx errors</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Clock className="h-4 w-4" />Slowest p95</div>
            <div className={`text-2xl font-bold ${slowestEndpoint ? latencyColor(slowestEndpoint.p95) : ''}`}>
              {slowestEndpoint ? `${slowestEndpoint.p95}ms` : '—'}
            </div>
            <div className="text-xs text-muted-foreground truncate">{slowestEndpoint?.endpoint ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Database className="h-4 w-4" />Job Feed</div>
            <div className="text-2xl font-bold">{jobFeed.tableSize || '—'}</div>
            <div className="text-xs text-muted-foreground">job_postings table size</div>
          </CardContent>
        </Card>
      </div>

      {/* System health */}
      {system && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />System Health</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {statusBadge(system.redis.enabled, 'Redis')}
              {statusBadge(system.inngest.enabled, 'Inngest')}
              {statusBadge(system.sentry.enabled, 'Sentry')}
              {statusBadge(system.vercel, 'Vercel')}
              <Badge variant="outline">{system.mlModel.model.split('/')[1]} ({system.mlModel.dimensions}d)</Badge>
              <Badge variant="outline">Uptime {Math.round(system.uptime / 60)}m</Badge>
              <Badge variant="outline">Heap {system.memoryMb}MB</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Groq token bucket</div>
                <div className="font-mono">{system.groqLimiter.tokenBucket} / 5000</div>
              </div>
              <div>
                <div className="text-muted-foreground">Groq req bucket</div>
                <div className="font-mono">{system.groqLimiter.reqBucket} / 25</div>
              </div>
              <div>
                <div className="text-muted-foreground">Circuit breaker</div>
                <div className={system.groqLimiter.circuitOpen ? 'text-red-600 font-semibold' : 'text-green-600'}>
                  {system.groqLimiter.circuitOpen ? `OPEN (${system.groqLimiter.circuitPauseSecondsRemaining}s)` : 'Closed'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Summary cache</div>
                <div className="font-mono">{system.groqLimiter.summaryCacheSize} / 500</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Embedding cache */}
      {embeddingCache && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Embedding Cache (HF API savings)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Active jobs</div>
                <div className="text-xl font-bold">{embeddingCache.total_active_jobs}</div>
              </div>
              <div>
                <div className="text-muted-foreground">With embedding</div>
                <div className="text-xl font-bold">{embeddingCache.with_embedding}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Fresh (&lt;7d)</div>
                <div className="text-xl font-bold text-green-600">{embeddingCache.fresh_embeddings}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Coverage</div>
                <div className={`text-xl font-bold ${embeddingCache.coverage_pct >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {embeddingCache.coverage_pct}%
                </div>
              </div>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${embeddingCache.coverage_pct}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latency table */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Endpoint Latency (last {timeRange}h)</CardTitle></CardHeader>
        <CardContent>
          {latency.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data yet — metrics accumulate over time (20% sampling).</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4">Endpoint</th>
                    <th className="text-right pr-4">Requests</th>
                    <th className="text-right pr-4">p50</th>
                    <th className="text-right pr-4">p95</th>
                    <th className="text-right pr-4">p99</th>
                    <th className="text-right pr-4">Errors</th>
                    <th className="text-right">Error %</th>
                  </tr>
                </thead>
                <tbody>
                  {latency.map((row, i) => {
                    const errorPct = row.count > 0 ? ((row.errors / row.count) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-2 pr-4 font-mono text-xs">
                          <Badge variant="outline" className="mr-1 text-xs">{row.method}</Badge>
                          {row.endpoint}
                        </td>
                        <td className="text-right pr-4">{row.count}</td>
                        <td className={`text-right pr-4 font-mono ${latencyColor(row.p50)}`}>{row.p50}ms</td>
                        <td className={`text-right pr-4 font-mono ${latencyColor(row.p95)}`}>{row.p95}ms</td>
                        <td className={`text-right pr-4 font-mono ${latencyColor(row.p99)}`}>{row.p99}ms</td>
                        <td className="text-right pr-4">{row.errors}</td>
                        <td className="text-right">
                          <Badge className={errorRateColor(parseFloat(errorPct))}>{errorPct}%</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error rate timeline */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Error Rate Timeline</CardTitle></CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <p className="text-muted-foreground text-sm">No error data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4">Hour</th>
                    <th className="text-right pr-4">Total</th>
                    <th className="text-right pr-4">5xx</th>
                    <th className="text-right">Error Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.slice(-12).map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-1.5 pr-4 font-mono text-xs">{new Date(row.hour).toLocaleString()}</td>
                      <td className="text-right pr-4">{row.total}</td>
                      <td className="text-right pr-4 text-red-600">{row.errors}</td>
                      <td className="text-right">
                        <Badge className={errorRateColor(row.error_rate_pct ?? 0)}>
                          {(row.error_rate_pct ?? 0).toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Match quality */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Match Quality (30d)</CardTitle></CardHeader>
          <CardContent>
            {matchQuality.summary && (
              <div className="flex gap-6 mb-4 text-sm">
                <div><div className="text-muted-foreground">Total matches</div><div className="text-xl font-bold">{matchQuality.summary.total?.toLocaleString()}</div></div>
                <div><div className="text-muted-foreground">Avg score</div><div className="text-xl font-bold">{matchQuality.summary.avg_score}</div></div>
                <div><div className="text-muted-foreground">Median</div><div className="text-xl font-bold">{matchQuality.summary.median_score}</div></div>
              </div>
            )}
            <div className="space-y-2">
              {matchQuality.distribution.map((row, i) => {
                const maxCount = Math.max(...matchQuality.distribution.map(r => r.count));
                const pct = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{row.bucket}</span>
                      <span className="text-muted-foreground">{row.count} matches (avg {row.avg_score})</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Job feed breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />Job Feed Breakdown
              {jobFeed.tableSize && <Badge variant="outline" className="ml-auto">{jobFeed.tableSize}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm max-h-64 overflow-y-auto">
              {jobFeed.breakdown.map((row, i) => (
                <div key={i} className="flex justify-between items-center py-1 border-b last:border-0">
                  <div>
                    <span className="font-mono text-xs">{row.source || 'platform'}</span>
                    <Badge variant="outline" className="ml-2 text-xs">{row.status}</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{row.count.toLocaleString()}</div>
                    {row.avg_ghost_score > 0 && (
                      <div className="text-xs text-muted-foreground">ghost: {row.avg_ghost_score}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth time series */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Growth (last 30 days)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: 'New Users', data: growth.users, color: 'bg-blue-500' },
              { label: 'New Jobs', data: growth.jobs, color: 'bg-green-500' },
              { label: 'Applications', data: growth.applications, color: 'bg-purple-500' },
            ].map(({ label, data, color }) => {
              const total = data.reduce((s, r) => s + r.count, 0);
              const maxVal = Math.max(...data.map(r => r.count), 1);
              return (
                <div key={label}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-sm text-muted-foreground">{total} total</span>
                  </div>
                  <div className="flex items-end gap-px h-16">
                    {data.slice(-30).map((row, i) => (
                      <div
                        key={i}
                        className={`flex-1 ${color} rounded-sm opacity-80`}
                        style={{ height: `${(row.count / maxVal) * 100}%`, minHeight: row.count > 0 ? '2px' : '0' }}
                        title={`${new Date(row.day).toLocaleDateString()}: ${row.count}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
