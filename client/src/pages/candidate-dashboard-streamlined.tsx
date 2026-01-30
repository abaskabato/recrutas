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
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications' | 'profile' | 'agent'>('jobs');

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
              <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => window.location.href = '/chat'}>
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
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recrutas AI Agent</h2>
              <p className="text-gray-500 dark:text-gray-400">Your personal AI-powered career assistant</p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-700 dark:text-blue-400">
                    <Target className="h-5 w-5 mr-2" />
                    Smart Job Matching
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Our AI analyzes your skills, experience, and preferences to find jobs that match your profile perfectly.
                  </p>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center text-purple-700 dark:text-purple-400">
                    <Zap className="h-5 w-5 mr-2" />
                    Resume Optimization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Get AI-powered suggestions to improve your resume and increase your chances of getting noticed by recruiters.
                  </p>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-200 dark:border-amber-800">
                <CardHeader>
                  <CardTitle className="flex items-center text-amber-700 dark:text-amber-400">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Career Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Discover trending skills in your industry and get personalized learning recommendations.
                  </p>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400">
                    Coming Soon
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* AI Tips Section */}
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500" />
                  AI-Powered Tips for You
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Complete Your Profile</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Add more skills to your profile to improve your match score. Candidates with 10+ skills get 40% more job matches.
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                  <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Apply Early</h4>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Jobs posted in the last 24 hours have a 2x higher response rate. Check your job feed daily for new opportunities.
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                  <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-2">Engage with Recruiters</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    Respond to messages within 24 hours. Quick responses show recruiters you're actively interested.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setActiveTab('jobs')} className="bg-blue-600 hover:bg-blue-700">
                <Search className="h-4 w-4 mr-2" />
                Find AI-Matched Jobs
              </Button>
              <Button onClick={() => setActiveTab('profile')} variant="outline">
                <User className="h-4 w-4 mr-2" />
                Update Profile
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
