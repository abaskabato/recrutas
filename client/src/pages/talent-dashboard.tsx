import { useState, useEffect, useMemo } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import {
  getStatusColor,
  formatSalary,
  formatWorkType,
  timeAgo,
  getErrorMessage,
  formatDate
} from "@/lib/dashboard-utils";
import RealTimeNotifications from "@/components/real-time-notifications";
import TalentApplicationIntelligence from "@/components/talent-application-intelligence";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus,
  Users,
  Briefcase,
  MessageSquare,
  TrendingUp,
  Eye,
  Clock,
  Star,
  Building2,
  MapPin,
  DollarSign,
  Filter,
  Search,
  Menu,
  Bell,
  Settings,
  LogOut,
  Edit,
  Trash2,
  ChevronRight,
  Calendar,
  Mail,
  Phone,
  Target,
  BarChart3,
  Building,
  CheckCircle,
  Loader2
} from "lucide-react";
import RecrutasLogo from "@/components/recrutas-logo";
import JobPostingWizard from "@/components/job-posting-wizard";
import TalentOwnerProfileCompletion from "@/components/talent-owner-profile-completion";
import { ThemeToggleButton } from "@/components/theme-toggle-button";

interface JobPosting {
  id: number;
  title: string;
  company: string;
  description: string;
  requirements: string[];
  skills: string[];
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  workType: 'remote' | 'hybrid' | 'onsite';
  status: 'active' | 'paused' | 'closed';
  viewCount: number;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  skills: string[];
  experience: string;
  location: string;
  matchScore: number;
  status: 'submitted' | 'viewed' | 'screening' | 'interview_scheduled' | 'interview_completed' | 'offer' | 'rejected' | 'withdrawn';
  appliedAt: string;
  resumeUrl?: string;
  jobTitle?: string;
  examScore?: number;
  canChat?: boolean;
}

interface DashboardStats {
  activeJobs: number;
  totalMatches: number;
  activeChats: number;
  hires: number;
}

