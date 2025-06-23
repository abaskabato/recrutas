import { useState, useMemo } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRealTimeJobMatches } from "@/hooks/useRealTimeJobMatches";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Briefcase, 
  Star, 
  TrendingUp, 
  Eye, 
  Clock, 
  Building, 
  MapPin, 
  DollarSign, 
  User, 
  BookOpen, 
  MessageSquare, 
  ExternalLink,
  RefreshCw,
  Zap,
  Target,
  CheckCircle2
} from "lucide-react";

interface CandidateStats {
  totalApplications: number;
  activeMatches: number;
  profileViews: number;
  profileStrength: number;
  responseRate: number;
  avgMatchScore: number;
}

export default function OptimizedCandidateDashboard() {
  const { data: session } = useSession();
  const user = session?.user;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("matches");
  const [showExam, setShowExam] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
  const [selectedJobTitle, setSelectedJobTitle] = useState("");

  // Real-time job matches with optimized caching
  const { matches, isLoading, stats, forceRefresh } = useRealTimeJobMatches();

  // Optimized stats calculation with memoization
  const enhancedStats = useMemo(() => {
    if (!Array.isArray(matches)) {
      return {
        totalMatches: 0,
        highQuality: 0,
        withExams: 0,
        internal: 0,
        newToday: 0,
        avgScore: 0
      };
    }

    const highQualityMatches = matches.filter((m: any) => m.matchScore >= 0.8).length;
    const examJobs = matches.filter((m: any) => m.job?.hasExam).length;
    const internalJobs = matches.filter((m: any) => m.job?.source === 'internal').length;
    
    return {
      totalMatches: matches.length,
      highQuality: highQualityMatches,
      withExams: examJobs,
      internal: internalJobs,
      newToday: stats.newToday,
      avgScore: matches.length > 0 
        ? Math.round((matches.reduce((sum: number, m: any) => sum + m.matchScore, 0) / matches.length) * 100)
        : 0
    };
  }, [matches, stats.newToday]);

  // Take exam mutation
  const takeExamMutation = useMutation({
    mutationFn: async ({ jobId, jobTitle }: { jobId: number; jobTitle: string }) => {
      setSelectedJobId(jobId);
      setSelectedJobTitle(jobTitle);
      setShowExam(true);
    },
  });

  // Apply to job mutation
  const applyMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest("POST", `/api/jobs/${jobId}/apply`);
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your application has been sent successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/applications'] });
    },
  });

  // Mark as applied mutation
  const markAppliedMutation = useMutation({
    mutationFn: async (matchId: number) => {
      await apiRequest("PATCH", `/api/matches/${matchId}`, { status: "applied" });
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Job marked as applied",
      });
      forceRefresh();
    },
  });

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salary not specified";
    if (!max) return `$${min?.toLocaleString()}+`;
    if (!min) return `Up to $${max?.toLocaleString()}`;
    return `$${min?.toLocaleString()} - $${max?.toLocaleString()}`;
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.9) return "text-emerald-600 bg-emerald-50";
    if (score >= 0.8) return "text-blue-600 bg-blue-50";
    if (score >= 0.7) return "text-orange-600 bg-orange-50";
    return "text-slate-600 bg-slate-50";
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return "Just now";
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  Welcome back, {user.firstName}
                </h1>
                <p className="text-sm text-slate-600">Find your perfect job match</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => forceRefresh()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-slate-900">{enhancedStats.totalMatches}</p>
                  <p className="text-sm text-slate-600">Active Matches</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-emerald-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-slate-900">{enhancedStats.highQuality}</p>
                  <p className="text-sm text-slate-600">High Quality</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-slate-900">{enhancedStats.withExams}</p>
                  <p className="text-sm text-slate-600">With Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-slate-900">{enhancedStats.avgScore}%</p>
                  <p className="text-sm text-slate-600">Avg Match Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="matches">Job Matches ({enhancedStats.totalMatches})</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-6 mt-6">
            {isLoading ? (
              <div className="grid gap-6">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-slate-200 rounded mb-4"></div>
                      <div className="h-4 bg-slate-200 rounded mb-2"></div>
                      <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : matches.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No matches yet</h3>
                  <p className="text-slate-600">Complete your profile to get personalized job recommendations</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {matches.map((match) => (
                  <Card key={match.id} className={`transition-all duration-200 hover:shadow-md ${
                    match.job?.source === 'internal' 
                      ? 'border-blue-200 bg-blue-50/30' 
                      : 'border-slate-200'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {match.job?.title || "Unknown Position"}
                            </h3>
                            {match.job?.hasExam && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                <BookOpen className="h-3 w-3 mr-1" />
                                Exam
                              </Badge>
                            )}
                            {match.job?.source === 'internal' && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                Internal
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center text-sm text-slate-600 space-x-4 mb-3">
                            <div className="flex items-center">
                              <Building className="h-4 w-4 mr-1" />
                              {match.job?.company}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {match.job?.location || "Remote"}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {timeAgo(match.createdAt)}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <Badge className={getMatchScoreColor(match.matchScore)}>
                              {Math.round(match.matchScore * 100)}% Match
                            </Badge>
                            <span className="text-sm text-slate-600">
                              <DollarSign className="h-4 w-4 inline mr-1" />
                              {formatSalary(match.job?.salaryMin, match.job?.salaryMax)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <div className="flex space-x-3">
                          {match.job?.hasExam && (
                            <Button
                              onClick={() => takeExamMutation.mutate({
                                jobId: match.jobId,
                                jobTitle: match.job?.title || ""
                              })}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <BookOpen className="h-4 w-4 mr-2" />
                              Take Exam
                            </Button>
                          )}
                          
                          <Button
                            onClick={() => applyMutation.mutate(match.jobId)}
                            disabled={applyMutation.isPending}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Quick Apply
                          </Button>
                          
                          {match.job?.externalUrl && (
                            <Button variant="outline" asChild>
                              <a href={match.job.externalUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Job
                              </a>
                            </Button>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAppliedMutation.mutate(match.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark Applied
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Application Tracker</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">Application tracking feature coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">Profile management feature coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}