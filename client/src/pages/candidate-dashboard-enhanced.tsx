import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RealTimeChat from "@/components/real-time-chat";
import AdvancedNotificationCenter from "@/components/advanced-notification-center";
import InstantJobSearch from "@/components/instant-job-search";
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
import { useToast } from "@/hooks/use-toast";

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

export default function CandidateDashboardEnhanced() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedChatRoom, setSelectedChatRoom] = useState<number | undefined>();
  const [showChat, setShowChat] = useState(false);
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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
        throw new Error('Upload failed');
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
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.type.includes('word')) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document",
          variant: "destructive",
        });
      }
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
      return apiRequest("POST", `/api/candidates/apply/${jobId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Application Failed",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'viewed': return 'bg-yellow-100 text-yellow-800';
      case 'interested': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'screening': return 'bg-purple-100 text-purple-800';
      case 'interview': return 'bg-orange-100 text-orange-800';
      default: return 'bg-slate-100 text-slate-800';
    }
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

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `$${(min/1000).toFixed(0)}k - $${(max/1000).toFixed(0)}k`;
    if (min) return `$${(min/1000).toFixed(0)}k+`;
    return `Up to $${(max!/1000).toFixed(0)}k`;
  };

  const handleStartChat = (matchId: number) => {
    setSelectedChatRoom(matchId);
    setShowChat(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {user?.email?.[0]?.toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  Welcome back, {user?.email?.split('@')[0] || 'Candidate'}
                </h1>
                <p className="text-sm text-slate-500">
                  Let's find your next opportunity
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <AdvancedNotificationCenter />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowResumeUpload(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Resume
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowChat(!showChat)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Messages
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Use the proper logout endpoint
                  window.location.href = '/api/logout';
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="matches">Matches</TabsTrigger>
                <TabsTrigger value="applications">Applications</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500">Total Applications</p>
                          <p className="text-2xl font-bold text-slate-900">
                            {statsLoading ? '-' : stats?.totalApplications || 0}
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
                          <p className="text-sm font-medium text-slate-500">Active Matches</p>
                          <p className="text-2xl font-bold text-slate-900">
                            {statsLoading ? '-' : stats?.activeMatches || 0}
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
                          <p className="text-sm font-medium text-slate-500">Profile Views</p>
                          <p className="text-2xl font-bold text-slate-900">
                            {statsLoading ? '-' : stats?.profileViews || 0}
                          </p>
                        </div>
                        <Eye className="w-8 h-8 text-green-600" />
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
                          <div key={match.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900">{match.job.title}</h4>
                              <p className="text-sm text-slate-500">{match.job.company}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <Badge variant="secondary">
                                  {match.matchScore}% match
                                </Badge>
                                <div className="flex items-center space-x-1 text-xs text-slate-500">
                                  <MapPin className="w-3 h-3" />
                                  <span>{match.job.location}</span>
                                </div>
                              </div>
                            </div>
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
                                Apply
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
                    <div className="flex items-center justify-between">
                      <CardTitle>Job Matches</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Filter className="w-4 h-4 mr-2" />
                          Filter
                        </Button>
                        <Button variant="outline" size="sm">
                          <Search className="w-4 h-4 mr-2" />
                          Search
                        </Button>
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
              <div className="sticky top-8">
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
    </div>
  );
}