import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Bell, 
  User, 
  Plus, 
  Briefcase, 
  Users, 
  MessageSquare, 
  Handshake, 
  Edit, 
  Pause,
  Play,
  Trash2,
  Eye,
  TrendingUp,
  Target,
  Clock,
  MapPin,
  DollarSign,
  Building,
  Search,
  Filter,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageCircle
} from "lucide-react";
import RecrutasLogo from "@/components/recrutas-logo";
import RealTimeNotifications from "@/components/real-time-notifications";
import JobPostingWizard from "@/components/job-posting-wizard";
import CandidateRankingEngine from "@/components/candidate-ranking-engine";
import DirectConnectionHub from "@/components/direct-connection-hub";

interface RecruiterStats {
  activeJobs: number;
  totalMatches: number;
  activeChats: number;
  hires: number;
  pendingApplications: number;
  viewedApplications: number;
}

interface JobPosting {
  id: number;
  title: string;
  company: string;
  description: string;
  skills: string[];
  location: string;
  workType: string;
  salaryMin: number;
  salaryMax: number;
  status: 'active' | 'paused' | 'closed';
  applicationsCount: number;
  matchesCount: number;
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
  status: 'pending' | 'viewed' | 'interested' | 'rejected';
  appliedAt: string;
}

export default function RecruiterDashboardRefactored() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'candidates' | 'analytics' | 'connections'>('overview');
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [showJobPostingWizard, setShowJobPostingWizard] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [selectedJobForRanking, setSelectedJobForRanking] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

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

  // Fetch recruiter stats
  const { data: stats } = useQuery<RecruiterStats>({
    queryKey: ['/api/recruiter/stats'],
    retry: false,
    meta: {
      onError: (error: Error) => {
        if (isUnauthorizedError(error)) {
          window.location.href = "/api/login";
        }
      },
    },
  });

  // Fetch job postings
  const { data: jobs = [] } = useQuery<JobPosting[]>({
    queryKey: ['/api/jobs'],
    retry: false,
  });

  // Fetch recent candidates
  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ['/api/recruiter/candidates'],
    retry: false,
  });

  // Job creation mutation
  const createJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });
      if (!response.ok) throw new Error('Failed to create job');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recruiter/stats'] });
      setShowJobDialog(false);
      toast({
        title: "Success",
        description: "Job posting created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create job posting",
        variant: "destructive",
      });
    },
  });

  // Job status update mutation
  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: number; status: string }) => {
      const response = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update job status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recruiter/stats'] });
      toast({
        title: "Success",
        description: "Job status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      window.location.href = "/api/logout";
    },
  });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

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
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                Talent Manager
              </Badge>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <RealTimeNotifications />
              
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-purple-100 text-purple-600 text-sm font-medium">
                    {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'T'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">
                    {user?.firstName || 'Talent Manager'}
                  </p>
                  <p className="text-xs text-slate-500">Recruiter</p>
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Welcome back, {user?.firstName || 'there'}!
              </h2>
              <p className="text-slate-600">
                Manage your job postings and find the best talent.
              </p>
            </div>
            <Dialog open={showJobDialog} onOpenChange={setShowJobDialog}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Post New Job
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Job Posting</DialogTitle>
                </DialogHeader>
                <JobPostingForm onSubmit={(data) => createJobMutation.mutate(data)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Jobs</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.activeJobs || 0}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Matches</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.totalMatches || 0}</p>
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
                  <p className="text-sm font-medium text-slate-600">Active Chats</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.activeChats || 0}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Successful Hires</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.hires || 0}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Handshake className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-purple-500 text-purple-600'
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
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Briefcase className="h-4 w-4 mr-2 inline" />
              Job Postings
            </button>
            <button
              onClick={() => setActiveTab('candidates')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'candidates'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Users className="h-4 w-4 mr-2 inline" />
              Candidates
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <TrendingUp className="h-4 w-4 mr-2 inline" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'connections'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <MessageCircle className="h-4 w-4 mr-2 inline" />
              Direct Connections
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Job Performance */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-slate-600" />
                    <span>Recent Job Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {jobs && jobs.length > 0 ? (
                    <div className="space-y-4">
                      {jobs.slice(0, 5).map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900">{job.title}</h4>
                            <p className="text-sm text-slate-600">{job.company}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-slate-500">
                                {job.applicationsCount || 0} applications
                              </span>
                              <span className="text-xs text-slate-500">
                                {job.matchesCount || 0} matches
                              </span>
                            </div>
                          </div>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-500">No job postings yet</p>
                      <p className="text-sm text-slate-400">Create your first job posting to get started</p>
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
                    <Settings className="h-5 w-5 text-slate-600" />
                    <span>Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setShowJobDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Quick Job Posting
                  </Button>
                  
                  <Button 
                    className="w-full justify-start bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => setShowJobPostingWizard(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Advanced Job Wizard
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('candidates')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Review Candidates
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('analytics')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>

                  <Button 
                    className="w-full justify-start bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message Candidates
                  </Button>
                </CardContent>
              </Card>

              {/* Application Summary */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Application Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Pending Review</span>
                      <Badge variant="secondary">
                        {stats?.pendingApplications || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Under Review</span>
                      <Badge variant="outline">
                        {stats?.viewedApplications || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Interviews Scheduled</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {candidates.filter(c => c.status === 'interested').length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Job Postings</h3>
              <div className="flex items-center space-x-2">
                <Input placeholder="Search jobs..." className="w-64" />
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">{job.title}</h4>
                        <p className="text-sm text-slate-600">{job.company}</p>
                      </div>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-slate-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {job.location}
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <DollarSign className="h-4 w-4 mr-2" />
                        ${job.salaryMin?.toLocaleString()} - ${job.salaryMax?.toLocaleString()}
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <Users className="h-4 w-4 mr-2" />
                        {job.applicationsCount || 0} applications
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => setSelectedJobForRanking(job.id)}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Rank Candidates
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <div className="flex space-x-1">
                        {job.status === 'active' ? (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => updateJobStatusMutation.mutate({ jobId: job.id, status: 'paused' })}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => updateJobStatusMutation.mutate({ jobId: job.id, status: 'active' })}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'candidates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Candidate Pipeline</h3>
              <div className="flex items-center space-x-2">
                <Input placeholder="Search candidates..." className="w-64" />
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {candidates.length > 0 ? candidates.map((candidate) => (
                <Card key={candidate.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {candidate.firstName[0]}{candidate.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {candidate.firstName} {candidate.lastName}
                          </h4>
                          <p className="text-sm text-slate-600">{candidate.email}</p>
                          <p className="text-sm text-slate-500">{candidate.location}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <p className={`text-2xl font-bold ${getMatchScoreColor(candidate.matchScore)}`}>
                            {candidate.matchScore}%
                          </p>
                          <p className="text-xs text-slate-500">Match Score</p>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Message
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.slice(0, 5).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {candidate.skills.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{candidate.skills.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">No candidates yet</p>
                  <p className="text-sm text-slate-400">Candidates will appear here when they apply to your jobs</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-900">Hiring Analytics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Application Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">24%</p>
                    <p className="text-sm text-slate-500">vs last month</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Time to Hire</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">14</p>
                    <p className="text-sm text-slate-500">days average</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-600">89%</p>
                    <p className="text-sm text-slate-500">offer acceptance</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Hiring Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Applications Received</span>
                    <span className="text-sm text-slate-600">156</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Initial Screening</span>
                    <span className="text-sm text-slate-600">89</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '57%' }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Interviews</span>
                    <span className="text-sm text-slate-600">34</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '22%' }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Offers Made</span>
                    <span className="text-sm text-slate-600">12</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '8%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Direct Connections</h3>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                Real-time messaging enabled
              </Badge>
            </div>
            
            <DirectConnectionHub 
              hiringManagerId={user?.id || "hiring-manager-1"}
              onConnectionUpdate={(connection) => {
                toast({
                  title: "Connection Updated",
                  description: `Status changed for ${connection.candidate.firstName} ${connection.candidate.lastName}`,
                });
              }}
            />
          </div>
        )}
      </div>

      {/* Job Posting Wizard Dialog */}
      <Dialog open={showJobPostingWizard} onOpenChange={setShowJobPostingWizard}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advanced Job Posting Wizard</DialogTitle>
          </DialogHeader>
          <JobPostingWizard 
            onSubmit={(jobData) => {
              createJobMutation.mutate(jobData);
            }}
            onCancel={() => setShowJobPostingWizard(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Candidate Ranking Engine Modal for Job Selection */}
      {selectedJobForRanking && (
        <Dialog open={!!selectedJobForRanking} onOpenChange={() => setSelectedJobForRanking(null)}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Candidate Ranking & Scoring Engine</DialogTitle>
            </DialogHeader>
            <CandidateRankingEngine 
              jobId={selectedJobForRanking}
              onCandidateSelect={(candidate) => {
                setSelectedCandidate(candidate);
                toast({
                  title: "Candidate Selected",
                  description: `Viewing profile for ${candidate.candidate.firstName} ${candidate.candidate.lastName}`,
                });
              }}
              onDirectConnect={(candidate) => {
                setSelectedJobForRanking(null);
                setActiveTab('connections');
                toast({
                  title: "Direct Connection Initiated",
                  description: `Connected with ${candidate.candidate.firstName} ${candidate.candidate.lastName}`,
                });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Job Posting Form Component
function JobPostingForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    skills: '',
    location: '',
    workType: '',
    salaryMin: '',
    salaryMax: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      skills: formData.skills.split(',').map(s => s.trim()),
      salaryMin: parseInt(formData.salaryMin),
      salaryMax: parseInt(formData.salaryMax),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Job Title</label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g. Senior Software Engineer"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Company</label>
          <Input
            value={formData.company}
            onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
            placeholder="e.g. Tech Corp"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Job description and requirements..."
          rows={4}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Skills (comma-separated)</label>
        <Input
          value={formData.skills}
          onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
          placeholder="e.g. JavaScript, React, Node.js"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="e.g. San Francisco, CA"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Work Type</label>
          <Select 
            value={formData.workType} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, workType: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select work type" />
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
        <div>
          <label className="block text-sm font-medium mb-2">Min Salary</label>
          <Input
            type="number"
            value={formData.salaryMin}
            onChange={(e) => setFormData(prev => ({ ...prev, salaryMin: e.target.value }))}
            placeholder="e.g. 80000"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Max Salary</label>
          <Input
            type="number"
            value={formData.salaryMax}
            onChange={(e) => setFormData(prev => ({ ...prev, salaryMax: e.target.value }))}
            placeholder="e.g. 120000"
            required
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
          Create Job Posting
        </Button>
      </div>
    </form>
  );
}