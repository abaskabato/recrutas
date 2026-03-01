import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Target, Clock, Users, ArrowRight } from "lucide-react";
import type { JobPosting } from "./types";

interface AnalyticsTabProps {
  jobs: JobPosting[];
  allApplicants: any[];
}

export default function AnalyticsTab({ jobs, allApplicants: rawApplicants }: AnalyticsTabProps) {
  const allApplicants = Array.isArray(rawApplicants) ? rawApplicants : [];
  const now = new Date();
  const getWeekStart = (weeksAgo: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (weeksAgo * 7));
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const periods = [
    { label: 'This Week', start: getWeekStart(0), end: now },
    { label: 'Last Week', start: getWeekStart(1), end: getWeekStart(0) },
    { label: '2 Weeks Ago', start: getWeekStart(2), end: getWeekStart(1) },
    { label: '3 Weeks Ago', start: getWeekStart(3), end: getWeekStart(2) }
  ];

  const maxApps = Math.max(...periods.map(period => {
    return allApplicants.filter(app => {
      if (!app.appliedAt) return false;
      const appliedDate = new Date(app.appliedAt);
      return appliedDate >= period.start && appliedDate < period.end;
    }).length;
  }), 1);

  // Response time calculation
  const responseTimes = allApplicants
    .filter(app => {
      if (app.status === 'submitted') return false;
      if (!app.updatedAt || !app.appliedAt) return false;
      try {
        const applied = new Date(app.appliedAt).getTime();
        const updated = new Date(app.updatedAt).getTime();
        return !isNaN(applied) && !isNaN(updated);
      } catch {
        return false;
      }
    })
    .map(app => {
      const applied = new Date(app.appliedAt).getTime();
      const responded = new Date(app.updatedAt).getTime();
      return (responded - applied) / (1000 * 60 * 60);
    })
    .filter(hours => hours >= 0 && hours < 8760);

  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0;

  const formatTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${hours.toFixed(1)} hrs`;
    return `${(hours / 24).toFixed(1)} days`;
  };

  const allSkills = jobs.flatMap(job => job.skills);
  const skillCounts = allSkills.reduce((acc, skill) => {
    acc[skill] = (acc[skill] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const maxSkillCount = Math.max(...Object.values(skillCounts), 1);

  const buckets = [
    { range: '< 1 hour', filter: (h: number) => h < 1, color: 'bg-emerald-500' },
    { range: '1–4 hours', filter: (h: number) => h >= 1 && h < 4, color: 'bg-amber-400' },
    { range: '4–24 hours', filter: (h: number) => h >= 4 && h < 24, color: 'bg-orange-500' },
    { range: '> 24 hours', filter: (h: number) => h >= 24, color: 'bg-red-500' }
  ];

  const funnelStages = [
    { stage: 'Applied', count: allApplicants.length, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800' },
    { stage: 'Viewed', count: allApplicants.filter(c => c.status === 'viewed').length, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950', border: 'border-violet-200 dark:border-violet-800' },
    { stage: 'Screening', count: allApplicants.filter(c => c.status === 'screening').length, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950', border: 'border-amber-200 dark:border-amber-800' },
    { stage: 'Interview', count: allApplicants.filter(c => c.status === 'interview_scheduled' || c.status === 'interview_completed').length, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-200 dark:border-orange-800' },
    { stage: 'Offer', count: allApplicants.filter(c => c.status === 'offer').length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950', border: 'border-emerald-200 dark:border-emerald-800' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analytics</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track your hiring performance and pipeline metrics</p>
      </div>

      {/* Hiring Funnel — full width */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-7 w-7 rounded-md bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Hiring Funnel</h3>
        </div>
        <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
          {funnelStages.map(({ stage, count, color, bg, border }, idx) => (
            <div key={stage} className="flex items-center gap-1 flex-1 min-w-0">
              <div className={`flex-1 rounded-lg border ${border} ${bg} p-4 text-center min-w-[80px]`}>
                <div className={`text-2xl font-bold ${color}`}>{count}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{stage}</div>
                {allApplicants.length > 0 && stage !== 'Applied' && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {Math.round((count / allApplicants.length) * 100)}%
                  </div>
                )}
              </div>
              {idx < funnelStages.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Job Performance */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-7 w-7 rounded-md bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Job Performance</h3>
          </div>
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No jobs yet.</p>
          ) : (
            <div className="space-y-4">
              {jobs.slice(0, 5).map((job) => {
                const viewCount = job.viewCount || 0;
                const applicationCount = job.applicationCount || 0;
                const performance = Math.min(100, (applicationCount / Math.max(viewCount, 1)) * 100);
                return (
                  <div key={job.id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[60%]">{job.title}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs tabular-nums">{Math.round(performance)}% conv.</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${performance}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                      <span>{viewCount} views</span>
                      <span>{applicationCount} apps</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Application Trends */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-7 w-7 rounded-md bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Application Trends</h3>
          </div>
          <div className="flex items-end gap-3 h-32">
            {periods.map((period) => {
              const applications = allApplicants.filter(app => {
                if (!app.appliedAt) return false;
                const appliedDate = new Date(app.appliedAt);
                return appliedDate >= period.start && appliedDate < period.end;
              }).length;
              const heightPct = Math.max((applications / maxApps) * 100, 4);
              const isThisWeek = period.label === 'This Week';
              return (
                <div key={period.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{applications}</span>
                  <div className="w-full flex items-end justify-center h-20">
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${isThisWeek ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 text-center leading-tight">{period.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Skills */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-7 w-7 rounded-md bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
              <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Top Skills in Demand</h3>
          </div>
          {Object.keys(skillCounts).length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No skills data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(skillCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([skill, count]) => {
                  const pct = (count / maxSkillCount) * 100;
                  return (
                    <div key={skill}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{skill}</span>
                        <span className="text-gray-400 dark:text-gray-500">{count} job{count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                        <div
                          className="bg-violet-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Response Time */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-7 w-7 rounded-md bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Response Time</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {responseTimes.length > 0 ? formatTime(avgResponseTime) : '—'}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">avg. response</span>
          </div>
          <div className="space-y-2.5">
            {buckets.map(({ range, filter, color }) => {
              const count = responseTimes.filter(filter).length;
              const percentage = responseTimes.length > 0 ? (count / responseTimes.length) * 100 : 0;
              return (
                <div key={range}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-300">{range}</span>
                    <span className="text-gray-400 dark:text-gray-500">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div
                      className={`${color} h-1.5 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
