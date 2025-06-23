import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Users, 
  Briefcase, 
  MessageSquare, 
  TrendingUp, 
  Calendar,
  Edit,
  Trash2,
  Eye,
  ChevronRight,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Target,
  Award,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  BarChart3,
  UserCheck,
  FileText,
  Globe,
  Zap,
  Filter,
  Search,
  RefreshCw
} from "lucide-react";
import JobWizard from "@/components/job-wizard";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

function getErrorMessage(error: any): string {
  if (error?.message) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

export default function TalentDashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobWizard, setShowJobWizard] = useState(false);
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobForm, setJobForm] = useState({
    title: '',
    company: '',
    description: '',
    location: '',
    workType: 'remote',
    salaryMin: '',
    salaryMax: '',
    skills: [],
    requirements: '',
    benefits: '',
    hasExam: true,
    examQuestions: []
  });

  // Fetch user's job postings
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['/api/jobs'],
    enabled: !!user?.id,
  });

  // Fetch recruiter stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/recruiter/stats'],
    enabled: !!user?.id,
  });

  // Fetch matches for recruiter
  const { data: matches = [] } = useQuery({
    queryKey: ['/api/recruiter/matches'],
    enabled: !!user?.id,
  });

  // Fetch applications
  const { data: applications = [] } = useQuery({
    queryKey: ['/api/recruiter/applications'],
    enabled: !!user?.id,
  });

  // Create job mutation (for exam wizard)
  const createJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      return await apiRequest('POST', '/api/jobs', jobData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job posted successfully!",
      });
      setShowJobWizard(false);
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

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return await apiRequest('DELETE', `/api/jobs/${jobId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job deleted successfully",
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

  const handleLogout = () => {
    if (signOut) {
      signOut();
    }
  };

  const handleJobSubmit = (jobData: any) => {
    createJobMutation.mutate(jobData);
    setShowJobDialog(false);
  };

  const handleDeleteJob = (jobId: number) => {
    if (confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
      deleteJobMutation.mutate(jobId);
    }
  };

  // Filter jobs based on status and search
  const filteredJobs = Array.isArray(jobs) ? jobs.filter((job: any) => {
    const matchesStatus = filterStatus === "all" || job.status === filterStatus;
    const matchesSearch = searchQuery === "" || 
      (job.title && job.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.company && job.company.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  }) : [];

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'paused': return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case 'closed': return <Badge className="bg-gray-100 text-gray-800">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get application status color
  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'text-blue-600';
      case 'screening': return 'text-yellow-600';
      case 'interview': return 'text-purple-600';
      case 'rejected': return 'text-red-600';
      case 'hired': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (jobsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-lg font-bold text-lg">
                  Recrutas
                </div>
              </Link>
              <span className="ml-4 text-gray-600">Talent Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.firstName || user?.email}</span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats as any)?.activeJobs || 0}</div>
              <p className="text-xs text-muted-foreground">Jobs currently posted</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats as any)?.totalMatches || 0}</div>
              <p className="text-xs text-muted-foreground">Candidate matches found</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats as any)?.activeChats || 0}</div>
              <p className="text-xs text-muted-foreground">Ongoing conversations</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hires</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats as any)?.hires || 0}</div>
              <p className="text-xs text-muted-foreground">Successful placements</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Jobs Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Jobs Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Job Postings</h2>
                <p className="text-gray-600">Manage and track your job postings</p>
              </div>
              <Button 
                onClick={() => setShowJobWizard(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Post Job with Exam
              </Button>
            </div>

            {/* Jobs List */}
            {Array.isArray(jobs) && jobs.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs posted yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first job posting with integrated exam to start finding qualified candidates.
                  </p>
                  <Button 
                    onClick={() => setShowJobWizard(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Post Your First Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job: any) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                            {getStatusBadge(job.status)}
                            {job.hasExam && (
                              <Badge className="bg-purple-100 text-purple-800">
                                <Award className="h-3 w-3 mr-1" />
                                Has Exam
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-600 space-x-4 mb-3">
                            <span className="flex items-center">
                              <Building2 className="h-4 w-4 mr-1" />
                              {job.company}
                            </span>
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {job.location || 'Remote'}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-gray-700 line-clamp-2">{job.description}</p>
                        </div>
                        <div className="flex flex-col lg:flex-row gap-2 ml-4">
                          <Link href={`/jobs/${job.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteJob(job.id)}
                            disabled={deleteJobMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(applications) ? applications.slice(0, 5).map((app: any) => (
                    <div key={app.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{app.candidate?.firstName} {app.candidate?.lastName}</p>
                        <p className="text-xs text-gray-600">Applied to {app.job?.title}</p>
                      </div>
                      <Badge variant="outline" className={getApplicationStatusColor(app.status)}>
                        {app.status}
                      </Badge>
                    </div>
                  )) : []}
                  {(!Array.isArray(applications) || applications.length === 0) && (
                    <p className="text-sm text-gray-600 text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/candidates" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Browse Candidates
                  </Button>
                </Link>
                <Link href="/chat" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Messages
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => refetchJobs()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Job Posting Wizard */}
      {showJobWizard && (
        <JobWizard
          onSubmit={(jobData) => createJobMutation.mutate(jobData)}
          onCancel={() => setShowJobWizard(false)}
        />
      )}
    </div>
  );
}