import { useEffect, useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
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

export default function CandidateDashboardRefactored() {
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const isAuthenticated = !!user;
  const isLoading = isPending;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'applications' | 'profile'>('overview');
  const [showJobMatchesModal, setShowJobMatchesModal] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Session Expired",
        description: "Please sign in to continue",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch candidate stats
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/candidates/stats'],
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
    retry: false,
  });

  // Fetch recent activity
  const { data: activities } = useQuery<Activity[]>({
    queryKey: ['/api/candidates/activity'],
    retry: false,
  });

  // Fetch applications
  const { data: applications } = useQuery<Application[]>({
    queryKey: ['/api/candidates/applications'],
    retry: false,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut();
    },
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <RecrutasLogo size={32} />
              <h1 className="text-xl font-bold text-slate-900">Recrutas</h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <RealTimeNotifications />
              
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                    {(user as any)?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">
                    {(user as any)?.firstName || 'User'}
                  </p>
                  <p className="text-xs text-slate-500">Candidate</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  className="text-slate-500 hover:text-slate-700"
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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Welcome back, {(user as any)?.firstName || 'there'}!
          </h2>
          <p className="text-slate-600">
            Here's what's happening with your job search today.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">New Matches</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.newMatches || 0}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Profile Views</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.profileViews || 0}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Eye className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Chats</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.activeChats || 0}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Applications</p>
                  <p className="text-2xl font-bold text-slate-900">{applications?.length || 0}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Setup Section - Show if profile incomplete */}
        {profileCompletion < 100 && (
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Complete Your Profile
                  </h3>
                  <p className="text-slate-600 mb-4">
                    A complete profile gets 3x more job matches. You're {profileCompletion}% done!
                  </p>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Profile Completion</span>
                      <span className="text-sm text-slate-600">{profileCompletion}%</span>
                    </div>
                    <Progress value={profileCompletion} className="h-2" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!hasResume && (
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => setActiveTab('profile')}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Resume
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveTab('profile')}
                    >
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
          <nav className="flex space-x-8 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <BarChart3 className="h-4 w-4 mr-2 inline" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'jobs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Search className="h-4 w-4 mr-2 inline" />
              Job Feed
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'applications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Briefcase className="h-4 w-4 mr-2 inline" />
              Applications
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <User className="h-4 w-4 mr-2 inline" />
              Profile
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-slate-600" />
                    <span>Recent Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activities && activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.slice(0, 10).map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                          <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="text-sm text-slate-700">{activity.description}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(activity.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-500">No recent activity</p>
                      <p className="text-sm text-slate-400">Start exploring jobs to see activity here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-slate-600" />
                    <span>Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setShowJobMatchesModal(true)}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Find Job Matches
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('profile')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Update Profile
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('applications')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Track Applications
                  </Button>

                  {!hasResume && (
                    <Button 
                      className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white" 
                      onClick={() => setActiveTab('profile')}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Resume
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Application Status Summary */}
              {applications && applications.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Application Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Pending</span>
                        <Badge variant="secondary">
                          {applications.filter(app => app.status === 'pending').length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">In Review</span>
                        <Badge variant="outline">
                          {applications.filter(app => app.status === 'viewed').length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Interviews</span>
                        <Badge className="bg-blue-100 text-blue-800">
                          {applications.filter(app => app.status === 'interested').length}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
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
      </div>

      {/* Job Matches Modal */}
      <JobMatchesModal
        isOpen={showJobMatchesModal}
        onClose={() => setShowJobMatchesModal(false)}
      />
    </div>
  );
}