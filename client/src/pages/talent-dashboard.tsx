import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { signOut } from "@/lib/auth-client";
import { 
  getStatusColor, 
  formatSalary, 
  formatWorkType, 
  timeAgo, 
  getErrorMessage,
  formatDate
} from "@/lib/dashboard-utils";
import RealTimeNotifications from "@/components/real-time-notifications";
import TalentApplicationView from "@/components/talent-application-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  status: 'applied' | 'screening' | 'interview' | 'rejected' | 'hired';
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
  const { data: session, isPending: isLoading } = useSession();
  const user = session?.user;
  const isAuthenticated = !!user;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'candidates' | 'analytics'>('overview');
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [showJobWizard, setShowJobWizard] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationIntelligence | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Job form state
  const [jobForm, setJobForm] = useState({
    title: "",
    company: "",
    description: "",
    requirements: [] as string[],
    skills: [] as string[],
    location: "",
    salaryMin: "",
    salaryMax: "",
    workType: "remote" as const,
    industry: "",
    urgency: "medium" as const,
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

  // Fetch job postings
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery<JobPosting[]>({
    queryKey: ['/api/jobs'],
    retry: false,
    enabled: !!user,
  });

  // Fetch applications for talent owner
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<ApplicationIntelligence[]>({
    queryKey: ['/api/talent/applications'],
    queryFn: () => apiRequest("/api/talent/applications"),
    enabled: !!user,
  });

  const { data: hiringFunnel, isLoading: hiringFunnelLoading } = useQuery({
    queryKey: ["/api/analytics/hiring-funnel"],
    queryFn: () => apiRequest("/api/analytics/hiring-funnel"),
    enabled: activeTab === 'analytics' && !!user,
  });

  const { data: responseTimes, isLoading: responseTimesLoading } = useQuery({
    queryKey: ["/api/analytics/response-times"],
    queryFn: () => apiRequest("/api/analytics/response-times"),
    enabled: activeTab === 'analytics' && !!user,
  });

  const { data: topSkills, isLoading: topSkillsLoading } = useQuery({
    queryKey: ["/api/analytics/top-skills"],
    queryFn: () => apiRequest("/api/analytics/top-skills"),
    enabled: activeTab === 'analytics' && !!user,
  });

  const { data: jobPerformance, isLoading: jobPerformanceLoading } = useQuery({
    queryKey: ["/api/analytics/job-performance"],
    queryFn: () => apiRequest("/api/analytics/job-performance"),
    enabled: activeTab === 'analytics' && !!user,
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
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
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

  const handleJobSubmit = () => {
    if (!jobForm.title || !jobForm.company || !jobForm.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const jobData = {
      title: jobForm.title,
      company: jobForm.company,
      description: jobForm.description,
      location: jobForm.location || null,
      workType: jobForm.workType,
      industry: jobForm.industry || null,
      salaryMin: jobForm.salaryMin ? parseInt(jobForm.salaryMin) : null,
      salaryMax: jobForm.salaryMax ? parseInt(jobForm.salaryMax) : null,
      requirements: jobForm.requirements.filter(r => r.trim()),
      skills: jobForm.skills.filter(s => s.trim()),
      urgency: jobForm.urgency,
      // Internal job settings - automatically include exam and chat
      hasExam: true,
      examPassingScore: 70,
      hiringManagerId: user?.id, // Current user as hiring manager
      autoRankCandidates: true,
      maxChatCandidates: 5,
    };

    createJobMutation.mutate(jobData);
  };

  const handleLogout = () => {
    signOut();
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredApplications = applications.filter(application => {
    const matchesSearch = searchQuery === "" || 
      application.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      application.job.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || application.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show profile completion if profile is not complete
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
          onCancel={() => {
            // Allow them to sign out if they don't want to complete profile
            signOut().then(() => {
              window.location.href = "/";
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
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
            <RealTimeNotifications />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
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
                  variant={activeTab === tab ? "default" : "ghost"}
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
      <div className="hidden lg:block bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <RecrutasLogo className="h-8" />
              <nav className="flex space-x-8">
                {['overview', 'jobs', 'candidates', 'analytics'].map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? "default" : "ghost"}
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
              <RealTimeNotifications />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.firstName?.[0] || user.email?.[0] || 'U'}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user.firstName || user.email?.split('@')[0] || 'User'}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Welcome Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                    Welcome back, {user.firstName || 'Talent Owner'}!
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Jobs</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {statsLoading ? "..." : stats?.activeJobs || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Matches</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {statsLoading ? "..." : stats?.totalMatches || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Chats</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {statsLoading ? "..." : stats?.activeChats || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <Star className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Hires Made</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {statsLoading ? "..." : stats?.hires || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Jobs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Job Postings</span>
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
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No job postings yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first job posting to start finding great candidates.</p>
                    <Button onClick={() => setShowJobDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Post Your First Job
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobs.slice(0, 3).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{job.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{job.company} • {job.location}</p>
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
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            {/* Jobs Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Job Postings</h2>
                <p className="text-gray-600 dark:text-gray-400">Manage your job listings and track applications</p>
              </div>
              <Button 
                onClick={() => setShowJobDialog(true)}
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {searchQuery || filterStatus !== 'all' ? 'No jobs found' : 'No job postings yet'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {searchQuery || filterStatus !== 'all' 
                        ? 'Try adjusting your search or filters' 
                        : 'Create your first job posting to start finding great candidates'}
                    </p>
                    {!searchQuery && filterStatus === 'all' && (
                      <Button onClick={() => setShowJobDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Post Your First Job
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filteredJobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                            <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                              {job.status}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
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
                                  ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
                                  : job.salaryMin 
                                    ? `From $${job.salaryMin.toLocaleString()}`
                                    : `Up to $${job.salaryMax?.toLocaleString()}`
                                }
                              </span>
                            )}
                          </div>

                          <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
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
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${job.title}"?`)) {
                                deleteJobMutation.mutate(job.id);
                              }
                            }}
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

        {/* Candidates Tab - Application Intelligence */}
        {activeTab === 'candidates' && (
          <div className="space-y-6">
            {selectedApplication ? (
              <div>
                <Button onClick={() => setSelectedApplication(null)} variant="outline" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Applications
                </Button>
                <TalentApplicationView application={selectedApplication} />
              </div>
            ) : (
              <>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Candidates</h2>
                    <p className="text-gray-600 dark:text-gray-400">Review and manage candidate applications</p>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by candidate or job..."
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
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="screening">Screening</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="hired">Hired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {applicationsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No candidate applications yet</h3>
                      <p className="text-gray-600 dark:text-gray-400">When candidates apply to your jobs, you'll be able to provide transparent feedback and track application intelligence here.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredApplications.map((application) => (
                      <Card key={application.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedApplication(application)}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{application.candidateName}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Applied for {application.job.title}</p>
                            </div>
                            <Badge variant={application.status === 'applied' ? 'default' : 'secondary'}>
                              {application.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Analytics</h2>
              <p className="text-gray-600 dark:text-gray-400">Track your hiring performance and metrics</p>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Job Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Job Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {jobPerformanceLoading ? (
                      <p>Loading...</p>
                    ) : (
                      jobPerformance.map((job: any) => (
                        <div key={job.id} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium truncate">{job.title}</span>
                            <span className="text-gray-500">{Math.round(job.conversionRate)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${job.conversionRate}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{job.views} views</span>
                            <span>{job.applications} applications</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Application Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Application Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p>Application trends data goes here.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Top Skills in Demand */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Top Skills in Demand
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topSkillsLoading ? (
                      <p>Loading...</p>
                    ) : (
                      topSkills.map(([skill, count]: [string, number]) => (
                        <div key={skill} className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                          <span className="text-sm text-gray-500">{count} jobs</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Response Time Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Response Time Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {responseTimesLoading ? (
                      <p>Loading...</p>
                    ) : (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">{responseTimes.averageResponseTime.toFixed(1)} hrs</div>
                        <div className="text-sm text-gray-500">Average Response Time</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Hiring Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Hiring Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hiringFunnelLoading ? (
                  <p>Loading...</p>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    {Object.entries(hiringFunnel).map(([stage, count]) => (
                      <div key={stage} className="text-center">
                        <div className="bg-blue-500 text-white rounded-lg p-4 mb-2">
                          <div className="text-2xl font-bold">{count as number}</div>
                          <div className="text-sm opacity-90">{stage}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Enhanced Job Creation Dialog */}
      <Dialog open={showJobDialog} onOpenChange={setShowJobDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Briefcase className="h-5 w-5 mr-2" />
              Post New Job - Advanced Job Posting
            </DialogTitle>
            <p className="text-sm text-gray-600">Create a comprehensive job posting to attract the right candidates</p>
          </DialogHeader>
          
          <div className="space-y-8 py-4">
            {/* Basic Information Section */}
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Job Title *</label>
                  <Input
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Company *</label>
                  <Input
                    value={jobForm.company}
                    onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })}
                    placeholder="e.g., Recrutas Technologies"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Department</label>
                  <Input
                    value={jobForm.department}
                    onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                    placeholder="e.g., Engineering, Marketing, Sales"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Industry</label>
                  <Select value={jobForm.industry} onValueChange={(value) => setJobForm({ ...jobForm, industry: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                      <SelectItem value="startup">Startup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Job Description *</label>
                <Textarea
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  placeholder="Join our team! Describe the role, responsibilities, team culture, and what makes this opportunity exciting..."
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Company Description</label>
                <Textarea
                  value={jobForm.companyDescription}
                  onChange={(e) => setJobForm({ ...jobForm, companyDescription: e.target.value })}
                  placeholder="Tell candidates about your company, mission, values, and what makes it a great place to work..."
                  rows={3}
                />
              </div>
            </div>

            {/* Location & Work Details */}
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Location & Work Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <Input
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    placeholder="e.g., San Francisco, CA or Remote"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Work Type</label>
                  <Select value={jobForm.workType} onValueChange={(value: any) => setJobForm({ ...jobForm, workType: value })}>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Experience Level</label>
                  <Select value={jobForm.experienceLevel} onValueChange={(value) => setJobForm({ ...jobForm, experienceLevel: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                      <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                      <SelectItem value="senior">Senior Level (6-10 years)</SelectItem>
                      <SelectItem value="lead">Lead/Principal (10+ years)</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Company Size</label>
                  <Select value={jobForm.companySize} onValueChange={(value) => setJobForm({ ...jobForm, companySize: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startup">Startup (1-10)</SelectItem>
                      <SelectItem value="small">Small (11-50)</SelectItem>
                      <SelectItem value="medium">Medium (51-200)</SelectItem>
                      <SelectItem value="large">Large (201-1000)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (1000+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Compensation & Benefits */}
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Compensation & Benefits
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min Salary (Annual)</label>
                  <Input
                    type="number"
                    value={jobForm.salaryMin}
                    onChange={(e) => setJobForm({ ...jobForm, salaryMin: e.target.value })}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Salary (Annual)</label>
                  <Input
                    type="number"
                    value={jobForm.salaryMax}
                    onChange={(e) => setJobForm({ ...jobForm, salaryMax: e.target.value })}
                    placeholder="100000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Benefits & Perks</label>
                <Textarea
                  placeholder="• Health, dental, vision insurance&#10;• 401(k) with company match&#10;• Unlimited PTO&#10;• Remote work flexibility&#10;• Professional development budget&#10;• Stock options/equity&#10;• Gym membership&#10;• Free lunch"
                  rows={3}
                  onChange={(e) => setJobForm({ 
                    ...jobForm, 
                    benefits: e.target.value.split('\n').map(b => b.trim()).filter(b => b)
                  })}
                />
              </div>
            </div>

            {/* Requirements & Skills */}
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Requirements & Skills
              </h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Required Skills *</label>
                <Input
                  placeholder="React, Node.js, Python, JavaScript, TypeScript, AWS... (comma separated)"
                  onChange={(e) => setJobForm({ 
                    ...jobForm, 
                    skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">These skills will be used for AI-powered candidate matching</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Requirements & Qualifications</label>
                <Textarea
                  placeholder="• 3+ years of professional software development experience&#10;• Bachelor's degree in Computer Science or related field&#10;• Experience with modern web technologies&#10;• Strong problem-solving and analytical skills&#10;• Excellent communication and collaboration abilities&#10;• Experience with agile development methodologies"
                  rows={4}
                  onChange={(e) => setJobForm({ 
                    ...jobForm, 
                    requirements: e.target.value.split('\n').map(r => r.trim()).filter(r => r)
                  })}
                />
              </div>
            </div>

            {/* Application Details */}
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Application Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Email</label>
                  <Input
                    type="email"
                    value={jobForm.contactEmail}
                    onChange={(e) => setJobForm({ ...jobForm, contactEmail: e.target.value })}
                    placeholder="hiring@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Application Deadline</label>
                  <Input
                    type="date"
                    value={jobForm.applicationDeadline}
                    onChange={(e) => setJobForm({ ...jobForm, applicationDeadline: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Urgency Level</label>
                <Select value={jobForm.urgency} onValueChange={(value: any) => setJobForm({ ...jobForm, urgency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Standard hiring timeline</SelectItem>
                    <SelectItem value="medium">Medium - Looking to fill soon</SelectItem>
                    <SelectItem value="high">High - Urgent need, fast hiring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowJobDialog(false)}
                disabled={createJobMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleJobSubmit}
                disabled={createJobMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createJobMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Job...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Post Job
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job Posting Wizard with Exam Creation */}
      {showJobWizard && (
        <Dialog open={showJobWizard} onOpenChange={setShowJobWizard}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
            <JobPostingWizard
              onSubmit={async (jobData) => {
                try {
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
                    // Add exam data if filtering is enabled
                    hasExam: jobData.enableFiltering,
                    exam: jobData.enableFiltering ? {
                      questions: jobData.filteringExam?.questions || [],
                      timeLimit: jobData.filteringExam?.timeLimit || 30,
                      passingScore: jobData.filteringExam?.passingScore || 70
                    } : null
                  };

                  await createJobMutation.mutateAsync(jobPayload);
                  setShowJobWizard(false);
                } catch (error) {
                  console.error('Failed to create job:', error);
                }
              }}
              onCancel={() => setShowJobWizard(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}