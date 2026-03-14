import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, AlertTriangle, Building2, Users, Briefcase, Target } from "lucide-react";

interface PlatformStats {
  totalJobs: number;
  totalUsers: number;
  totalMatches: number;
}

interface GhostJobStats {
  totalChecked: number;
  ghostsFound: number;
  deactivated: number;
  lastRun?: string;
}

interface CompanyVerificationStats {
  totalCompanies: number;
  verified: number;
  unverified: number;
  lastRun?: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [secret, setSecret] = useState(() => sessionStorage.getItem('admin_secret') || '');
  const [authenticated, setAuthenticated] = useState(!!sessionStorage.getItem('admin_secret'));

  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [ghostStats, setGhostStats] = useState<GhostJobStats | null>(null);
  const [ghostRunning, setGhostRunning] = useState(false);
  const [ghostFetching, setGhostFetching] = useState(false);

  const [verifyStats, setVerifyStats] = useState<CompanyVerificationStats | null>(null);
  const [verifyRunning, setVerifyRunning] = useState(false);
  const [verifyFetching, setVerifyFetching] = useState(false);

  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-secret': secret,
  };

  async function handleAuth() {
    if (!secret.trim()) return;
    // Test the secret with a lightweight GET
    try {
      const res = await fetch('/api/admin/ghost-job-stats', { headers: adminHeaders });
      if (res.status === 401) {
        toast({ title: 'Invalid admin secret', variant: 'destructive' });
        return;
      }
      sessionStorage.setItem('admin_secret', secret);
      setAuthenticated(true);
      loadPlatformStats();
      loadGhostStats();
      loadVerifyStats();
    } catch {
      toast({ title: 'Connection error', variant: 'destructive' });
    }
  }

  async function loadPlatformStats() {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/platform/stats');
      if (res.ok) {
        const data = await res.json();
        setPlatformStats({
          totalJobs: data.totalJobs ?? data.jobs ?? 0,
          totalUsers: data.totalUsers ?? data.users ?? 0,
          totalMatches: data.totalMatches ?? data.matches ?? 0,
        });
      }
    } catch {
      // ignore
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadGhostStats() {
    setGhostFetching(true);
    try {
      const res = await fetch('/api/admin/ghost-job-stats', { headers: adminHeaders });
      if (res.ok) setGhostStats(await res.json());
    } catch {
      // ignore
    } finally {
      setGhostFetching(false);
    }
  }

  async function runGhostDetection() {
    setGhostRunning(true);
    try {
      const res = await fetch('/api/admin/run-ghost-job-detection', {
        method: 'POST',
        headers: adminHeaders,
      });
      if (res.status === 401) {
        toast({ title: 'Unauthorized — re-enter admin secret', variant: 'destructive' });
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      toast({ title: 'Ghost job detection complete', description: data.message || 'Done' });
      loadGhostStats();
    } catch {
      toast({ title: 'Detection failed', variant: 'destructive' });
    } finally {
      setGhostRunning(false);
    }
  }

  async function loadVerifyStats() {
    setVerifyFetching(true);
    try {
      const res = await fetch('/api/admin/company-verification-stats', { headers: adminHeaders });
      if (res.ok) setVerifyStats(await res.json());
    } catch {
      // ignore
    } finally {
      setVerifyFetching(false);
    }
  }

  async function runCompanyVerification() {
    setVerifyRunning(true);
    try {
      const res = await fetch('/api/admin/run-company-verification', {
        method: 'POST',
        headers: adminHeaders,
      });
      if (res.status === 401) {
        toast({ title: 'Unauthorized — re-enter admin secret', variant: 'destructive' });
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      toast({ title: 'Company verification complete', description: data.message || 'Done' });
      loadVerifyStats();
    } catch {
      toast({ title: 'Verification failed', variant: 'destructive' });
    } finally {
      setVerifyRunning(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Admin Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Admin secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            />
            <Button className="w-full" onClick={handleAuth} disabled={!secret.trim()}>
              Authenticate
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            Admin Panel
          </h1>
          <Button variant="outline" size="sm" onClick={() => {
            sessionStorage.removeItem('admin_secret');
            setAuthenticated(false);
            setSecret('');
          }}>
            Sign Out
          </Button>
        </div>

        {/* Platform Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Platform Stats</span>
              <Button variant="outline" size="sm" onClick={loadPlatformStats} disabled={statsLoading}>
                {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {platformStats ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Briefcase className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{platformStats.totalJobs.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Total Jobs</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{platformStats.totalUsers.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Total Users</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{platformStats.totalMatches.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Total Matches</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : (
                  <Button onClick={loadPlatformStats}>Load Stats</Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ghost Job Detection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Ghost Job Detection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={runGhostDetection} disabled={ghostRunning} className="bg-orange-600 hover:bg-orange-700">
                {ghostRunning ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                ) : (
                  'Run Detection'
                )}
              </Button>
              <Button variant="outline" onClick={loadGhostStats} disabled={ghostFetching}>
                {ghostFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh Stats'}
              </Button>
            </div>

            {ghostFetching && !ghostStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center animate-pulse">
                    <div className="h-6 w-10 bg-gray-300 dark:bg-gray-600 rounded mx-auto mb-1" />
                    <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded mx-auto" />
                  </div>
                ))}
              </div>
            )}
            {ghostStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Checked', value: ghostStats.totalChecked ?? '—', color: 'bg-gray-100 dark:bg-gray-800' },
                  { label: 'Ghosts Found', value: ghostStats.ghostsFound ?? '—', color: 'bg-orange-50 dark:bg-orange-900/20' },
                  { label: 'Deactivated', value: ghostStats.deactivated ?? '—', color: 'bg-red-50 dark:bg-red-900/20' },
                  { label: 'Last Run', value: ghostStats.lastRun ? new Date(ghostStats.lastRun).toLocaleDateString() : 'Never', color: 'bg-blue-50 dark:bg-blue-900/20' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`${color} rounded-lg p-3 text-center`}>
                    <div className="text-lg font-bold">{value}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-600" />
              Company Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={runCompanyVerification} disabled={verifyRunning} className="bg-green-600 hover:bg-green-700">
                {verifyRunning ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                ) : (
                  'Run Verification'
                )}
              </Button>
              <Button variant="outline" onClick={loadVerifyStats} disabled={verifyFetching}>
                {verifyFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh Stats'}
              </Button>
            </div>

            {verifyFetching && !verifyStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center animate-pulse">
                    <div className="h-6 w-10 bg-gray-300 dark:bg-gray-600 rounded mx-auto mb-1" />
                    <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded mx-auto" />
                  </div>
                ))}
              </div>
            )}
            {verifyStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Companies', value: verifyStats.totalCompanies ?? '—', color: 'bg-gray-100 dark:bg-gray-800' },
                  { label: 'Verified', value: verifyStats.verified ?? '—', color: 'bg-green-50 dark:bg-green-900/20' },
                  { label: 'Unverified', value: verifyStats.unverified ?? '—', color: 'bg-yellow-50 dark:bg-yellow-900/20' },
                  { label: 'Last Run', value: verifyStats.lastRun ? new Date(verifyStats.lastRun).toLocaleDateString() : 'Never', color: 'bg-blue-50 dark:bg-blue-900/20' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`${color} rounded-lg p-3 text-center`}>
                    <div className="text-lg font-bold">{value}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
