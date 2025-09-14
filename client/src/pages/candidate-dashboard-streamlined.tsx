import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSession, signOut } from "@/lib/auth-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  getStatusColor, 
  formatSalary, 
  formatWorkType, 
  timeAgo 
} from "@/lib/dashboard-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RealTimeChat from "@/components/real-time-chat";
import AdvancedNotificationCenter from "@/components/advanced-notification-center";
import InstantJobSearch from "@/components/instant-job-search";
import EnhancedProfileCompletion from "@/components/enhanced-profile-completion";
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
  ExternalLink,
  Settings,
  BookOpen
} from "lucide-react";
import { 
  JobMatchCard, 
  ApplicationCard, 
  ActivityItem, 
  EmptyState, 
  LoadingSkeleton 
} from "@/components/candidate-dashboard-components";
import ApplicationIntelligenceDemo from "@/components/application-intelligence-demo";

interface CandidateStats {
  totalApplications: number;
  activeMatches: number;
  profileViews: number;
  profileStrength: number;
  responseRate: number;
  avgMatchScore: number;
  newMatches: number;
  activeChats: number;
}

interface JobMatch {
  id: number;
  jobId: number;
  candidateId: string;
  matchScore: string;
  status: string;
  createdAt: string;
  aiExplanation?: string;
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    description: string;
    workType: string;
    salaryMin?: number;
    salaryMax?: number;
    source: string;
    externalUrl?: string;
    careerPageUrl?: string;
    hasExam?: boolean;
  };
  recruiter?: {
    firstName: string;
    lastName: string;
  };
}

interface Application {
  id: number;
  jobId: number;
  status: string;
  appliedAt: string;
  job: {
    title: string;
    company: string;
    location: string;
  };
}

interface Activity {
  id: number;
  description: string;
  createdAt: string;
}

