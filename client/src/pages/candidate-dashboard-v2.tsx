import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  User, 
  Upload, 
  Search, 
  Eye, 
  Clock, 
  Lightbulb, 
  MessageCircle, 
  Check, 
  Sparkles, 
  Target, 
  Zap, 
  TrendingUp,
  Briefcase,
  MapPin,
  Building,
  DollarSign,
  ThumbsUp,
  ChevronRight,
  Activity
} from "lucide-react";
import AIJobFeed from "@/components/ai-job-feed";
import ProfileUpload from "@/components/profile-upload";
import ApplicationTracker from "@/components/application-tracker";
import RealTimeNotifications from "@/components/real-time-notifications";
import JobMatchesModal from "@/components/job-matches-modal";

export default function CandidateDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showJobMatchesModal, setShowJobMatchesModal] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch candidate stats
  const { data: stats } = useQuery({
    queryKey: ['/api/candidates/stats'],
    retry: false,
    meta: {
      onError: (error: Error) => {
        if (isUnauthorizedError(error)) {
          toast({
            title: "Unauthorized",
            description: "You are logged out. Logging in again...",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/api/login";
          }, 500);
          return;
        }
      },
    },
  });

  // Fetch profile completion status
  const profileQuery = useQuery({
    queryKey: ['/api/candidate/profile'],
    retry: false,
  });
  const profile = profileQuery.data;

  // Fetch recent activity
  const { data: activities } = useQuery({
    queryKey: ['/api/candidates/activity'],
    retry: false,
  });

  // Fetch application status
  const { data: applications } = useQuery({
    queryKey: ['/api/candidates/applications'],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const profileCompletion = (profile as any)?.profileStrength || 0;
  const hasResume = (profile as any)?.resumeUrl || false;
  const hasSkills = (profile as any)?.skills && (profile as any).skills.length > 0;
  const hasBasicInfo = (profile as any)?.linkedinUrl || (profile as any)?.githubUrl || (profile as any)?.location;
  
  // Determine current onboarding step - only resume is required
  const getOnboardingStep = () => {
    if (!hasResume) return 'resume';
    return 'complete'; // Once resume is uploaded, user can access everything
  };
  
  const currentStep = getOnboardingStep();
  const canOptimizeProfile = hasResume && (!hasSkills || !hasBasicInfo);
  
  console.log('Dashboard debug:', { 
    hasResume, 
    currentStep, 
    profileData: profile,
    resumeUrl: (profile as any)?.resumeUrl,
    profileLoading: profileQuery.isLoading,
    profileError: profileQuery.error
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 sm:h-5 w-4 sm:w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold">Recrutas V2</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Your AI Hiring Concierge</p>
              </div>
              <h1 className="sm:hidden text-lg font-bold">Recrutas V2</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                <Badge className="absolute -top-1 -right-1 h-3 sm:h-4 w-3 sm:w-4 p-0 text-xs">3</Badge>
              </Button>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{user?.firstName || 'Candidate'}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = "/api/logout"}>
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-2xl p-4 sm:p-6 border border-primary/20">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold mb-2">
                  {currentStep === 'resume' ? 'Welcome! Let\'s get started' : 
                   `Welcome back, ${user?.firstName || 'there'}!`}
                </h2>
                <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                  {currentStep === 'resume' ? 'Upload your resume to get personalized job matches powered by AI.' :
                   'Your AI concierge has been working behind the scenes to find perfect job matches for you.'}
                </p>
                {currentStep === 'complete' && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{(stats as any)?.newMatches || 0} new matches</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{(stats as any)?.profileViews || 0} profile views</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MessageCircle className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">{(stats as any)?.activeChats || 0} active conversations</span>
                    </div>
                  </div>
                )}
                {currentStep === 'resume' && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="font-medium">Upload your resume to get started</span>
                  </div>
                )}
                {currentStep === 'complete' && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-medium">Resume uploaded - AI matching complete!</span>
                    </div>
                    <Button 
                      className="bg-primary hover:bg-primary/90"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Button clicked, current modal state:', showJobMatchesModal);
                        setShowJobMatchesModal(true);
                        console.log('Modal state after setting to true:', true);
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      View AI Job Matches
                    </Button>
                  </div>
                )}
                {currentStep === 'complete' && canOptimizeProfile && (
                  <div className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-950/20 p-2 rounded-lg mt-2">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-800 dark:text-blue-200 text-sm">
                      Add skills and LinkedIn to improve your job matches
                    </span>
                  </div>
                )}
              </div>
              <div className="flex justify-center lg:justify-end">
                <div className="text-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 relative mx-auto">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={`${profileCompletion}, 100`}
                        className="text-primary"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-base sm:text-lg font-bold">{profileCompletion}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Profile Complete</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Onboarding Steps or Main Content */}
        {currentStep === 'resume' ? (
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Upload className="h-6 w-6" />
                Step 1: Upload Your Resume
              </CardTitle>
              <p className="text-muted-foreground">
                Start by uploading your resume. Our AI will analyze it to extract your skills, experience, and preferences.
              </p>
            </CardHeader>
            <CardContent>
              <ProfileUpload />
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">What happens next?</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• AI extracts your skills and experience</li>
                  <li>• Automatic job matching begins</li>
                  <li>• You can then refine your profile for better matches</li>
                </ul>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Once uploaded, refresh the page to see your personalized job matches!
                </p>
                <Button onClick={() => window.location.reload()} className="w-full">
                  View My Job Matches
                </Button>
              </div>
            </CardContent>
          </Card>

        ) : (
          <Tabs defaultValue="feed" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:grid-cols-4">
              <TabsTrigger value="feed" data-tab="feed" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Sparkles className="h-3 sm:h-4 w-3 sm:w-4" />
                <span className="hidden sm:inline">AI Feed</span>
                <span className="sm:hidden">Feed</span>
              </TabsTrigger>
              <TabsTrigger value="applications" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Briefcase className="h-3 sm:h-4 w-3 sm:w-4" />
                <span className="hidden sm:inline">Applications</span>
                <span className="sm:hidden">Apps</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <User className="h-3 sm:h-4 w-3 sm:w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <TrendingUp className="h-3 sm:h-4 w-3 sm:w-4" />
                <span className="hidden sm:inline">Insights</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
            </TabsList>

            {/* AI Job Feed Tab */}
            <TabsContent value="feed" className="space-y-6">
              <RealTimeNotifications />
              {canOptimizeProfile && (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Boost Your Job Matches
                        </h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                          Add skills and LinkedIn profile to your account for more personalized recommendations.
                        </p>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Optimize Profile
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                  <AIJobFeed />
                </div>
                <div className="space-y-4">
                  {/* Quick Actions */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Upload className="h-4 w-4 mr-2" />
                        Update Resume
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Search className="h-4 w-4 mr-2" />
                        Job Preferences
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Bell className="h-4 w-4 mr-2" />
                        Notifications
                      </Button>
                    </CardContent>
                  </Card>

                  {/* AI Insights */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        AI Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          Your profile views increased 40% this week. Consider adding more JavaScript skills to boost visibility.
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                        <p className="text-xs text-green-800 dark:text-green-200">
                          3 new companies in your area are hiring for your skillset.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Applications Tab */}
            <TabsContent value="applications" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(applications as any)?.length > 0 ? (applications as any).map((app: any) => (
                  <Card key={app.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{app.job?.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">{app.job?.company}</p>
                        </div>
                        <Badge variant={app.status === 'pending' ? 'secondary' : 'default'}>
                          {app.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Applied {new Date(app.appliedAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {app.job?.location}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        View Details
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                )) : (
                  <div className="col-span-full text-center py-12">
                    <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start applying to jobs from your AI-curated feed to see them here.
                    </p>
                    <Button>Browse Jobs</Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Completion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Overall Progress</span>
                          <span>{profileCompletion}%</span>
                        </div>
                        <Progress value={profileCompletion} className="h-2" />
                      </div>
                      <ProfileUpload />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Profile Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{(stats as any)?.profileViews || 0}</div>
                        <p className="text-xs text-muted-foreground">Profile Views</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{(stats as any)?.newMatches || 0}</div>
                        <p className="text-xs text-muted-foreground">AI Matches</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(activities as any)?.length > 0 ? (activities as any).slice(0, 5).map((activity: any) => (
                        <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-sm">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )) : (
                        <p className="text-sm text-muted-foreground">No recent activity</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>AI Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <ThumbsUp className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              Skill Enhancement
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              Adding React certification could increase your match rate by 25%
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Target className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-200">
                              Market Opportunity
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300">
                              Remote opportunities in your field have increased 60% this month
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
      
      <JobMatchesModal 
        isOpen={showJobMatchesModal} 
        onClose={() => setShowJobMatchesModal(false)} 
      />
    </div>
  );
}