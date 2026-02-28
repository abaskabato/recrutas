import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Target, Clock, Users } from "lucide-react";
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

  const buckets = [
    { range: '< 1 hour', filter: (h: number) => h < 1, color: 'bg-green-500' },
    { range: '1-4 hours', filter: (h: number) => h >= 1 && h < 4, color: 'bg-yellow-500' },
    { range: '4-24 hours', filter: (h: number) => h >= 4 && h < 24, color: 'bg-orange-500' },
    { range: '> 24 hours', filter: (h: number) => h >= 24, color: 'bg-red-500' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Analytics</h2>
        <p className="text-gray-500 dark:text-gray-400">Track your hiring performance and metrics</p>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Performance Chart */}
        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Job Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs.slice(0, 5).map((job) => {
                const viewCount = job.viewCount || 0;
                const applicationCount = job.applicationCount || 0;
                const performance = Math.min(100, (applicationCount / Math.max(viewCount, 1)) * 100);
                return (
                  <div key={job.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate">{job.title}</span>
                      <span className="text-gray-500 dark:text-gray-400">{Math.round(performance)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${performance}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{viewCount} views</span>
                      <span>{applicationCount} applications</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Application Trends */}
        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Application Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {periods.map((period) => {
                const applications = allApplicants.filter(app => {
                  if (!app.appliedAt) return false;
                  const appliedDate = new Date(app.appliedAt);
                  return appliedDate >= period.start && appliedDate < period.end;
                }).length;

                const percentage = (applications / maxApps) * 100;

                return (
                  <div key={period.label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{period.label}</span>
                      <span className="text-gray-500 dark:text-gray-400">{applications} applications</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Skills in Demand */}
        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Top Skills in Demand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(skillCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([skill, count]) => (
                  <div key={skill} className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{count} jobs</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Response Time Analysis */}
        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Response Time Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {responseTimes.length > 0 ? formatTime(avgResponseTime) : 'N/A'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Average Response Time</div>
              </div>

              <div className="space-y-3">
                {buckets.map(({ range, filter, color }) => {
                  const count = responseTimes.filter(filter).length;
                  const percentage = responseTimes.length > 0 ? (count / responseTimes.length) * 100 : 0;
                  return (
                    <div key={range} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{range}</span>
                        <span className="text-gray-500 dark:text-gray-400">{count} responses</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`${color} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hiring Funnel */}
      <Card className="bg-white dark:bg-gray-800 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Hiring Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { stage: 'Submitted', count: allApplicants.length, color: 'bg-blue-500' },
              { stage: 'Viewed', count: allApplicants.filter(c => c.status === 'viewed').length, color: 'bg-green-500' },
              { stage: 'Screening', count: allApplicants.filter(c => c.status === 'screening').length, color: 'bg-yellow-500' },
              { stage: 'Interview', count: allApplicants.filter(c => c.status === 'interview_scheduled' || c.status === 'interview_completed').length, color: 'bg-orange-500' },
              { stage: 'Offer', count: allApplicants.filter(c => c.status === 'offer').length, color: 'bg-purple-500' }
            ].map(({ stage, count, color }) => (
              <div key={stage} className="text-center">
                <div className={`${color} text-white rounded-lg p-4 mb-2`}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm opacity-90">{stage}</div>
                </div>
                {stage !== 'Offer' && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {allApplicants.length > 0 ? Math.round((count / allApplicants.length) * 100) : 0}% conversion
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
