import { useEffect, useState } from "react";
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



  // Calculate profile completion
  const getProfileCompletion = () => {
    if (!profile) return 0;
    let completed = 0;
    const total = 5;

    if ((profile as any).skills && (profile as any).skills.length > 0) completed++;
    if ((profile as any).experience) completed++;
    if ((profile as any).location) completed++;
    if ((profile as any).workType) completed++;
    if ((profile as any).salaryMin && (profile as any).salaryMax) completed++;

    return Math.round((completed / total) * 100);
  };

  const profileCompletion = getProfileCompletion();
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span>Recent Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activities && activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.slice(0, 10).map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{activity.description}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(activity.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Start exploring jobs to see activity here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
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
