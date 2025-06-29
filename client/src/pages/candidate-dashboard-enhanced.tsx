import { useState, useEffect } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  getStatusColor, 
  formatSalary, 
  formatWorkType, 
  timeAgo, 
  validateFileType, 
  formatFileSize,
  getErrorMessage 
} from "@/lib/dashboard-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RealTimeChat from "@/components/real-time-chat";
import AdvancedNotificationCenter from "@/components/advanced-notification-center";
import InstantJobSearch from "@/components/instant-job-search";
import EnhancedProfileCompletion from "@/components/enhanced-profile-completion";
import { ProfileCompletionModal } from "@/components/profile-completion-modal";
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
    hasExam?: boolean;
    source?: string;
    externalUrl?: string;
    careerPageUrl?: string;
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

export default function CandidateDashboardEnhanced() {
  const { data: session } = useSession();
  const user = session?.user;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedChatRoom, setSelectedChatRoom] = useState<number | undefined>();
  const [showChat, setShowChat] = useState(false);
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [continuationJob, setContinuationJob] = useState<any>(null);
  
  // Exam state
  const [showExam, setShowExam] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('');
  
  // Profile preferences state
  const [profilePrefs, setProfilePrefs] = useState({
    preferredLocations: [''],
    preferredJobTitles: [''],
    salaryMin: '',
    salaryMax: '',
    workType: 'any',
    experienceLevel: 'mid',
    skills: [''],
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    availability: 'immediate'
  });

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
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Resume uploaded successfully",
        description: "Your resume has been updated",
      });
      setShowResumeUpload(false);
      setSelectedFile(null);
      setUploadProgress(0);
      // Refresh user data and profile
      queryClient.invalidateQueries({ queryKey: ['/api/session'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  // Check if profile completion is needed
  useEffect(() => {
    if (user) {
      const extendedUser = user as any;
      const needsProfileCompletion = !extendedUser.firstName || 
                                    !extendedUser.lastName;
      setShowProfileCompletion(needsProfileCompletion);
    }
  }, [user]);

  // Check for job continuation after user logs in
  useEffect(() => {
    if (user && !showProfileCompletion) {
      const continuationJobData = localStorage.getItem('continuationJob');
      const pendingApplication = sessionStorage.getItem('pendingJobApplication');
      
      if (continuationJobData) {
        try {
          const jobData = JSON.parse(continuationJobData);
          // Check if the job data is recent (within last 30 minutes)
          const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
          
          if (jobData.timestamp > thirtyMinutesAgo) {
            setContinuationJob(jobData);
            
            // Show a toast notification about continuing the job application
            toast({
              title: "Continue Job Application",
              description: `Continue applying to ${jobData.jobData.title} at ${jobData.jobData.company}`,
              action: (
                <Button 
                  size="sm" 
                  onClick={() => handleContinueJobApplication(jobData)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continue
                </Button>
              ),
            });
            
            // Auto-switch to job matches tab
            setActiveTab('matches');
          } else {
            // Clean up old continuation data
            localStorage.removeItem('continuationJob');
            sessionStorage.removeItem('pendingJobApplication');
          }
        } catch (error) {
          console.error('Error parsing continuation job data:', error);
          localStorage.removeItem('continuationJob');
        }
      } else if (pendingApplication) {
        try {
          const appData = JSON.parse(pendingApplication);
          toast({
            title: "Welcome back!",
            description: `Ready to apply to ${appData.title} at ${appData.company}?`,
            action: (
              <Button 
                size="sm" 
                onClick={() => setActiveTab('matches')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                View Jobs
              </Button>
            ),
          });
          sessionStorage.removeItem('pendingJobApplication');
        } catch (error) {
          console.error('Error parsing pending application:', error);
          sessionStorage.removeItem('pendingJobApplication');
        }
      }
    }
  }, [user, showProfileCompletion, toast]);

  // Apply to external job mutation
  const applyToExternalJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      const response = await apiRequest("POST", '/api/candidates/apply-external', {
        jobData: jobData.jobData,
        source: jobData.source,
        externalUrl: jobData.externalUrl,
        matchScore: jobData.matchScore
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Successfully applied to the external job position",
      });
      // Refresh applications data
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Application Failed",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    },
  });

  // Handle continuing job application from instant modal
  const handleContinueJobApplication = (jobData: any) => {
    // Clear continuation data
    localStorage.removeItem('continuationJob');
    sessionStorage.removeItem('pendingJobApplication');
    setContinuationJob(null);
    
    // Submit the application to the backend
    applyToExternalJobMutation.mutate(jobData);
    
    // Navigate to applications tab
    setActiveTab('applications');
  };

  const handleProfileComplete = () => {
    setShowProfileCompletion(false);
    // User data handled by Better Auth session
    toast({
      title: "Profile Completed",
      description: "Welcome to Recrutas! Your profile is now set up.",
    });
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validateFileType(file, allowedTypes)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document (.pdf, .doc, .docx)",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `File size must be less than ${formatFileSize(maxSize)}`,
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  // Handle resume upload
  const handleResumeUpload = () => {
    if (selectedFile) {
      uploadResumeMutation.mutate(selectedFile);
    }
  };

  // Apply to job mutation
  const applyToJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest("POST", `/api/candidates/apply/${jobId}`, {});
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Application failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/matches'] });
    },
    onError: (error: any) => {
      toast({
        title: "Application Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  });

  // Handle exam taking
  const handleTakeExam = (jobId: number, jobTitle: string) => {
    setSelectedJobId(jobId);
    setSelectedJobTitle(jobTitle);
    setShowExam(true);
  };

  // Handle exam completion
  const handleExamComplete = () => {
    setShowExam(false);
    setSelectedJobId(null);
    setSelectedJobTitle('');
    
    toast({
      title: "Exam Completed",
      description: "Your exam has been submitted successfully!",
    });
    
    // Refresh matches to update status
    queryClient.invalidateQueries({ queryKey: ['/api/candidates/matches'] });
    queryClient.invalidateQueries({ queryKey: ['/api/candidates/stats'] });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied': return <Clock className="w-4 h-4" />;
      case 'viewed': return <Eye className="w-4 h-4" />;
      case 'interested': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'screening': return <AlertCircle className="w-4 h-4" />;
      case 'interview': return <Calendar className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };



  // Chat initiation mutation
  const startChatMutation = useMutation({
    mutationFn: async (matchId: number) => {
      const response = await apiRequest("POST", `/api/chat/start/${matchId}`, {});
      if (!response.ok) {
        throw new Error('Failed to start chat');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedChatRoom(data.roomId);
      setShowChat(true);
      toast({
        title: "Chat Started",
        description: "You can now chat with the hiring manager",
      });
    },
    onError: () => {
      toast({
        title: "Chat Failed",
        description: "Unable to start chat. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleStartChat = (matchId: number) => {
    startChatMutation.mutate(matchId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 sm:py-0 sm:h-16 gap-4 sm:gap-0">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {user?.email?.[0]?.toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                  Welcome back, {user?.email?.split('@')[0] || 'Candidate'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">
                  Let's find your next opportunity
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-end">
              <div className="hidden sm:block">
                <AdvancedNotificationCenter />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowResumeUpload(true)}
                className="flex-shrink-0"
              >
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Resume</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowChat(!showChat)}
                className="flex-shrink-0"
              >
                <MessageSquare className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Messages</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  signOut();
                }}
                className="flex-shrink-0"
              >
                <span className="sm:hidden">Exit</span>
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
          
          {/* Mobile notification center */}
          <div className="sm:hidden pb-4">
            <AdvancedNotificationCenter />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                <TabsTrigger value="matches" className="text-xs sm:text-sm">Matches</TabsTrigger>
                <TabsTrigger value="applications" className="text-xs sm:text-sm hidden sm:block">Applications</TabsTrigger>
                <TabsTrigger value="profile" className="text-xs sm:text-sm">Profile</TabsTrigger>
                <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-slate-500">Total Applications</p>
                          <p className="text-xl sm:text-2xl font-bold text-slate-900">
                            {statsLoading ? '-' : stats?.totalApplications || 0}
                          </p>
                        </div>
                        <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-slate-500">Active Matches</p>
                          <p className="text-xl sm:text-2xl font-bold text-slate-900">
                            {statsLoading ? '-' : stats?.activeMatches || 0}
                          </p>
                        </div>
                        <Star className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-slate-500">Profile Views</p>
                          <p className="text-xl sm:text-2xl font-bold text-slate-900">
                            {statsLoading ? '-' : stats?.profileViews || 0}
                          </p>
                        </div>
                        <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Profile Strength */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5" />
                      <span>Profile Strength</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Overall Score</span>
                        <span className="text-sm text-slate-500">
                          {stats?.profileStrength || 0}%
                        </span>
                      </div>
                      <Progress value={stats?.profileStrength || 0} className="w-full" />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Response Rate</span>
                          <span className="font-medium">{stats?.responseRate || 0}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Avg Match Score</span>
                          <span className="font-medium">{stats?.avgMatchScore || 0}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Matches Preview */}
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
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="animate-pulse">
                            <div className="h-16 bg-slate-200 rounded"></div>
                          </div>
                        ))}
                      </div>
                    ) : matches.slice(0, 3).length > 0 ? (
                      <div className="space-y-4">
                        {matches.slice(0, 3).map((match) => (
                          <div key={match.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-slate-200 rounded-lg gap-3 sm:gap-0">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-slate-900 truncate">{match.job.title}</h4>
                              <p className="text-sm text-slate-500 truncate">{match.job.company}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {match.matchScore} match
                                </Badge>
                                <div className="flex items-center space-x-1 text-xs text-slate-500">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{match.job.location}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartChat(match.id)}
                                disabled={startChatMutation.isPending}
                                className="flex-1 sm:flex-none"
                              >
                                {startChatMutation.isPending ? (
                                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin sm:mr-1" />
                                ) : (
                                  <MessageSquare className="w-4 h-4 sm:mr-1" />
                                )}
                                <span className="hidden sm:inline">Chat</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => applyToJobMutation.mutate(match.jobId)}
                                disabled={applyToJobMutation.isPending}
                                className="flex-1 sm:flex-none"
                              >
                                {applyToJobMutation.isPending ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  'Apply'
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Star className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500">No matches yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Matches Tab */}
              <TabsContent value="matches" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <CardTitle>Job Matches</CardTitle>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <select className="text-xs sm:text-sm border rounded px-2 py-1 flex-1 min-w-0">
                            <option value="all">All Locations</option>
                            <option value="remote">Remote</option>
                            <option value="hybrid">Hybrid</option>
                            <option value="onsite">On-site</option>
                          </select>
                          <select className="text-xs sm:text-sm border rounded px-2 py-1 flex-1 min-w-0">
                            <option value="all">All Companies</option>
                            <option value="faang">FAANG</option>
                            <option value="startup">Startup</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                          <select className="text-xs sm:text-sm border rounded px-2 py-1 flex-1 min-w-0">
                            <option value="all">Match Score</option>
                            <option value="90+">90%+ Match</option>
                            <option value="80+">80%+ Match</option>
                            <option value="70+">70%+ Match</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                            <Filter className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">More Filters</span>
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                            <Search className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Search</span>
                          </Button>
                        </div>
                      </div>
                    </div>
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
                                
                                <div className="flex items-center space-x-1 text-slate-600 mb-2">
                                  <Building className="w-4 h-4" />
                                  <span className="font-medium">{match.job.company}</span>
                                </div>
                                
                                <div className="flex items-center space-x-4 text-sm text-slate-500 mb-4">
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{match.job.location}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="w-4 h-4" />
                                    <span>{formatSalary(match.job.salaryMin, match.job.salaryMax)}</span>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {match.job.workType}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center space-x-2 text-sm text-slate-500">
                                  <User className="w-4 h-4" />
                                  <span>Recruiter: {match.recruiter?.firstName || 'Unknown'} {match.recruiter?.lastName || ''}</span>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-end space-y-2">
                                <div className="flex items-center space-x-2">
                                  {(match.job as any).source === 'internal' ? (
                                    // Internal jobs: Apply first, then exam, then chat after AI ranking
                                    <>
                                      {match.status === 'pending' && (
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            // For jobs with exams, go directly to exam
                                            if ((match.job as any)?.hasExam) {
                                              handleTakeExam(match.jobId, match.job.title);
                                            } else {
                                              applyToJobMutation.mutate(match.jobId);
                                            }
                                          }}
                                          disabled={applyToJobMutation.isPending}
                                          className={(match.job as any)?.hasExam ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
                                        >
                                          {(match.job as any)?.hasExam ? '📝 Take Exam' : 'Apply Now'}
                                        </Button>
                                      )}
                                      {match.status === 'applied' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          disabled
                                        >
                                          <Clock className="w-4 h-4 mr-1" />
                                          Awaiting Review
                                        </Button>
                                      )}
                                      {(match.status === 'screening' || match.status === 'interview') && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleStartChat(match.id)}
                                        >
                                          <MessageSquare className="w-4 h-4 mr-1" />
                                          Chat with Hiring Manager
                                        </Button>
                                      )}
                                    </>
                                  ) : (
                                    // External jobs: View career page and mark applied
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(match.job.externalUrl || match.job.careerPageUrl, '_blank')}
                                      >
                                        <Building className="w-4 h-4 mr-1" />
                                        View Job
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          // Mark as applied externally
                                          toast({
                                            title: "Marked as Applied",
                                            description: "We've noted that you applied to this external position.",
                                          });
                                        }}
                                        disabled={match.status === 'applied'}
                                      >
                                        {match.status === 'applied' ? 'Applied' : 'Mark Applied'}
                                      </Button>
                                    </>
                                  )}
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
                          <div key={application.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900">{application.job.title}</h4>
                              <p className="text-sm text-slate-500">{application.job.company}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <Badge className={getStatusColor(application.status)}>
                                  {getStatusIcon(application.status)}
                                  <span className="ml-1 capitalize">{application.status}</span>
                                </Badge>
                                <div className="flex items-center space-x-1 text-xs text-slate-500">
                                  <Clock className="w-3 h-3" />
                                  <span>Applied {new Date(application.appliedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500">No applications yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Job Search Preferences */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Job Search Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Preferred Job Titles */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preferred Job Titles
                        </label>
                        {profilePrefs.preferredJobTitles.map((title, index) => (
                          <div key={index} className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              value={title}
                              onChange={(e) => {
                                const newTitles = [...profilePrefs.preferredJobTitles];
                                newTitles[index] = e.target.value;
                                setProfilePrefs(prev => ({ ...prev, preferredJobTitles: newTitles }));
                              }}
                              placeholder="e.g. Software Engineer, Full Stack Developer"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                            {profilePrefs.preferredJobTitles.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newTitles = profilePrefs.preferredJobTitles.filter((_, i) => i !== index);
                                  setProfilePrefs(prev => ({ ...prev, preferredJobTitles: newTitles }));
                                }}
                              >
                                ×
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProfilePrefs(prev => ({ 
                              ...prev, 
                              preferredJobTitles: [...prev.preferredJobTitles, ''] 
                            }));
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Job Title
                        </Button>
                      </div>

                      {/* Preferred Locations */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preferred Locations
                        </label>
                        {profilePrefs.preferredLocations.map((location, index) => (
                          <div key={index} className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              value={location}
                              onChange={(e) => {
                                const newLocations = [...profilePrefs.preferredLocations];
                                newLocations[index] = e.target.value;
                                setProfilePrefs(prev => ({ ...prev, preferredLocations: newLocations }));
                              }}
                              placeholder="e.g. San Francisco, Remote, New York"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                            {profilePrefs.preferredLocations.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newLocations = profilePrefs.preferredLocations.filter((_, i) => i !== index);
                                  setProfilePrefs(prev => ({ ...prev, preferredLocations: newLocations }));
                                }}
                              >
                                ×
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProfilePrefs(prev => ({ 
                              ...prev, 
                              preferredLocations: [...prev.preferredLocations, ''] 
                            }));
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Location
                        </Button>
                      </div>

                      {/* Salary Range */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Minimum Salary
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              value={profilePrefs.salaryMin}
                              onChange={(e) => setProfilePrefs(prev => ({ ...prev, salaryMin: e.target.value }))}
                              placeholder="80000"
                              className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm w-full"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maximum Salary
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              value={profilePrefs.salaryMax}
                              onChange={(e) => setProfilePrefs(prev => ({ ...prev, salaryMax: e.target.value }))}
                              placeholder="150000"
                              className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm w-full"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Work Type & Experience Level */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Work Type Preference
                          </label>
                          <select
                            value={profilePrefs.workType}
                            onChange={(e) => setProfilePrefs(prev => ({ ...prev, workType: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="any">Any</option>
                            <option value="remote">Remote Only</option>
                            <option value="hybrid">Hybrid</option>
                            <option value="onsite">On-site Only</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Experience Level
                          </label>
                          <select
                            value={profilePrefs.experienceLevel}
                            onChange={(e) => setProfilePrefs(prev => ({ ...prev, experienceLevel: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="entry">Entry Level (0-2 years)</option>
                            <option value="mid">Mid Level (2-5 years)</option>
                            <option value="senior">Senior Level (5+ years)</option>
                            <option value="lead">Lead/Principal (8+ years)</option>
                          </select>
                        </div>
                      </div>

                      {/* Availability */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Availability
                        </label>
                        <select
                          value={profilePrefs.availability}
                          onChange={(e) => setProfilePrefs(prev => ({ ...prev, availability: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="immediate">Available Immediately</option>
                          <option value="2weeks">2 Weeks Notice</option>
                          <option value="1month">1 Month Notice</option>
                          <option value="3months">3+ Months</option>
                          <option value="not_looking">Not Currently Looking</option>
                        </select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Professional Links & Skills */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Professional Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Professional Links */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          LinkedIn Profile
                        </label>
                        <input
                          type="url"
                          value={profilePrefs.linkedinUrl}
                          onChange={(e) => setProfilePrefs(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                          placeholder="https://linkedin.com/in/yourprofile"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          GitHub Profile
                        </label>
                        <input
                          type="url"
                          value={profilePrefs.githubUrl}
                          onChange={(e) => setProfilePrefs(prev => ({ ...prev, githubUrl: e.target.value }))}
                          placeholder="https://github.com/yourusername"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Portfolio Website
                        </label>
                        <input
                          type="url"
                          value={profilePrefs.portfolioUrl}
                          onChange={(e) => setProfilePrefs(prev => ({ ...prev, portfolioUrl: e.target.value }))}
                          placeholder="https://yourportfolio.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>

                      {/* Skills */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Key Skills
                        </label>
                        {profilePrefs.skills.map((skill, index) => (
                          <div key={index} className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              value={skill}
                              onChange={(e) => {
                                const newSkills = [...profilePrefs.skills];
                                newSkills[index] = e.target.value;
                                setProfilePrefs(prev => ({ ...prev, skills: newSkills }));
                              }}
                              placeholder="e.g. JavaScript, React, Node.js"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                            {profilePrefs.skills.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newSkills = profilePrefs.skills.filter((_, i) => i !== index);
                                  setProfilePrefs(prev => ({ ...prev, skills: newSkills }));
                                }}
                              >
                                ×
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProfilePrefs(prev => ({ 
                              ...prev, 
                              skills: [...prev.skills, ''] 
                            }));
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Skill
                        </Button>
                      </div>

                      {/* Save Button */}
                      <div className="pt-4">
                        <Button 
                          className="w-full"
                          onClick={() => {
                            toast({
                              title: "Profile Updated",
                              description: "Your job search preferences have been saved successfully.",
                            });
                          }}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Save Profile Preferences
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activitiesLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="animate-pulse">
                            <div className="h-16 bg-slate-200 rounded"></div>
                          </div>
                        ))}
                      </div>
                    ) : activities.length > 0 ? (
                      <div className="space-y-4">
                        {activities.map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-3 p-3 border-l-4 border-l-blue-500 bg-blue-50 rounded-r">
                            <div className="flex-1">
                              <p className="text-sm text-slate-900">{activity.description}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {new Date(activity.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500">No recent activity</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Chat Sidebar */}
          {showChat && (
            <div className="lg:col-span-1">
              <div className="sticky top-4 lg:top-8">
                <RealTimeChat 
                  roomId={selectedChatRoom} 
                  onClose={() => setShowChat(false)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resume Upload Modal */}
      {showResumeUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Resume</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResumeUpload(false)}
              >
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Drop your resume here or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports PDF and Word documents
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label
                    htmlFor="resume-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </label>
                </div>
              </div>

              {selectedFile && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        {selectedFile.name}
                      </span>
                    </div>
                    <span className="text-xs text-blue-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowResumeUpload(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResumeUpload}
                  disabled={!selectedFile || uploadResumeMutation.isPending}
                  className="flex-1"
                >
                  {uploadResumeMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Completion Modal */}
      {showProfileCompletion && (
        <ProfileCompletionModal
          open={showProfileCompletion}
          onOpenChange={(open) => {
            setShowProfileCompletion(open);
            if (!open) {
              handleProfileComplete();
            }
          }}
          currentProfile={null}
        />
      )}

      {/* Exam Modal */}
      {showExam && selectedJobId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Exam: {selectedJobTitle}
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowExam(false)}
                >
                  ✕
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <JobExam
                jobId={selectedJobId}
                onComplete={handleExamComplete}
                onCancel={() => setShowExam(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}