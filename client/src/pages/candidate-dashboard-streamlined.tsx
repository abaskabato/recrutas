import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RealTimeChat from "@/components/real-time-chat";
import { NotificationCenter } from "@/components/notification-center";
import InstantJobSearch from "@/components/instant-job-search";
import { JobExam } from "@/components/job-exam";
import { 
  Briefcase, 
  MessageSquare, 
  Star, 
  TrendingUp,
  Eye,
  Clock,
  Building,
  MapPin,
  DollarSign,
  Users,
  Bell,
  Settings,
  LogOut,
  Upload,
  Search,
  Filter,
  ChevronRight,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

export default function CandidateDashboard() {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("matches");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobForExam, setSelectedJobForExam] = useState<any>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  // Fetch candidate stats
  const { data: candidateStats } = useQuery({
    queryKey: ["/api/candidates/stats"],
    enabled: !!user,
  });

  // Fetch job matches
  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["/api/candidates/matches"],
    enabled: !!user,
  });

  // Fetch applications
  const { data: applications = [] } = useQuery({
    queryKey: ["/api/candidates/applications"],
    enabled: !!user,
  });

  // Fetch activity
  const { data: activity = [] } = useQuery({
    queryKey: ["/api/candidates/activity"],
    enabled: !!user,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("GET", "/api/logout"),
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
      toast({
        title: "Logged out successfully",
        description: "Come back soon!",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleJobExam = (job: any) => {
    setSelectedJobForExam(job);
  };

  const closeExam = () => {
    setSelectedJobForExam(null);
  };

  const formatSalary = (salary: string | number) => {
    if (!salary) return "Competitive";
    if (typeof salary === "string" && salary.includes("-")) return salary;
    return `$${Number(salary).toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'submitted': 'bg-blue-100 text-blue-800',
      'screening': 'bg-yellow-100 text-yellow-800',
      'interview': 'bg-purple-100 text-purple-800',
      'offer': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Recrutas</h1>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationCenter />
              
              <div className="flex items-center space-x-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                    {user.name?.split(' ').map(n => n[0]).join('') || user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-slate-700 hidden sm:block">
                  {user.name || user.email.split('@')[0]}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-600 hover:text-slate-900"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Welcome back, {user.name || user.email.split('@')[0]}!
          </h2>
          <p className="text-slate-600">
            Discover your next opportunity with AI-powered job matching
          </p>
        </div>

        {/* Stats Cards */}
        {candidateStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Applications</p>
                    <p className="text-2xl font-bold text-slate-900">{candidateStats.totalApplications}</p>
                  </div>
                  <Briefcase className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Active Matches</p>
                    <p className="text-2xl font-bold text-slate-900">{candidateStats.activeMatches}</p>
                  </div>
                  <Star className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Messages</p>
                    <p className="text-2xl font-bold text-slate-900">{candidateStats.unreadMessages}</p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Profile Strength</p>
                    <p className="text-2xl font-bold text-slate-900">{candidateStats.profileStrength}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="matches">Job Matches</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="search">Job Search</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          {/* Job Matches */}
          <TabsContent value="matches" className="space-y-6">
            <div className="space-y-4">
              {matchesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : matches.length > 0 ? (
                matches.map((match: any) => (
                  <Card key={match.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="font-semibold text-lg text-slate-900">
                              {match.job.title}
                            </h3>
                            <Badge className="bg-green-100 text-green-800">
                              {match.matchScore} Match
                            </Badge>
                          </div>
                          
                          <div className="flex items-center text-slate-600 space-x-4 mb-3">
                            <div className="flex items-center space-x-1">
                              <Building className="w-4 h-4" />
                              <span className="text-sm">{match.job.company}</span>
                            </div>
                            {match.job.location && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">{match.job.location}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-4 h-4" />
                              <span className="text-sm">{formatSalary(match.job.salary)}</span>
                            </div>
                          </div>

                          <p className="text-sm text-slate-600 mb-4">
                            {match.aiExplanation}
                          </p>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {match.skillMatches.slice(0, 5).map((skill: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="ml-4 space-y-2">
                          <Button 
                            onClick={() => handleJobExam(match.job)}
                            className="w-full"
                          >
                            Take Assessment
                          </Button>
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No matches yet</h3>
                    <p className="text-slate-600 mb-4">
                      Complete your profile to get personalized job matches
                    </p>
                    <Button>Complete Profile</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Applications */}
          <TabsContent value="applications" className="space-y-6">
            <div className="space-y-4">
              {applications.length > 0 ? (
                applications.map((app: any) => (
                  <Card key={app.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-lg text-slate-900">
                              {app.jobTitle}
                            </h3>
                            <Badge className={getStatusColor(app.status)}>
                              {app.status}
                            </Badge>
                          </div>
                          
                          <p className="text-slate-600 text-sm mb-2">{app.company}</p>
                          <p className="text-slate-500 text-xs">Applied {timeAgo(app.appliedAt)}</p>
                        </div>

                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Briefcase className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No applications yet</h3>
                    <p className="text-slate-600 mb-4">
                      Start applying to jobs that match your skills
                    </p>
                    <Button onClick={() => setActiveTab("matches")}>
                      Browse Matches
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Job Search */}
          <TabsContent value="search" className="space-y-6">
            <InstantJobSearch />
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages" className="space-y-6">
            <RealTimeChat />
          </TabsContent>
        </Tabs>
      </div>

      {/* Job Exam Modal */}
      {selectedJobForExam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <JobExam 
              job={selectedJobForExam}
              onClose={closeExam}
              onComplete={() => {
                closeExam();
                queryClient.invalidateQueries({ queryKey: ["/api/candidates/applications"] });
                toast({
                  title: "Assessment completed!",
                  description: "Your results have been submitted to the hiring manager.",
                });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}