import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Users, Briefcase, MessageSquare, Star,
  Eye, ChevronRight, TrendingUp
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Welcome Header */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {(user as any)?.firstName || 'Talent Owner'}!
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage your job postings and connect with top candidates
              </p>
            </div>
            <Button
              onClick={() => setShowJobWizard(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Job with Exam
            </Button>
          </div>
        </div>

        {/* Actionable Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Jobs</CardTitle>
              <Briefcase className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statsLoading ? "..." : stats?.activeJobs || 0}
              </div>
              <p className="text-xs text-muted-foreground pt-1">Jobs you are actively hiring for.</p>
              <Button className="mt-4 w-full" size="sm" onClick={() => setActiveTab('jobs')}>
                Manage Jobs
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Matches</CardTitle>
              <Users className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statsLoading ? "..." : stats?.totalMatches || 0}
              </div>
              <p className="text-xs text-muted-foreground pt-1">Potential candidates matched by AI.</p>
              <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => setActiveTab('candidates')}>
                View Candidates
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Chats</CardTitle>
              <MessageSquare className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statsLoading ? "..." : stats?.activeChats || 0}
              </div>
              <p className="text-xs text-muted-foreground pt-1">Conversations with top candidates.</p>
              <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => setLocation('/chat')}>
                Open Chats
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Hires Made</CardTitle>
              <Star className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statsLoading ? "..." : stats?.hires || 0}
              </div>
              <p className="text-xs text-muted-foreground pt-1">Successful hires from this platform.</p>
              <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => setActiveTab('analytics')}>
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-6">
        {/* Recent Jobs */}
        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-gray-900 dark:text-white">Recent Job Postings</span>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('jobs')}>
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No job postings yet</h3>
                <p className="text-gray-500 dark:text-gray-400">Create your first job posting to start finding great candidates.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{job.title}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{job.company} • {job.location}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          {job.viewCount} views
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {job.applicationCount} applications
                        </span>
                      </div>
                    </div>
                    <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                      {job.status}
                    </Badge>
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
