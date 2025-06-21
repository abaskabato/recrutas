import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, User, Upload, Search, Eye, Clock, Lightbulb, MessageCircle, Check, Sparkles, Target, Zap, TrendingUp } from "lucide-react";
import MatchCard from "@/components/match-card";
import ProfileUpload from "@/components/profile-upload";
import AIJobFeed from "@/components/ai-job-feed";

export default function CandidateDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

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

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["/api/candidate/matches"],
    enabled: !!user,
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/candidate/stats"],
    enabled: !!user,
    retry: false,
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ["/api/activity"],
    enabled: !!user,
    retry: false,
  });

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">Recrutas</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center space-x-2">
                  {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <User className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <span className="hidden sm:block">
                    {user.firstName || user.email?.split('@')[0] || 'User'}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Bar */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-neutral-800">
                  Welcome back, {user.firstName || 'there'}!
                </h2>
                <p className="text-neutral-600">
                  Your profile is <span className="text-secondary font-medium">
                    {user.candidateProfile ? '92%' : '45%'} complete
                  </span>
                </p>
              </div>
              <div className="flex items-center space-x-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {statsLoading ? "..." : stats?.newMatches || 0}
                  </div>
                  <div className="text-sm text-neutral-600">New Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">
                    {statsLoading ? "..." : stats?.profileViews || 0}
                  </div>
                  <div className="text-sm text-neutral-600">Profile Views</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-neutral-800 mb-4">Quick Actions</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <ProfileUpload />
                  <Button variant="outline" className="flex items-center space-x-3 p-4 h-auto justify-start">
                    <Search className="h-5 w-5 text-primary" />
                    <span>Find More Matches</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Matches */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-neutral-800">Recent Matches</h3>
                  <span className="text-sm text-neutral-600">
                    {matchesLoading ? "Loading..." : "Updated 2 min ago"}
                  </span>
                </div>
                
                {matchesLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-6">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-20 bg-gray-200 rounded mb-4"></div>
                        <div className="flex space-x-2">
                          <div className="h-8 bg-gray-200 rounded flex-1"></div>
                          <div className="h-8 bg-gray-200 rounded flex-1"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No matches yet</h3>
                    <p className="text-gray-600 mb-6">Complete your profile to get matched with relevant job opportunities.</p>
                    <ProfileUpload />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matches.map((match: any) => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Completion */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-neutral-800 mb-4">Complete Your Profile</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Basic Info</span>
                    <Check className="h-4 w-4 text-secondary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Resume Upload</span>
                    {user.candidateProfile?.resumeUrl ? (
                      <Check className="h-4 w-4 text-secondary" />
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Skills Assessment</span>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      Pending
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Preferences</span>
                    {user.candidateProfile?.workType ? (
                      <Check className="h-4 w-4 text-secondary" />
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
                {!user.candidateProfile?.resumeUrl && (
                  <div className="mt-4">
                    <ProfileUpload />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-neutral-800 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {activitiesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex items-start space-x-3">
                          <div className="w-2 h-2 bg-gray-200 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                            <div className="h-2 bg-gray-200 rounded w-1/4"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activities.length === 0 ? (
                    <p className="text-sm text-neutral-500">No recent activity</p>
                  ) : (
                    activities.slice(0, 5).map((activity: any) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-secondary rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-neutral-800">{activity.description}</p>
                          <p className="text-xs text-neutral-500">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
