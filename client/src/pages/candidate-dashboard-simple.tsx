import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RealTimeChat from "@/components/real-time-chat";
import AdvancedNotificationCenter from "@/components/advanced-notification-center";
import InstantJobSearch from "@/components/instant-job-search";
import ProfileCompletionModal from "@/components/profile-completion-modal";
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
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Video,
  Calendar,
  Filter,
  Search,
  Plus,
  Upload,
  FileText,
  Send
} from "lucide-react";

interface CandidateStats {
  totalApplications: number;
  activeMatches: number;
  profileViews: number;
  profileStrength: number;
  responseRate: number;
  avgMatchScore: number;
}

interface JobMatch {
  id: number;
  jobId: number;
  matchScore: string;
  status: string;
  createdAt: string;
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    salaryMin: number;
    salaryMax: number;
    workType: string;
  };
  recruiter: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Application {
  id: number;
  status: string;
  appliedAt: string;
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
  };
}

interface Activity {
  id: number;
  type: string;
  description: string;
  createdAt: string;
}

export default function CandidateDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedChatMatch, setSelectedChatMatch] = useState<number | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Fetch candidate stats
  const { data: stats, isLoading: statsLoading } = useQuery<CandidateStats>({
    queryKey: ['/api/candidates/stats'],
  });

  // Fetch job matches
  const { data: matches = [], isLoading: matchesLoading } = useQuery<JobMatch[]>({
    queryKey: ['/api/candidates/matches'],
  });

  // Fetch applications
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ['/api/candidates/applications'],
  });

  // Fetch activity feed  
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ['/api/candidates/activity'],
  });

  // Resume upload mutation
  const uploadResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      
      const response = await fetch('/api/candidates/upload-resume', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload resume');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Resume Uploaded",
        description: "Your resume has been successfully uploaded and parsed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/stats'] });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Apply to job mutation
  const applyToJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return apiRequest('POST', '/api/candidates/apply', { jobId });
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/stats'] });
    },
    onError: () => {
      toast({
        title: "Application Failed",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadResumeMutation.mutate(file);
    }
  };

  // Start chat with recruiter
  const handleStartChat = (matchId: number) => {
    setSelectedChatMatch(matchId);
    setActiveTab('messages');
  };

  // Helper functions for status display
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'interviewing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'active': return <CheckCircle className="w-3 h-3" />;
      case 'rejected': return <XCircle className="w-3 h-3" />;
      case 'interviewing': return <Video className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  // Check if profile needs completion
  useEffect(() => {
    if (user && (!user.firstName || !user.lastName || !user.skills?.length)) {
      setShowProfileModal(true);
    }
  }, [user]);

  const handleProfileComplete = () => {
    setShowProfileModal(false);
    queryClient.invalidateQueries({ queryKey: ['/api/candidates/stats'] });
    toast({
      title: "Profile Updated",
      description: "Welcome to Recrutas! Your profile is now set up.",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome back, {user?.firstName || 'Candidate'}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track your applications and discover new opportunities
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="matches">Job Matches</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Applications</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {statsLoading ? '...' : stats?.totalApplications || 0}
                      </p>
                    </div>
                    <Briefcase className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Matches</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {statsLoading ? '...' : stats?.activeMatches || 0}
                      </p>
                    </div>
                    <Star className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Profile Views</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {statsLoading ? '...' : stats?.profileViews || 0}
                      </p>
                    </div>
                    <Eye className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Match Score</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {statsLoading ? '...' : `${stats?.avgMatchScore || 0}%`}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Matches */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Matches</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveTab('matches')}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {matchesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-slate-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : matches.length > 0 ? (
                  <div className="space-y-4">
                    {matches.slice(0, 3).map((match) => (
                      <div key={match.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">{match.job.title}</h4>
                          <p className="text-sm text-slate-600">{match.job.company}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant="secondary">{match.matchScore}% match</Badge>
                          <Button size="sm" onClick={() => handleStartChat(match.id)}>
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No matches yet</h3>
                    <p className="text-slate-500 mb-4">Complete your profile to get matched with jobs</p>
                    <Button onClick={() => setActiveTab('profile')}>Complete Profile</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Upload className="w-6 h-6" />
                    <span>Upload Resume</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadResumeMutation.isPending}
                    />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => setActiveTab('matches')}
                  >
                    <Search className="w-6 h-6" />
                    <span>Browse Jobs</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => setActiveTab('profile')}
                  >
                    <User className="w-6 h-6" />
                    <span>Update Profile</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Job Matches Tab */}
          <TabsContent value="matches" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Matches</CardTitle>
              </CardHeader>
              <CardContent>
                {matchesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-24 bg-slate-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : matches.length > 0 ? (
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <div key={match.id} className="border border-slate-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-lg text-slate-900">
                                {match.job.title}
                              </h3>
                              <Badge variant="secondary">
                                {match.matchScore}% match
                              </Badge>
                              <Badge className={getStatusColor(match.status)}>
                                {getStatusIcon(match.status)}
                                <span className="ml-1 capitalize">{match.status}</span>
                              </Badge>
                            </div>
                            <p className="text-slate-600 mb-2">{match.job.company}</p>
                            <div className="flex items-center space-x-4 text-sm text-slate-500">
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{match.job.location}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Briefcase className="w-4 h-4" />
                                <span>{match.job.workType}</span>
                              </div>
                              {match.job.salaryMin && (
                                <div className="flex items-center space-x-1">
                                  <DollarSign className="w-4 h-4" />
                                  <span>${match.job.salaryMin.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end space-y-2">
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartChat(match.id)}
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Chat
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => applyToJobMutation.mutate(match.jobId)}
                                disabled={applyToJobMutation.isPending}
                              >
                                Apply Now
                              </Button>
                            </div>
                            <p className="text-xs text-slate-400">
                              Matched {new Date(match.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center py-8">
                      <Star className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Discover Live Job Opportunities</h3>
                      <p className="text-slate-500 mb-4">
                        Search thousands of real job openings from top companies
                      </p>
                    </div>
                    <InstantJobSearch />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-slate-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : applications.length > 0 ? (
                  <div className="space-y-4">
                    {applications.map((application) => (
                      <div key={application.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-slate-900">{application.job.title}</h4>
                            <p className="text-sm text-slate-600">{application.job.company}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Applied {new Date(application.appliedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={getStatusColor(application.status)}>
                            {getStatusIcon(application.status)}
                            <span className="ml-1 capitalize">{application.status}</span>
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No applications yet</h3>
                    <p className="text-slate-500 mb-4">Start applying to jobs to see your applications here</p>
                    <Button onClick={() => setActiveTab('matches')}>Browse Jobs</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                <RealTimeChat matchId={selectedChatMatch} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}  
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-20 h-20">
                      <AvatarFallback className="text-2xl">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">{user?.firstName} {user?.lastName}</h3>
                      <p className="text-slate-600">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {user?.skills?.length ? (
                          user.skills.map((skill, index) => (
                            <Badge key={index} variant="outline">{skill}</Badge>
                          ))
                        ) : (
                          <p className="text-slate-500">No skills added yet</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Experience</h4>
                      <p className="text-slate-600">{user?.experience || 'No experience added yet'}</p>
                    </div>
                  </div>

                  <Button onClick={() => setShowProfileModal(true)}>
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Notification Center */}
        <AdvancedNotificationCenter />

        {/* Profile Completion Modal */}
        <ProfileCompletionModal 
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onComplete={handleProfileComplete}
        />
      </div>
    </div>
  );
}