export default function CandidateStreamlinedDashboard() {
  const { data: session } = useSession();
  const user = session?.user;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [showChat, setShowChat] = useState(false);
  const [selectedChatRoom, setSelectedChatRoom] = useState<number | undefined>(undefined);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [showExam, setShowExam] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>(undefined);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("");
  const [appliedJobsSet, setAppliedJobsSet] = useState<Set<string>>(new Set());
  const [continuationJob, setContinuationJob] = useState<any>(null);
  const [selectedMatch, setSelectedMatch] = useState<JobMatch | null>(null);

  // Track applied external jobs in localStorage using stable identifiers
  const getAppliedJobs = (): Set<string> => {
    if (typeof window === 'undefined') return new Set<string>();
    const stored = localStorage.getItem(`appliedJobs_${user?.id}`);
    return new Set<string>(stored ? JSON.parse(stored) : []);
  };

  const getJobStableId = (match: any) => {
    // For external jobs, use company + title + location as stable identifier
    if (match.job?.source === 'external' || match.job?.externalUrl) {
      return `${match.job?.company || 'unknown'}-${match.job?.title || 'unknown'}-${match.job?.location || 'unknown'}`.replace(/\s+/g, '-').toLowerCase();
    }
    // For internal jobs, use the actual match ID
    return match.id.toString();
  };

  const markJobAsApplied = (match: any) => {
    if (typeof window === 'undefined') return;
    const appliedJobs = getAppliedJobs();
    const stableId = getJobStableId(match);
    appliedJobs.add(stableId);
    localStorage.setItem(`appliedJobs_${user?.id}`, JSON.stringify(Array.from(appliedJobs)));
    // Update state to trigger re-render
    setAppliedJobsSet(new Set<string>(appliedJobs));
  };

  const isJobApplied = (match: any) => {
    const stableId = getJobStableId(match);
    return appliedJobsSet.has(stableId);
  };

  // Handle continuing a job application from localStorage
  const handleContinueJobApplication = (jobData: any) => {
    console.log('Continue button clicked! Job data:', jobData);
    console.log('External URL:', jobData.externalUrl);
    
    setContinuationJob(null);
    localStorage.removeItem('continuationJob');
    sessionStorage.removeItem('pendingJobApplication');
    
    // If it's an external job, open the external URL
    if (jobData.externalUrl) {
      console.log('Opening external URL:', jobData.externalUrl);
      window.open(jobData.externalUrl, '_blank');
      
      // Show success toast
      toast({
        title: "Continuing Application",
        description: `Opening ${jobData.jobData.title} at ${jobData.jobData.company}`,
      });
    } else {
      console.log('No external URL found in job data');
      // For internal jobs, navigate to the job details
      toast({
        title: "Job Continued",
        description: `Continuing with ${jobData.jobData.title} at ${jobData.jobData.company}`,
      });
    }
  };

  // Initialize applied jobs set from localStorage when user loads
  useEffect(() => {
    if (user?.id) {
      setAppliedJobsSet(new Set<string>(getAppliedJobs()));
    }
  }, [user?.id]);

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
            
            // Show a clickable toast notification about continuing the job application
            toast({
              title: "Continue Job Application",
              description: `Click here to continue applying to ${jobData.jobData.title} at ${jobData.jobData.company}`,
              duration: 10000, // Keep visible longer
              onClick: () => handleContinueJobApplication(jobData),
              action: (
                <Button 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContinueJobApplication(jobData);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Continue
                </Button>
              ),
            });
          } else {
            // Clean up old continuation data
            localStorage.removeItem('continuationJob');
            sessionStorage.removeItem('pendingJobApplication');
          }
        } catch (error) {
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
                onClick={() => {
                  // Scroll to job matches section
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-primary hover:bg-primary/90"
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

  // Handle continuation from instant modal
  useEffect(() => {
    if (user?.id) {
      // Check for pending job application from instant modal
      const pendingJob = sessionStorage.getItem('pendingJobApplication');
      const continuationJob = localStorage.getItem('continuationJob');
      
      if (pendingJob) {
        try {
          const jobData = JSON.parse(pendingJob);
          sessionStorage.removeItem('pendingJobApplication');
          
          toast({
            title: "Welcome back!",
            description: `Ready to continue with your application to ${jobData.title} at ${jobData.company}?`,
            duration: 5000,
          });
        } catch (error) {
          console.error('Error parsing pending job data:', error);
        }
      }
      
      if (continuationJob) {
        try {
          const jobData = JSON.parse(continuationJob);
          // Check if job is recent (within 1 hour)
          if (Date.now() - jobData.timestamp < 3600000) {
            localStorage.removeItem('continuationJob');
            
            toast({
              title: "Let's continue where you left off",
              description: `You were interested in ${jobData.jobData?.title} at ${jobData.jobData?.company}. Check your matches to apply!`,
              duration: 6000,
            });
          }
        } catch (error) {
          console.error('Error parsing continuation job data:', error);
        }
      }
    }
  }, [user?.id, toast]);

  // Fetch candidate stats
  const { data: stats } = useQuery<CandidateStats>({
    queryKey: ['/api/candidates/stats'],
  });

  // Fetch matches
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

  // Apply to job mutation
  const applyToJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest("POST", `/api/candidates/apply/${jobId}`, {});
      if (!response.ok) {
        throw new Error('Failed to apply to job');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/matches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/stats'] });
    },
    onError: () => {
      toast({
        title: "Application Failed",
        description: "Unable to submit application. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mark external application mutation
  const markExternalApplicationMutation = useMutation({
    mutationFn: async (matchId: string | number) => {
      const response = await apiRequest("POST", `/api/candidates/mark-applied/${matchId}`, {});
      if (!response.ok) {
        throw new Error('Failed to mark as applied');
      }
      return { matchId, ...(await response.json()) };
    },
    onSuccess: (data, variables) => {
      // Find the match object to mark as applied
      const currentMatches = queryClient.getQueryData(['/api/candidates/matches']) as any[];
      const match = currentMatches?.find(m => m.id === variables);
      
      if (match) {
        // Mark job as applied in localStorage for persistence
        markJobAsApplied(match);
        
        // Update the local cache immediately
        queryClient.setQueryData(['/api/candidates/matches'], (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.map((m: any) => 
            m.id === variables ? { ...m, status: 'applied' } : m
          );
        });
      }
      
      toast({
        title: "Marked as Applied",
        description: "We've noted that you applied to this position.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/matches'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle exam taking - navigate to dedicated exam page
  const handleTakeExam = (jobId: number, jobTitle: string) => {
    const encodedTitle = encodeURIComponent(jobTitle);
    setLocation(`/exam/${jobId}/${encodedTitle}`);
  };

  // Handle exam completion
  const handleExamComplete = (score: number, passed: boolean) => {
    setShowExam(false);
    
    if (passed) {
      toast({
        title: "Exam Passed!",
        description: `You scored ${score}%. You can now chat with the hiring manager.`,
      });
      // Refresh matches to update status
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/matches'] });
    } else {
      toast({
        title: "Exam Complete",
        description: `You scored ${score}%. Unfortunately, this didn't meet the passing threshold.`,
        variant: "destructive",
      });
    }
  };

  // Chat initiation mutation (only for internal jobs after screening)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'screening': return <AlertCircle className="w-4 h-4" />;
      case 'interview': return <MessageSquare className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 sm:py-0 sm:h-16 gap-4 sm:gap-0">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.email?.[0]?.toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                  Welcome back, {user?.email?.split('@')[0] || 'Candidate'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
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
                onClick={() => setShowProfileCompletion(true)}
                className="flex-shrink-0"
              >
                <User className="w-4 h-4 mr-1" />
                Profile
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => signOut()}
                className="flex-shrink-0"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`grid gap-6 ${showChat ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          <div className={showChat ? 'lg:col-span-2' : 'lg:col-span-1'}>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Applications</p>
                      <p className="text-lg font-semibold">{stats?.totalApplications || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Active Matches</p>
                      <p className="text-lg font-semibold">{stats?.activeMatches || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Profile Views</p>
                      <p className="text-lg font-semibold">{stats?.profileViews || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Match</p>
                      <p className="text-lg font-semibold">{stats?.avgMatchScore || 0}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Job Continuation Card */}
            {continuationJob && (
              <Card className="mb-6 border-primary bg-primary/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      <div>
                        <h3 className="font-semibold text-primary">Continue Job Application</h3>
                        <p className="text-sm text-primary/80">
                          Complete your application to {continuationJob.jobData?.title} at {continuationJob.jobData?.company}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleContinueJobApplication(continuationJob)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Continue Application
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Tabs */}
            <Tabs defaultValue="matches" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="matches">Job Matches</TabsTrigger>
                <TabsTrigger value="applications">Applications</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              {/* Job Matches Tab */}
              <TabsContent value="matches" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Matched Jobs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {matchesLoading ? (
                      <LoadingSkeleton count={3} />
                    ) : matches?.length > 0 ? (
                      <div className="space-y-4">
                        {matches.filter(match => match.status !== 'applied' && !isJobApplied(match) && match.job).map((match) => {
                          // Only render if match.job exists
                          if (!match.job) return null;
                          
                          // Debug SDE job data
                          if (match.job?.title === 'SDE') {
                            console.log('DEBUG: SDE Job on frontend:', {
                              id: match.id,
                              jobId: match.jobId,
                              title: match.job?.title,
                              hasExam: match.job?.hasExam,
                              source: match.job?.source,
                              company: match.job?.company
                            });
                          }
                          
                          return (
                            <div key={match.id} className={`border rounded-lg p-6 transition-colors ${
                              match.job?.source === 'internal' 
                                ? 'border-primary/20 bg-primary/5' 
                                : 'border-border hover:border-orange-500/50'
                            }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  {(() => {
                                    if (match.job?.title === 'SDE') {
                                      console.log('SDE Badge Logic:', {
                                        source: match.job?.source,
                                        sourceCheck: match.job?.source === 'internal',
                                        hasExam: match.job?.hasExam,
                                        examCheck: match.job?.source === 'internal' && match.job?.hasExam
                                      });
                                    }
                                    return match.job?.source === 'internal' ? (
                                      <Badge className="bg-primary/10 text-primary border-primary/20">
                                        🎯 Platform Job
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                        🌐 External
                                      </Badge>
                                    );
                                  })()}
                                  {match.job?.source === 'internal' && match.job?.hasExam && (
                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                                      📝 Has Exam
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                                    {match.matchScore}% match
                                  </Badge>
                                  <Badge className={getStatusColor(match.status)}>
                                    {getStatusIcon(match.status)}
                                    <span className="ml-1 capitalize">{match.status}</span>
                                  </Badge>
                                </div>
                                <h3 className="font-semibold text-lg text-foreground mb-2">
                                  {match.job?.title || 'Job Title Unavailable'}
                                </h3>
                                
                                <div className="flex items-center space-x-1 text-muted-foreground mb-2">
                                  <Building className="w-4 h-4" />
                                  <span className="font-medium">{match.job?.company || 'Company Unavailable'}</span>
                                </div>
                                
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{match.job?.location || 'Location Unavailable'}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="w-4 h-4" />
                                    <span>{formatSalary(match.job?.salaryMin, match.job?.salaryMax)}</span>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {match.job?.workType || 'Remote'}
                                  </Badge>
                                </div>
                                
                                {match.job?.source === 'internal' && match.recruiter && (
                                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <User className="w-4 h-4" />
                                    <span>{match.recruiter.firstName} {match.recruiter.lastName}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col items-end space-y-2">
                                <div className="flex items-center space-x-2">
                                  {match.job?.source === 'internal' ? (
                                    // Internal jobs: Apply first, then exam, then chat after AI ranking
                                    <>
                                      {match.status === 'pending' && (
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            // For jobs with exams, go directly to exam
                                            if (match.job?.hasExam) {
                                              handleTakeExam(match.jobId, match.job.title);
                                            } else {
                                              applyToJobMutation.mutate(match.jobId);
                                            }
                                          }}
                                          disabled={applyToJobMutation.isPending}
                                          className={match.job?.hasExam ? "bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg border-2 border-purple-500" : ""}
                                        >
                                          {match.job?.hasExam ? '📝 Take Exam' : 'Apply Now'}
                                        </Button>
                                      )}
                                      {match.status === 'applied' && match.job?.hasExam && (
                                        <Button
                                          size="sm"
                                          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg border-2 border-purple-500"
                                          onClick={() => handleTakeExam(match.jobId, match.job.title)}
                                        >
                                          📝 Take Exam
                                        </Button>
                                      )}
                                      {match.status === 'applied' && !match.job?.hasExam && (
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
                                        onClick={() => window.open(match.job?.externalUrl || match.job?.careerPageUrl, '_blank')}
                                      >
                                        <ExternalLink className="w-4 h-4 mr-1" />
                                        View Job
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => markExternalApplicationMutation.mutate(match.id)}
                                        disabled={match.status === 'applied' || isJobApplied(match) || markExternalApplicationMutation.isPending}
                                      >
                                        {match.status === 'applied' || isJobApplied(match) ? 'Applied' : 'Mark Applied'}
                                      </Button>
                                    </>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Matched {new Date(match.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState
                        icon={Star}
                        title="Discover Live Job Opportunities"
                        description="Search thousands of real job openings from top companies"
                      >
                        <InstantJobSearch />
                      </EmptyState>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Applications Tab - Revolutionary Transparency & Feedback */}
              <TabsContent value="applications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Applications</CardTitle>
                    <CardDescription>Track your job applications and their status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {matchesLoading ? (
                      <LoadingSkeleton count={3} />
                    ) : (() => {
                      const appliedJobs = matches?.filter(match => (match.status === 'applied' || isJobApplied(match)) && match.job) || [];
                      return appliedJobs.length > 0 ? (
                        <div className="space-y-4">
                          {appliedJobs.map((match) => {
                            // Only render if match.job exists
                            if (!match.job) return null;
                            return (
                            <div key={match.id} className="border rounded-lg p-6 bg-green-500/10 border-green-500/20">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-medium text-foreground">
                                      {match.job?.title || 'Job Title'}
                                    </h3>
                                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                                      Applied
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-1">
                                    {match.job?.company || 'Company Name'} • {match.job?.location || 'Location'}
                                  </p>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {match.job?.workType || 'Work Type'} • 
                                    {match.job?.salaryMin && match.job?.salaryMax && ` $${match.job.salaryMin.toLocaleString()} - $${match.job.salaryMax.toLocaleString()}`}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="font-medium text-purple-500">
                                      {match.matchScore}% match
                                    </span>
                                    <span>•</span>
                                    <span>Applied {new Date(match.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  {match.job?.source === 'external' && match.job?.externalUrl && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(match.job.externalUrl, '_blank')}
                                    >
                                      <ExternalLink className="w-4 h-4 mr-1" />
                                      View Original
                                    </Button>
                                  )}

                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <EmptyState
                          icon={Briefcase}
                          title="No Applications Yet"
                          description="Start applying to jobs from your matches to track them here"
                        />
                      );
                    })()}
                  </CardContent>
                </Card>
                
                {/* Application Intelligence - shows authentic transparency data */}
                <ApplicationIntelligenceDemo />
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
                            <div className="h-16 bg-muted rounded"></div>
                          </div>
                        ))}
                      </div>
                    ) : activities?.length > 0 ? (
                      <div className="space-y-4">
                        {activities.map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-3 p-3 border-l-4 border-l-primary bg-primary/5 rounded-r">
                            <div className="flex-1">
                              <p className="text-sm text-foreground">{activity.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(activity.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No recent activity</p>
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

      {/* Enhanced Profile Completion Modal */}
      {showProfileCompletion && user && (
        <EnhancedProfileCompletion
          user={user}
          onComplete={() => {
            setShowProfileCompletion(false);
            queryClient.invalidateQueries({ queryKey: ['/api/session'] });
            queryClient.invalidateQueries({ queryKey: ['/api/candidates/matches'] });
            queryClient.invalidateQueries({ queryKey: ['/api/candidates/stats'] });
          }}
          onCancel={() => setShowProfileCompletion(false)}
        />
      )}

      {/* Job Exam Modal */}
      {showExam && selectedJobId && (
        <JobExam
          jobId={selectedJobId}
          onComplete={() => {
            setShowExam(false);
            queryClient.invalidateQueries({ queryKey: ['/api/candidates/matches'] });
            toast({
              title: "Exam Completed",
              description: "Your exam has been submitted for review.",
            });
          }}
          onCancel={() => setShowExam(false)}
        />
      )}
    </div>
  );
}
