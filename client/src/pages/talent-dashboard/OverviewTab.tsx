import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Users, Briefcase, MessageSquare, Star,
  Eye, ChevronRight, TrendingUp, ArrowRight
} from "lucide-react";
import type { JobPosting, DashboardStats, TabName } from "./types";

interface OverviewTabProps {
  user: any;
  stats: DashboardStats | undefined;
  statsLoading: boolean;
  jobs: JobPosting[];
  jobsLoading: boolean;
  setActiveTab: (tab: TabName) => void;
  setShowJobWizard: (open: boolean) => void;
}

export default function OverviewTab({
  user,
  stats,
  statsLoading,
  jobs,
  jobsLoading,
  setActiveTab,
  setShowJobWizard,
}: OverviewTabProps) {
  const [, setLocation] = useLocation();

  const statCards = [
    {
      label: "Active Jobs",
      value: statsLoading ? null : (stats?.activeJobs ?? 0),
      icon: Briefcase,
      iconBg: "bg-emerald-50 dark:bg-emerald-950",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      action: () => setActiveTab('jobs'),
      actionLabel: "Manage Jobs",
    },
    {
      label: "Total Matches",
      value: statsLoading ? null : (stats?.totalMatches ?? 0),
      icon: Users,
      iconBg: "bg-blue-50 dark:bg-blue-950",
      iconColor: "text-blue-600 dark:text-blue-400",
      action: () => setActiveTab('candidates'),
      actionLabel: "View Candidates",
    },
    {
      label: "Active Chats",
      value: statsLoading ? null : (stats?.activeChats ?? 0),
      icon: MessageSquare,
      iconBg: "bg-violet-50 dark:bg-violet-950",
      iconColor: "text-violet-600 dark:text-violet-400",
      action: () => setLocation('/chat'),
      actionLabel: "Open Chats",
    },
    {
      label: "Hires Made",
      value: statsLoading ? null : (stats?.hires ?? 0),
      icon: Star,
      iconBg: "bg-amber-50 dark:bg-amber-950",
      iconColor: "text-amber-600 dark:text-amber-400",
      action: () => setActiveTab('analytics'),
      actionLabel: "View Analytics",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back, {(user as any)?.firstName || 'there'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              Here's a snapshot of your hiring pipeline today.
            </p>
          </div>
          <Button
            onClick={() => setShowJobWizard(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Post a Job
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor, action, actionLabel }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {value === null ? (
                  <span className="inline-block h-8 w-12 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ) : value}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
            </div>
            <button
              onClick={action}
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors mt-auto"
            >
              {actionLabel}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Job Postings</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('jobs')}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-xs font-medium"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {jobsLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/5" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <Briefcase className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No job postings yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Create your first job posting to start finding great candidates.</p>
              <Button
                size="sm"
                onClick={() => setShowJobWizard(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Post a Job
              </Button>
            </div>
          ) : (
            jobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                onClick={() => setActiveTab('jobs')}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{job.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{job.company}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Eye className="h-3 w-3" />
                        {job.viewCount}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Users className="h-3 w-3" />
                        {job.applicationCount}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <Badge
                    className={
                      job.status === 'active'
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-50"
                        : job.status === 'paused'
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-50"
                          : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-100"
                    }
                    variant="outline"
                  >
                    {job.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
