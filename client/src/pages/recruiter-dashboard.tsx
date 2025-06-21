import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, User, Plus, Briefcase, Users, MessageSquare, Handshake, Edit, Pause } from "lucide-react";
import JobCard from "@/components/job-card";

export default function RecruiterDashboard() {
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

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/jobs"],
    enabled: !!user,
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/recruiter/stats"],
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
        {/* Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-neutral-800">Recruiter Dashboard</h2>
                <p className="text-neutral-600">Manage your job postings and candidate matches</p>
              </div>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Post New Job</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Stats Cards */}
          <div className="lg:col-span-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Briefcase className="text-primary h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Active Jobs</p>
                      <p className="text-2xl font-bold text-neutral-800">
                        {statsLoading ? "..." : stats?.activeJobs || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                      <Users className="text-secondary h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Total Matches</p>
                      <p className="text-2xl font-bold text-neutral-800">
                        {statsLoading ? "..." : stats?.totalMatches || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <MessageSquare className="text-yellow-600 h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Active Chats</p>
                      <p className="text-2xl font-bold text-neutral-800">
                        {statsLoading ? "..." : stats?.activeChats || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Handshake className="text-green-600 h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Hires Made</p>
                      <p className="text-2xl font-bold text-neutral-800">
                        {statsLoading ? "..." : stats?.hires || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Job Listings */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-neutral-800">Your Job Postings</h3>
                  <div className="flex space-x-2">
                    <Button variant="default" size="sm">All</Button>
                    <Button variant="ghost" size="sm">Active</Button>
                    <Button variant="ghost" size="sm">Paused</Button>
                  </div>
                </div>

                {jobsLoading ? (
                  <div className="space-y-6">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-6">
                        <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="h-16 bg-gray-200 rounded"></div>
                          <div className="h-16 bg-gray-200 rounded"></div>
                          <div className="h-16 bg-gray-200 rounded"></div>
                        </div>
                        <div className="flex space-x-3">
                          <div className="h-8 bg-gray-200 rounded flex-1"></div>
                          <div className="h-8 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No job postings yet</h3>
                    <p className="text-gray-600 mb-6">Create your first job posting to start finding great candidates.</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Post Your First Job
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {jobs.map((job: any) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Recent Matches */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-neutral-800 mb-4">Recent Matches</h3>
                <div className="space-y-4">
                  {/* Placeholder for recent matches */}
                  <div className="text-center py-8">
                    <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">No recent matches</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
