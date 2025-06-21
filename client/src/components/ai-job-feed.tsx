import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, MapPin, Building, DollarSign, Clock, ThumbsUp, ThumbsDown, Eye, ExternalLink, MessageCircle, BarChart3 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MatchBreakdown from "./match-breakdown";

interface AIJobMatch {
  id: number;
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    workType: string;
    salaryMin: number;
    salaryMax: number;
    description: string;
    requirements: string[];
    skills: string[];
    aiCurated: boolean;
    confidenceScore: number;
    externalSource?: string;
    externalUrl?: string;
  };
  matchScore: string;
  confidenceLevel: number;
  skillMatches: string[];
  aiExplanation: string;
  status: string;
  createdAt: string;
}

export default function AIJobFeed() {
  const [selectedJob, setSelectedJob] = useState<AIJobMatch | null>(null);
  const { toast } = useToast();

  const { data: aiMatches, isLoading } = useQuery<AIJobMatch[]>({
    queryKey: ['/api/ai-matches'],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  const applyMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to apply');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your application has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-matches'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Application Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ matchId, feedback }: { matchId: number; feedback: 'positive' | 'negative' }) => {
      return apiRequest('POST', `/api/matches/${matchId}/feedback`, { feedback });
    },
    onSuccess: () => {
      toast({
        title: "Feedback Recorded",
        description: "Thank you! This helps improve your job recommendations.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-matches'] });
    },
  });

  const viewJobMutation = useMutation({
    mutationFn: async (matchId: number) => {
      return apiRequest('POST', `/api/matches/${matchId}/view`, {});
    },
  });

  const handleJobView = (match: AIJobMatch) => {
    setSelectedJob(match);
    viewJobMutation.mutate(match.id);
  };

  const handleQuickApply = (match: AIJobMatch) => {
    // External job - redirect to external application
    if (match.job.externalSource) {
      window.open(match.job.externalUrl || '#', '_blank');
      return;
    }
    
    // Internal job - apply through our system
    applyMutation.mutate(match.job.id);
  };

  const handleChatNow = (match: AIJobMatch) => {
    // Create chat room for internal job and redirect to chat
    window.location.href = `/chat?jobId=${match.job.id}&matchId=${match.id}`;
  };

  const handleFeedback = (matchId: number, feedback: 'positive' | 'negative') => {
    feedbackMutation.mutate({ matchId, feedback });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Feed Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-semibold">AI-Curated Job Feed</h2>
        </div>
        <Badge variant="secondary" className="w-fit">
          {aiMatches?.length || 0} new matches
        </Badge>
      </div>

      {/* Job Cards */}
      <div className="space-y-4">
        {aiMatches?.map((match) => (
          <Card key={match.id} className="relative hover:shadow-lg transition-shadow border-l-4 border-l-primary/20">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <CardTitle className="text-base sm:text-lg">{match.job.title}</CardTitle>
                    {match.job.aiCurated && (
                      <Badge variant="secondary" className="text-xs w-fit">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Curated
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {match.job.company}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {match.job.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs sm:text-sm">
                        ${match.job.salaryMin?.toLocaleString()} - ${match.job.salaryMax?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <div className="text-xl sm:text-2xl font-bold text-primary mb-1">
                    {Math.round(match.confidenceLevel * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Match Score</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* AI Explanation */}
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg mb-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                      Why this matches you:
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {match.aiExplanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Skill Matches */}
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Matching Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {match.skillMatches?.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Match Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Match Confidence</span>
                  <span>{Math.round(match.confidenceLevel * 100)}%</span>
                </div>
                <Progress value={match.confidenceLevel * 100} className="h-2" />
              </div>

              <Separator className="my-4" />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleJobView(match)}
                    className="w-full sm:w-auto"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">View Details</span>
                    <span className="sm:hidden">View</span>
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Match Analysis</span>
                        <span className="sm:hidden">Analysis</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Match Analysis - {match.job.title}</DialogTitle>
                      </DialogHeader>
                      <MatchBreakdown 
                        match={match} 
                        job={{
                          title: match.job.title,
                          company: match.job.company,
                          skills: match.job.skills,
                          requirements: match.job.requirements,
                          location: match.job.location,
                          workType: match.job.workType,
                          salaryMin: match.job.salaryMin,
                          salaryMax: match.job.salaryMax
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                  {match.job.externalSource ? (
                    <Button
                      size="sm"
                      onClick={() => handleQuickApply(match)}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 w-full sm:w-auto"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Apply Now
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleChatNow(match)}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 w-full sm:w-auto"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat Now
                    </Button>
                  )}
                </div>

                {/* Feedback Buttons */}
                <div className="flex gap-1 justify-center sm:justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback(match.id, 'positive')}
                    disabled={feedbackMutation.isPending}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback(match.id, 'negative')}
                    disabled={feedbackMutation.isPending}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* External Source Info */}
              {match.job.externalSource && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Sourced from {match.job.externalSource} • {new Date(match.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!aiMatches || aiMatches.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your AI Job Feed is Building</h3>
            <p className="text-muted-foreground mb-4">
              Our AI is analyzing your profile to find the perfect job matches. Check back soon!
            </p>
            <Button variant="outline">
              Refresh Feed
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}