export default function TalentDashboard() {
  const session = useSession();
  const user = session?.user;
  const isLoading = !session;
  const isAuthenticated = !!user;
  const { toast } = useToast();
  const supabase = useSupabaseClient();
  // Parse tab from URL search params
  const getTabFromUrl = (): 'overview' | 'jobs' | 'candidates' | 'analytics' => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['overview', 'jobs', 'candidates', 'analytics'].includes(tab)) {
      return tab as 'overview' | 'jobs' | 'candidates' | 'analytics';
    }
    return 'overview';
  };

  // Parse action from URL search params
  const getActionFromUrl = (): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get('action');
  };

  const [activeTab, setActiveTabState] = useState<'overview' | 'jobs' | 'candidates' | 'analytics'>(getTabFromUrl);

  // Update URL when tab changes
  const setActiveTab = (tab: 'overview' | 'jobs' | 'candidates' | 'analytics') => {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  };

  // Listen for popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setActiveTabState(getTabFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check for action=new URL parameter to auto-open job wizard
  useEffect(() => {
    const action = getActionFromUrl();
    if (action === 'new') {
      setShowJobWizard(true);
      // Clear the action param from URL to prevent re-opening on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('action');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);
  const [showJobWizard, setShowJobWizard] = useState(false);
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedApplicantId, setExpandedApplicantId] = useState<number | null>(null);
  const [screeningQuestions, setScreeningQuestions] = useState<{ [key: number]: string[] }>();
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<JobPosting | null>(null);
  const [jobForm, setJobForm] = useState({
    title: "",
    company: "",
    description: "",
    requirements: [] as string[],
    skills: [] as string[],
    location: "",
    salaryMin: "",
    salaryMax: "",
    workType: "remote" as "remote" | "hybrid" | "onsite",
    industry: "",
    urgency: "medium" as "low" | "medium" | "high",
    benefits: [] as string[],
    experienceLevel: "",
    department: "",
    isRemoteFriendly: true,
    applicationDeadline: "",
    contactEmail: "",
    companySize: "",
    companyDescription: ""
  });

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

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/recruiter/stats'],
    retry: false,
    enabled: !!user,
  });

  // Fetch job postings for the logged-in talent owner
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery<JobPosting[]>({
    queryKey: ['/api/talent-owner/jobs'],
    retry: false,
    enabled: !!user,
  });

  // Fetch applicants for a selected job
  const { data: applicants = [], isLoading: applicantsLoading } = useQuery<any[]>({
    queryKey: ['/api/jobs', selectedJob?.id, 'applicants'],
    enabled: !!selectedJob,
    queryFn: () => apiRequest('GET', `/api/jobs/${selectedJob!.id}/applicants`),
  });

  // Fetch all applicants across all jobs (for analytics)
  const { data: allApplicants = [] } = useQuery<any[]>({
    queryKey: ['/api/talent-owner/all-applicants'],
    enabled: !!user,
    queryFn: () => apiRequest('GET', '/api/talent-owner/all-applicants'),
  });

  // Update application status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: number, status: string }) => {
      return await apiRequest('PUT', `/api/applications/${applicationId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Applicant status updated!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', selectedJob?.id, 'applicants'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      return await apiRequest('POST', '/api/jobs', jobData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job posted successfully!",
      });
      setShowJobDialog(false);
      setJobForm({
        title: "",
        company: "",
        description: "",
        requirements: [],
        skills: [],
        location: "",
        salaryMin: "",
        salaryMax: "",
        workType: "remote" as "remote" | "hybrid" | "onsite",
        industry: "",
        urgency: "medium" as const,
        benefits: [],
        experienceLevel: "",
        department: "",
        isRemoteFriendly: true,
        applicationDeadline: "",
        contactEmail: "",
        companySize: "",
        companyDescription: ""
      });
      queryClient.invalidateQueries({ queryKey: ['/api/talent-owner/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recruiter/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return await apiRequest('DELETE', `/api/jobs/${jobId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/talent-owner/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recruiter/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  });

  // Update job mutation
  const updateJobMutation = useMutation({
    mutationFn: async ({ jobId, data }: { jobId: number, data: any }) => {
      return await apiRequest('PUT', `/api/jobs/${jobId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job updated successfully!",
      });
      setShowJobDialog(false);
      setSelectedJob(null);
      queryClient.invalidateQueries({ queryKey: ['/api/talent-owner/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recruiter/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  });

  // Update job status mutation (pause/resume/close)
  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: number, status: string }) => {
      return await apiRequest('PATCH', `/api/jobs/${jobId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job status updated!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/talent-owner/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recruiter/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  });

  const generateQuestionsMutation = useMutation({
    mutationFn: async ({ jobId, candidateId }: { jobId: number, candidateId: string }) => {
      const response = await apiRequest('POST', '/api/ai/screening-questions', { jobId, candidateId });
      return await response.json();
    },
    onSuccess: (data, variables) => {
      setScreeningQuestions(prev => ({
        ...prev,
        [variables.candidateId]: data.questions,
      }));
      toast({
        title: "AI Questions Generated",
        description: "Suggested screening questions are now available.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startChatMutation = useMutation({
    mutationFn: async ({ jobId, candidateId }: { jobId: number, candidateId: string }) => {
      const response = await apiRequest('POST', '/api/chat/rooms/create', { jobId, candidateId });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Chat Started",
        description: "Opening chat room...",
      });
      // Navigate to chat room
      window.location.href = `/chat/${data.id}`;
    },
    onError: (error: any) => {
      toast({
        title: "Chat Failed",
        description: error.message || "Failed to start chat",
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = (applicationId: number, status: string) => {
    updateStatusMutation.mutate({ applicationId, status });
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      window.location.href = "/auth";
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredCandidates = applicants.filter(applicant => {
    const candidate = applicant.candidate;
    const matchesSearch = searchQuery === "" ||
      candidate.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || applicant.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // PROFILE COMPLETION CHECK REMOVED
  // Users can now access the dashboard immediately
  // Job-specific information (timeline, budget, roles) will be collected when creating jobs
  /*
  if (!user.profileComplete) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <TalentOwnerProfileCompletion
          user={user}
          onComplete={() => {
            // Invalidate session to refresh user data
            queryClient.invalidateQueries({ queryKey: ['/api/session'] });
            toast({
              title: "Profile Completed",
              description: "Welcome to your talent dashboard!",
            });
          }}
          onCancel={handleSignOut}
        />
      </div>
    );
  }
  */

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <RecrutasLogo className="h-8" />
          </div>

          <div className="flex items-center space-x-2">
            <ThemeToggleButton />
            <RealTimeNotifications />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="p-4 space-y-2">
              {['overview', 'jobs', 'candidates', 'analytics'].map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveTab(tab as any);
                    setMobileMenuOpen(false);
                  }}
                >
                  {tab === 'overview' && <TrendingUp className="h-4 w-4 mr-2" />}
                  {tab === 'jobs' && <Briefcase className="h-4 w-4 mr-2" />}
                  {tab === 'candidates' && <Users className="h-4 w-4 mr-2" />}
                  {tab === 'analytics' && <TrendingUp className="h-4 w-4 mr-2" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <RecrutasLogo className="h-8" />
              <nav className="flex space-x-8">
                {['overview', 'jobs', 'candidates', 'analytics'].map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? "secondary" : "ghost"}
                    onClick={() => setActiveTab(tab as any)}
                    className="capitalize"
                  >
                    {tab === 'overview' && <TrendingUp className="h-4 w-4 mr-2" />}
                    {tab === 'jobs' && <Briefcase className="h-4 w-4 mr-2" />}
                    {tab === 'candidates' && <Users className="h-4 w-4 mr-2" />}
                    {tab === 'analytics' && <TrendingUp className="h-4 w-4 mr-2" />}
                    {tab}
                  </Button>
                ))}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggleButton />
              <RealTimeNotifications />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-medium">
                    {user.firstName?.[0] || user.email?.[0] || 'U'}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {user.firstName || user.email?.split('@')[0] || 'User'}
                </span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowProfileSettings(true)}
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Profile Settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign Out</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Welcome Header */}
              <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                      Welcome back, {user.firstName || 'Talent Owner'}!
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      Manage your job postings and connect with top candidates
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowJobWizard(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Job with Exam
                  </Button>
                </div>
              </div>

              {/* Actionable Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Jobs</CardTitle>
                    <Briefcase className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {statsLoading ? "..." : stats?.activeJobs || 0}
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">Jobs you are actively hiring for.</p>
                    <Button className="mt-4 w-full" size="sm" onClick={() => setActiveTab('jobs')}>
                      Manage Jobs
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Matches</CardTitle>
                    <Users className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {statsLoading ? "..." : stats?.totalMatches || 0}
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">Potential candidates matched by AI.</p>
                    <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => setActiveTab('candidates')}>
                      View Candidates
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Chats</CardTitle>
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {statsLoading ? "..." : stats?.activeChats || 0}
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">Conversations with top candidates.</p>
                    <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => window.location.href = '/chat'}>
                      Open Chats
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Hires Made</CardTitle>
                    <Star className="h-5 w-5 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {statsLoading ? "..." : stats?.hires || 0}
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">Successful hires from this platform.</p>
                    <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => setActiveTab('analytics')}>
                      View Analytics
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-6">
              {/* Recent Jobs */}
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-white">Recent Job Postings</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('jobs')}
                    >
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {jobsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : jobs.length === 0 ? (
                    <div className="text-center py-8">
                      <Briefcase className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No job postings yet</h3>
                      <p className="text-gray-500 dark:text-gray-400">Create your first job posting to start finding great candidates.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {jobs.slice(0, 3).map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">{job.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{job.company} • {job.location}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                <Eye className="h-3 w-3 mr-1" />
                                {job.viewCount} views
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {job.applicationCount} applications
                              </span>
                            </div>
                          </div>
                          <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                            {job.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            {/* Jobs Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Job Postings</h2>
                <p className="text-gray-500 dark:text-gray-400">Manage your job listings and track applications</p>
              </div>
              <Button
                onClick={() => setShowJobWizard(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Post New Job
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <Input
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Jobs List */}
            <div className="space-y-4">
              {jobsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse bg-white dark:bg-gray-800 shadow-md">
                      <CardContent className="p-6">
                        <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                        <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <Card className="bg-white dark:bg-gray-800 shadow-md">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {searchQuery || filterStatus !== 'all' ? 'No jobs found' : 'No job postings yet'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      {searchQuery || filterStatus !== 'all'
                        ? 'Try adjusting your search or filters'
                        : 'Create your first job posting to start finding great candidates'}
                    </p>
                    {!searchQuery && filterStatus === 'all' && (
                      <Button onClick={() => setShowJobWizard(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Post Your First Job
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filteredJobs.map((job) => (
                  <Card key={job.id} className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                            <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                              {job.status}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                            <span className="flex items-center">
                              <Building2 className="h-4 w-4 mr-1" />
                              {job.company}
                            </span>
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {job.location}
                            </span>
                            {(job.salaryMin || job.salaryMax) && (
                              <span className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                {job.salaryMin && job.salaryMax
                                  ? `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`
                                  : job.salaryMin
                                    ? `From ${job.salaryMin.toLocaleString()}`
                                    : `Up to ${job.salaryMax?.toLocaleString()}`
                                }
                              </span>
                            )}
                          </div>

                          <p className="text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                            {job.description}
                          </p>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {job.skills?.slice(0, 3).map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            )) || []}
                            {job.skills && job.skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{job.skills.length - 3} more
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center">
                              <Eye className="h-4 w-4 mr-1" />
                              {job.viewCount} views
                            </span>
                            <span className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {job.applicationCount} applications
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {new Date(job.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex lg:flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 lg:flex-none"
                            onClick={() => {
                              setSelectedJob(job);
                              setActiveTab('candidates'); // Switch to candidates/applicants view
                            }}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            View Applicants
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 lg:flex-none"
                            onClick={() => {
                              setSelectedJob(job);
                              setJobForm({
                                title: job.title,
                                company: job.company,
                                description: job.description,
                                requirements: job.requirements,
                                skills: job.skills,
                                location: job.location,
                                salaryMin: job.salaryMin?.toString() || "",
                                salaryMax: job.salaryMax?.toString() || "",
                                workType: job.workType
                              });
                              setShowJobDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 lg:flex-none text-red-600 hover:text-red-700"
                            onClick={() => setJobToDelete(job)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Candidates Tab - Now for Applicants */}
        {activeTab === 'candidates' && (
          <div className="space-y-6">
            {selectedJob ? (
              <>
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                    Applicants for {selectedJob.title}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">Review and manage candidates for this role.</p>
                </div>
                {applicantsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="animate-pulse bg-white dark:bg-gray-800 shadow-md">
                        <CardContent className="p-6">
                          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                          <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                          <div className="h-4 bg-muted rounded w-2/3"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : applicants.length === 0 ? (
                  <Card className="bg-white dark:bg-gray-800 shadow-md">
                    <CardContent className="p-12 text-center">
                      <Users className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No applicants yet</h3>
                      <p className="text-gray-500 dark:text-gray-400">As soon as candidates apply, you'll see them here.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredCandidates.map((applicant) => {
                      const isExpanded = expandedApplicantId === applicant.applicationId;
                      const questions = screeningQuestions[applicant.candidate.id];
                      return (
                        <Card key={applicant.applicationId}>
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-4">
                                  <h3 className="font-semibold text-lg">{applicant.candidate.firstName} {applicant.candidate.lastName}</h3>
                                  {applicant.match?.matchScore && (
                                    <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                                      <Star className="h-3 w-3 mr-1" />
                                      {applicant.match.matchScore} Match
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">{applicant.candidate.email}</p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {(applicant.profile?.skills || []).map((skill: string) => (
                                    <Badge key={skill} variant="secondary">{skill}</Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Select
                                  defaultValue={applicant.status}
                                  onValueChange={(newStatus) => handleUpdateStatus(applicant.applicationId, newStatus)}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="submitted">Submitted</SelectItem>
                                    <SelectItem value="viewed">Viewed</SelectItem>
                                    <SelectItem value="screening">Screening</SelectItem>
                                    <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                                    <SelectItem value="interview_completed">Interview Completed</SelectItem>
                                    <SelectItem value="offer">Offer</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                                  </SelectContent>
                                </Select>
                                {applicant.match?.aiExplanation && (
                                  <Button size="sm" variant="link" onClick={() => setExpandedApplicantId(isExpanded ? null : applicant.applicationId)}>
                                    {isExpanded ? 'Hide' : 'Show'} AI Insights
                                  </Button>
                                )}
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                                {applicant.match?.aiExplanation && (
                                  <div className="mb-4">
                                    <h4 className="font-semibold text-sm mb-2 text-gray-800 dark:text-gray-200">AI Insights:</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{applicant.match.aiExplanation}</p>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => generateQuestionsMutation.mutate({ jobId: selectedJob!.id, candidateId: applicant.candidate.id })}
                                    disabled={generateQuestionsMutation.isPending}
                                  >
                                    Generate AI Screening Questions
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => startChatMutation.mutate({ jobId: selectedJob!.id, candidateId: applicant.candidate.id })}
                                    disabled={startChatMutation.isPending}
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Start Chat
                                  </Button>
                                </div>
                                {questions && (
                                  <div className="mt-4">
                                    <h5 className="font-semibold text-sm mb-2">Suggested Questions:</h5>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                      {questions.map((q, i) => <li key={i}>{q}</li>)}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardContent className="p-12 text-center">
                  <Briefcase className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Job to View Applicants</h3>
                  <p className="text-gray-500 dark:text-gray-400">Go to the 'Jobs' tab and click 'View Applicants' on a job posting.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Analytics</h2>
              <p className="text-gray-500 dark:text-gray-400">Track your hiring performance and metrics</p>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Job Performance Chart */}
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Job Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {jobs.slice(0, 5).map((job, index) => {
                      const viewCount = job.viewCount || 0;
                      const applicationCount = job.applicationCount || 0;
                      const performance = Math.min(100, (applicationCount / Math.max(viewCount, 1)) * 100);
                      return (
                        <div key={job.id} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium truncate">{job.title}</span>
                            <span className="text-gray-500 dark:text-gray-400">{Math.round(performance)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${performance}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{viewCount} views</span>
                            <span>{applicationCount} applications</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Application Trends */}
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Application Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(() => {
                      // Calculate real application trends from applicant data
                      const now = new Date();
                      const getWeekStart = (weeksAgo: number) => {
                        const date = new Date(now);
                        date.setDate(date.getDate() - (weeksAgo * 7));
                        date.setHours(0, 0, 0, 0);
                        return date;
                      };

                      const periods = [
                        { label: 'This Week', start: getWeekStart(0), end: now },
                        { label: 'Last Week', start: getWeekStart(1), end: getWeekStart(0) },
                        { label: '2 Weeks Ago', start: getWeekStart(2), end: getWeekStart(1) },
                        { label: '3 Weeks Ago', start: getWeekStart(3), end: getWeekStart(2) }
                      ];

                      const maxApps = Math.max(...periods.map(period => {
                        return allApplicants.filter(app => {
                          if (!app.appliedAt) return false;
                          const appliedDate = new Date(app.appliedAt);
                          return appliedDate >= period.start && appliedDate < period.end;
                        }).length;
                      }), 1); // At least 1 to avoid division by zero

                      return periods.map((period) => {
                        const applications = allApplicants.filter(app => {
                          if (!app.appliedAt) return false;
                          const appliedDate = new Date(app.appliedAt);
                          return appliedDate >= period.start && appliedDate < period.end;
                        }).length;

                        const percentage = (applications / maxApps) * 100;

                        return (
                          <div key={period.label} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{period.label}</span>
                              <span className="text-gray-500 dark:text-gray-400">{applications} applications</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Top Skills in Demand */}
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Top Skills in Demand
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const allSkills = jobs.flatMap(job => job.skills);
                      const skillCounts = allSkills.reduce((acc, skill) => {
                        acc[skill] = (acc[skill] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);

                      return Object.entries(skillCounts)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 8)
                        .map(([skill, count]) => (
                          <div key={skill} className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{count} jobs</span>
                          </div>
                        ));
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Response Time Analysis */}
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Response Time Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(() => {
                      // Calculate real response times from applicant data with defensive checks
                      const responseTimes = allApplicants
                        .filter(app => {
                          if (app.status === 'submitted') return false;
                          if (!app.updatedAt || !app.appliedAt) return false;
                          // Validate dates are parseable
                          try {
                            const applied = new Date(app.appliedAt).getTime();
                            const updated = new Date(app.updatedAt).getTime();
                            return !isNaN(applied) && !isNaN(updated);
                          } catch {
                            return false;
                          }
                        })
                        .map(app => {
                          const applied = new Date(app.appliedAt).getTime();
                          const responded = new Date(app.updatedAt).getTime();
                          const diffHours = (responded - applied) / (1000 * 60 * 60);
                          return diffHours;
                        })
                        .filter(hours => hours >= 0 && hours < 8760); // Filter out negative or > 1 year

                      const avgResponseTime = responseTimes.length > 0
                        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
                        : 0;

                      const formatTime = (hours: number) => {
                        if (hours < 1) return `${Math.round(hours * 60)} min`;
                        if (hours < 24) return `${hours.toFixed(1)} hrs`;
                        return `${(hours / 24).toFixed(1)} days`;
                      };

                      const buckets = [
                        { range: '< 1 hour', filter: (h: number) => h < 1, color: 'bg-green-500' },
                        { range: '1-4 hours', filter: (h: number) => h >= 1 && h < 4, color: 'bg-yellow-500' },
                        { range: '4-24 hours', filter: (h: number) => h >= 4 && h < 24, color: 'bg-orange-500' },
                        { range: '> 24 hours', filter: (h: number) => h >= 24, color: 'bg-red-500' }
                      ];

                      return (
                        <>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">
                              {responseTimes.length > 0 ? formatTime(avgResponseTime) : 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Average Response Time</div>
                          </div>

                          <div className="space-y-3">
                            {buckets.map(({ range, filter, color }) => {
                              const count = responseTimes.filter(filter).length;
                              const percentage = responseTimes.length > 0 ? (count / responseTimes.length) * 100 : 0;
                              return (
                                <div key={range} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>{range}</span>
                                    <span className="text-gray-500 dark:text-gray-400">{count} responses</span>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                      className={`${color} h-2 rounded-full transition-all duration-300`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Hiring Funnel */}
            <Card className="bg-white dark:bg-gray-800 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Hiring Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { stage: 'Submitted', count: allApplicants.length, color: 'bg-blue-500' },
                    { stage: 'Viewed', count: allApplicants.filter(c => c.status === 'viewed').length, color: 'bg-green-500' },
                    { stage: 'Screening', count: allApplicants.filter(c => c.status === 'screening').length, color: 'bg-yellow-500' },
                    { stage: 'Interview', count: allApplicants.filter(c => c.status === 'interview_scheduled' || c.status === 'interview_completed').length, color: 'bg-orange-500' },
                    { stage: 'Offer', count: allApplicants.filter(c => c.status === 'offer').length, color: 'bg-purple-500' }
                  ].map(({ stage, count, color }) => (
                    <div key={stage} className="text-center">
                      <div className={`${color} text-white rounded-lg p-4 mb-2`}>
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm opacity-90">{stage}</div>
                      </div>
                      {stage !== 'Offer' && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {allApplicants.length > 0 ? Math.round((count / allApplicants.length) * 100) : 0}% conversion
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* The Enhanced Job Creation Dialog has been removed in favor of the JobPostingWizard */}

      {/* Job Posting Wizard with Exam Creation */}
      {showJobWizard && (
        <Dialog open={showJobWizard} onOpenChange={setShowJobWizard}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
            <JobPostingWizard
              isSubmitting={createJobMutation.isPending}
              onSubmit={async (jobData) => {
                try {
                  console.log('[TalentDashboard] Job submission started with data:', jobData);
                  // Transform wizard data to match API format
                  const jobPayload = {
                    title: jobData.title,
                    company: jobData.company,
                    description: jobData.description,
                    requirements: jobData.requirements,
                    skills: jobData.skills,
                    location: jobData.location,
                    workType: jobData.workType,
                    salaryMin: jobData.salaryMin,
                    salaryMax: jobData.salaryMax,
                    expiresAt: jobData.expiresAt ? new Date(jobData.expiresAt) : null, // Convert to Date object
                    // Add exam data if filtering is enabled
                    hasExam: jobData.enableFiltering,
                    exam: jobData.enableFiltering ? {
                      questions: jobData.filteringExam?.questions || [],
                      timeLimit: jobData.filteringExam?.timeLimit || 30,
                      passingScore: jobData.filteringExam?.passingScore || 70
                    } : null
                  };

                  console.log('[TalentDashboard] Sending request with payload:', jobPayload);
                  const result = await createJobMutation.mutateAsync(jobPayload);
                  console.log('[TalentDashboard] Job created successfully:', result);
                  toast({
                    title: "Success",
                    description: "Job posted successfully! Candidates will be matched shortly.",
                  });
                  setShowJobWizard(false);
                } catch (error: any) {
                  console.error('[TalentDashboard] Failed to create job:', error);

                  // Try to extract detailed error message
                  let errorDescription = 'Something went wrong. Please try again.';
                  try {
                    if (error?.response) {
                      const errorData = await error.response.json();
                      if (errorData.errors) {
                        // Zod validation errors - show which fields failed
                        const fieldErrors = Object.entries(errorData.errors)
                          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
                          .join('; ');
                        errorDescription = fieldErrors || errorData.message || errorDescription;
                      } else {
                        errorDescription = errorData.message || errorDescription;
                      }
                    } else if (error?.message) {
                      if (error.message.includes('401')) {
                        errorDescription = 'Please log in again';
                      } else if (error.message.includes('400')) {
                        errorDescription = 'Please check all required fields are filled correctly';
                      }
                    }
                  } catch (e) {
                    // Ignore parsing errors
                  }

                  toast({
                    title: "Failed to create job",
                    description: errorDescription,
                    variant: "destructive",
                  });
                }
              }}
              onCancel={() => setShowJobWizard(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Job Edit Dialog */}
      {showJobDialog && selectedJob && (
        <Dialog open={showJobDialog} onOpenChange={(open) => {
          if (!open) {
            setShowJobDialog(false);
            setSelectedJob(null);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Job Posting</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Title</label>
                  <Input
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company</label>
                  <Input
                    value={jobForm.company}
                    onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  placeholder="Describe the role and responsibilities..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    placeholder="e.g. New York, NY"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Work Type</label>
                  <Select
                    value={jobForm.workType}
                    onValueChange={(value) => setJobForm({ ...jobForm, workType: value as "remote" | "hybrid" | "onsite" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Salary</label>
                  <Input
                    type="number"
                    value={jobForm.salaryMin}
                    onChange={(e) => setJobForm({ ...jobForm, salaryMin: e.target.value })}
                    placeholder="e.g. 80000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Salary</label>
                  <Input
                    type="number"
                    value={jobForm.salaryMax}
                    onChange={(e) => setJobForm({ ...jobForm, salaryMax: e.target.value })}
                    placeholder="e.g. 120000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Required Skills (comma separated)</label>
                <Input
                  value={jobForm.skills.join(', ')}
                  onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="e.g. React, TypeScript, Node.js"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Requirements (comma separated)</label>
                <Textarea
                  value={jobForm.requirements.join(', ')}
                  onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="e.g. 5+ years experience, Bachelor's degree"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowJobDialog(false);
                setSelectedJob(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedJob) {
                    updateJobMutation.mutate({
                      jobId: selectedJob.id,
                      data: {
                        title: jobForm.title,
                        company: jobForm.company,
                        description: jobForm.description,
                        requirements: jobForm.requirements,
                        skills: jobForm.skills,
                        location: jobForm.location,
                        salaryMin: jobForm.salaryMin ? parseInt(jobForm.salaryMin) : undefined,
                        salaryMax: jobForm.salaryMax ? parseInt(jobForm.salaryMax) : undefined,
                        workType: jobForm.workType
                      }
                    });
                  }
                }}
                disabled={updateJobMutation.isPending}
              >
                {updateJobMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Profile Settings Dialog */}
      {showProfileSettings && (
        <TalentOwnerProfileCompletion
          user={user}
          onComplete={() => {
            setShowProfileSettings(false);
            queryClient.invalidateQueries({ queryKey: ['/api/session'] });
            toast({
              title: "Profile Updated",
              description: "Your profile has been successfully updated.",
            });
            // Reload to refresh user data
            window.location.reload();
          }}
          onCancel={() => setShowProfileSettings(false)}
        />
      )}

      {/* Delete Job Confirmation Dialog */}
      <AlertDialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Posting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{jobToDelete?.title}"? This action cannot be undone.
              All applications and data associated with this job will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (jobToDelete) {
                  deleteJobMutation.mutate(jobToDelete.id);
                  setJobToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
