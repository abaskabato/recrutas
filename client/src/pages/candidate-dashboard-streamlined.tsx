import { useEffect, useState, useMemo } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bell,
  User,
  Upload,
  Search,
  Briefcase,
  MapPin,
  Building,
  DollarSign,
  TrendingUp,
  Clock,
  Star,
  CheckCircle,
  AlertCircle,
  FileText,
  BarChart3,
  Calendar,
  Target,
  Zap,
  MessageCircle,
  Eye,
  ExternalLink,
  Filter,
  Settings,
  LogOut
} from "lucide-react";
import RecrutasLogo from "@/components/recrutas-logo";
import AIJobFeed from "@/components/ai-job-feed";
import ProfileUpload from "@/components/profile-upload";
import ApplicationTracker from "@/components/application-tracker";
import RealTimeNotifications from "@/components/real-time-notifications";
import JobMatchesModal from "@/components/job-matches-modal";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import LayoffNews from "@/components/layoff-news";

interface DashboardStats {
  newMatches: number;
  profileViews: number;
  activeChats: number;
  applicationsPending: number;
  applicationsRejected: number;
  applicationsAccepted: number;
}

interface Activity {
  id: number;
  type: string;
  description: string;
  createdAt: string;
  metadata?: any;
}

interface Application {
  id: number;
  status: string;
  jobTitle: string;
  company: string;
  appliedAt: string;
  updatedAt: string;
}

export default function CandidateStreamlinedDashboard() {
  const session = useSession();
  const user = session?.user;
  const supabase = useSupabaseClient();
  const isAuthenticated = !!user;
  const isLoading = !session;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'applications' | 'profile' | 'agent'>('overview');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Session Expired",
        description: "Please sign in to continue",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch candidate stats
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/candidate/stats'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/candidate/stats');
      return response.json();
    },
    retry: false,
    meta: {
      onError: (error: Error) => {
        if (isUnauthorizedError(error)) {
          window.location.href = "/api/login";
        }
      },
    },
  });

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/candidate/profile'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/candidate/profile');
      return response.json();
    },
    retry: false,
  });

  // Fetch recent activity
  const { data: activities } = useQuery<Activity[]>({
    queryKey: ['/api/candidate/activity'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/candidate/activity');
      return response.json();
    },
    retry: false,
  });

  // Fetch applications
  const { data: applications } = useQuery<Application[]>({
    queryKey: ['/api/candidate/applications'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/candidate/applications');
      return response.json();
    },
    retry: false,
  });



  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    let completed = 0;
    const total = 5;

    if ((profile as any).skills && (profile as any).skills.length > 0) completed++;
    if ((profile as any).experience) completed++;
    if ((profile as any).location) completed++;
    if ((profile as any).workType) completed++;
    if ((profile as any).salaryMin && (profile as any).salaryMax) completed++;

    return Math.round((completed / total) * 100);
  }, [profile]);

  const hasResume = (profile as any)?.resumeUrl || false;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <RecrutasLogo size={32} />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Recrutas</h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <ThemeToggleButton />
              <RealTimeNotifications />

              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-medium">
                    {(user as any)?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {(user as any)?.firstName || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Candidate</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {(user as any)?.firstName || 'there'}!
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Here's what's happening with your job search today.
          </p>
        </div>

        {/* Actionable Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">New Matches</CardTitle>
              <Target className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.newMatches || 0}</div>
              <p className="text-xs text-muted-foreground pt-2">High-quality jobs matched to your profile.</p>
              <Button className="mt-4 w-full" size="sm" onClick={() => setActiveTab('jobs')}>
                <Search className="h-4 w-4 mr-2" />
                Review Matches
              </Button>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Profile Views</CardTitle>
              <Eye className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.profileViews || 0}</div>
              <p className="text-xs text-muted-foreground pt-2">Times your profile appeared in recruiter searches.</p>
              <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => setActiveTab('profile')}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Enhance Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Chats</CardTitle>
              <MessageCircle className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.activeChats || 0}</div>
              <p className="text-xs text-muted-foreground pt-2">Direct conversations with hiring managers.</p>
              <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => { /* Navigate to chat page if it exists */ }}>
                <MessageCircle className="h-4 w-4 mr-2" />
                View Chats
              </Button>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Applications</CardTitle>
              <Briefcase className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{applications?.length || 0}</div>
              <p className="text-xs text-muted-foreground pt-2">Track your application statuses.</p>
              <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => setActiveTab('applications')}>
                <FileText className="h-4 w-4 mr-2" />
                Track Applications
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Simplified Profile Setup Section */}
        {profileCompletion < 100 && (
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Complete Your Profile to Unlock Better Matches
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    You're {profileCompletion}% done! A complete profile gets noticed more.
                  </p>
                  <div className="flex items-center gap-4">
                    <Progress value={profileCompletion} className="h-2 flex-1" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('profile')}
                      className="bg-white dark:bg-gray-800"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Complete Profile
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <BarChart3 className="h-4 w-4 mr-2 inline" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'jobs'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <Search className="h-4 w-4 mr-2 inline" />
              Job Feed
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'applications'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <Briefcase className="h-4 w-4 mr-2 inline" />
              Applications
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'profile'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <User className="h-4 w-4 mr-2 inline" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('agent')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'agent'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <Zap className="h-4 w-4 mr-2 inline" />
              Recrutas Agent
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Activity & Quick Actions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Actions */}
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <span>Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className="flex flex-col items-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors group"
                    >
                      <Search className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Find Jobs</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="flex flex-col items-center p-4 rounded-lg bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors group"
                    >
                      <Upload className="h-6 w-6 text-green-600 dark:text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Upload Resume</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('applications')}
                      className="flex flex-col items-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors group"
                    >
                      <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Applications</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="flex flex-col items-center p-4 rounded-lg bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors group"
                    >
                      <Settings className="h-6 w-6 text-orange-600 dark:text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Settings</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity - Improved */}
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span>Recent Activity</span>
                    </CardTitle>
                    {activities && activities.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{activities.length} events</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {activities && activities.length > 0 ? (
                    <div className="relative">
                      {activities.slice(0, 5).map((activity, index) => {
                        // Determine icon and color based on activity type
                        const isResume = activity.description.toLowerCase().includes('resume');
                        const isApplication = activity.description.toLowerCase().includes('applied');
                        const isMatch = activity.description.toLowerCase().includes('match');
                        const isView = activity.description.toLowerCase().includes('view');

                        const getActivityIcon = () => {
                          if (isResume) return <FileText className="h-4 w-4" />;
                          if (isApplication) return <Briefcase className="h-4 w-4" />;
                          if (isMatch) return <Target className="h-4 w-4" />;
                          if (isView) return <Eye className="h-4 w-4" />;
                          return <Clock className="h-4 w-4" />;
                        };

                        const getActivityColor = () => {
                          if (isResume) return 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400';
                          if (isApplication) return 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400';
                          if (isMatch) return 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400';
                          if (isView) return 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400';
                          return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
                        };
                        
                        return (
                          <div key={activity.id} className="relative pl-10 pb-6">
                            {/* Vertical timeline line */}
                            {index < activities.slice(0, 5).length - 1 && (
                              <div className="absolute left-4 top-2 h-full w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                            )}

                            {/* Icon on timeline */}
                            <div className={`absolute left-0 top-0.5 flex h-8 w-8 items-center justify-center rounded-full ${getActivityColor()}`}>
                              {getActivityIcon()}
                            </div>
                            
                            {/* Content */}
                            <div className="flex flex-col">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{activity.description}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No recent activity</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start exploring jobs to see activity here</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveTab('jobs')}>
                        <Search className="h-4 w-4 mr-2" />
                        Browse Jobs
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Profile Progress & Tips */}
            <div className="space-y-6">
              {/* Profile Completion Card */}
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span>Profile Strength</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center">
                    {/* Circular Progress */}
                    <div className="relative w-32 h-32 mb-4">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          strokeLinecap="round"
                          className={`${profileCompletion >= 80 ? 'text-green-500' : profileCompletion >= 50 ? 'text-yellow-500' : 'text-blue-500'}`}
                          strokeDasharray={`${(profileCompletion / 100) * 352} 352`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{profileCompletion}%</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Complete</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge
                      variant="secondary"
                      className={`mb-3 ${
                        profileCompletion >= 80
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                          : profileCompletion >= 50
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400'
                      }`}
                    >
                      {profileCompletion >= 80 ? 'Strong Profile' : profileCompletion >= 50 ? 'Getting There' : 'Just Started'}
                    </Badge>

                    {/* Checklist */}
                    <div className="w-full space-y-2 mt-2">
                      <div className="flex items-center text-sm">
                        {hasResume ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                        )}
                        <span className={hasResume ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}>
                          Resume uploaded
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        {(profile as any)?.skills?.length > 0 ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                        )}
                        <span className={(profile as any)?.skills?.length > 0 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}>
                          Skills added
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        {(profile as any)?.experience ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                        )}
                        <span className={(profile as any)?.experience ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}>
                          Experience level set
                        </span>
                      </div>
                    </div>

                    {profileCompletion < 100 && (
                      <Button className="w-full mt-4" size="sm" onClick={() => setActiveTab('profile')}>
                        Complete Profile
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Job Search Tips or Market News */}
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span>Pro Tips</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Optimize your profile</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Candidates with complete profiles get 3x more matches</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Apply early</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Applications in the first 24 hours have 2x response rate</p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Keep skills updated</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add trending skills to rank higher in searches</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Layoff News */}
              <LayoffNews />
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div>
            <AIJobFeed />
          </div>
        )}

        {activeTab === 'applications' && (
          <div>
            <ApplicationTracker />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-4xl">
            <ProfileUpload />
          </div>
        )}

        {activeTab === 'agent' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recrutas Agent Dashboard</h2>
            <p className="text-gray-500 dark:text-gray-400">This is where you can manage your AI agent. Coming soon!</p>
          </div>
        )}
      </div>

    </div>
  );
}
