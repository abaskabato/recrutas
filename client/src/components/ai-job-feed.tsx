import { useState, useMemo, useRef } from "react";
import { useVirtualizer } from '@tanstack/react-virtual';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Building, Filter, ExternalLink, Briefcase, Bookmark, EyeOff, Check, Star, Sparkles, Shield, BadgeCheck, ChevronDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import AIMatchBreakdownModal from "./AIMatchBreakdownModal";
import { useToast } from "@/hooks/use-toast";

export interface AIJobMatch {
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
    postedDate?: string;
    trustScore?: number;
    livenessStatus?: 'active' | 'stale' | 'unknown';
  };
  matchScore: string;
  confidenceLevel: number;
  skillMatches: string[];
  aiExplanation: string;
  status: string;
  createdAt: string;
  // PRD fields
  isVerifiedActive?: boolean;
  isDirectFromCompany?: boolean;
}

const INITIAL_JOB_LIMIT = 15;
const JOBS_PER_PAGE = 10;

interface AIJobFeedProps {
  onUploadClick?: () => void;
}

export default function AIJobFeed({ onUploadClick }: AIJobFeedProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [selectedMatch, setSelectedMatch] = useState<AIJobMatch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const [displayLimit, setDisplayLimit] = useState(INITIAL_JOB_LIMIT);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: filteredMatches, isLoading } = useQuery<AIJobMatch[]>({
    queryKey: ['/api/ai-matches', searchTerm, locationFilter, workTypeFilter, companyFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (locationFilter !== 'all') params.append('location', locationFilter);
      if (workTypeFilter !== 'all') params.append('workType', workTypeFilter);
      if (companyFilter !== 'all') params.append('company', companyFilter);

      const url = `/api/ai-matches?${params.toString()}`;
      const response = await apiRequest("GET", url);
      return response.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const { data: userJobActions } = useQuery({
    queryKey: ['/api/candidate/job-actions'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/candidate/job-actions');
      const data = await response.json();
      return {
        saved: new Set<number>(data.saved),
        applied: new Set<number>(data.applied),
      };
    },
  });

  const savedJobIds = userJobActions?.saved ?? new Set();
  const appliedJobIds = userJobActions?.applied ?? new Set();

  const applyMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest("POST", `/api/candidate/apply/${jobId}`, {}),
    onSuccess: (data, variables) => {
      toast({ title: "Application Tracked!", description: "We've marked this job as applied." });
      queryClient.setQueryData(['userJobActions'], (oldData: any) => ({
        ...oldData,
        applied: new Set(oldData.applied).add(variables),
      }));
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest("POST", '/api/candidate/saved-jobs', { jobId }),
    onMutate: async (jobId: number) => {
      await queryClient.cancelQueries({ queryKey: ['/api/candidate/job-actions'] });
      const previousJobActions = queryClient.getQueryData(['/api/candidate/job-actions']);
      queryClient.setQueryData(['/api/candidate/job-actions'], (oldData: any) => ({
        ...oldData,
        saved: new Set(oldData.saved).add(jobId),
      }));
      return { previousJobActions };
    },
    onSuccess: () => {
      toast({ title: "Job Saved!" });
    },
    onError: (err, variables, context) => {
      if (context?.previousJobActions) {
        queryClient.setQueryData(['/api/candidate/job-actions'], context.previousJobActions);
      }
      toast({ title: "Error", description: "Failed to save job.", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/job-actions'] });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest("DELETE", `/api/candidate/saved-jobs/${jobId}`),
    onMutate: async (jobId: number) => {
      await queryClient.cancelQueries({ queryKey: ['/api/candidate/job-actions'] });
      const previousJobActions = queryClient.getQueryData(['/api/candidate/job-actions']);
      queryClient.setQueryData(['/api/candidate/job-actions'], (oldData: any) => {
        const newSaved = new Set(oldData.saved);
        newSaved.delete(jobId);
        return { ...oldData, saved: newSaved };
      });
      return { previousJobActions };
    },
    onSuccess: () => {
      toast({ title: "Job Unsaved" });
    },
    onError: (err, variables, context) => {
      if (context?.previousJobActions) {
        queryClient.setQueryData(['/api/candidate/job-actions'], context.previousJobActions);
      }
      toast({ title: "Error", description: "Failed to unsave job.", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/job-actions'] });
    },
  });

  const hideMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest("POST", '/api/candidate/hidden-jobs', { jobId }),
    onMutate: async (jobId: number) => {
      await queryClient.cancelQueries({ queryKey: ['/api/ai-matches', searchTerm, locationFilter, workTypeFilter, companyFilter] });
      const previousMatches = queryClient.getQueryData(['/api/ai-matches', searchTerm, locationFilter, workTypeFilter, companyFilter]);
      queryClient.setQueryData(['/api/ai-matches', searchTerm, locationFilter, workTypeFilter, companyFilter], (oldData: any) => 
        oldData.filter((match: AIJobMatch) => match.job.id !== jobId)
      );
      return { previousMatches };
    },
    onSuccess: () => {
      toast({ title: "Job Hidden", description: "You won't see this job in your feed anymore." });
    },
    onError: (err, variables, context) => {
      if (context?.previousMatches) {
        queryClient.setQueryData(['/api/ai-matches', searchTerm, locationFilter, workTypeFilter, companyFilter], context.previousMatches);
      }
      toast({ title: "Error", description: "Failed to hide job.", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-matches', searchTerm, locationFilter, workTypeFilter, companyFilter] });
    },
  });

  const handleApply = (e: React.MouseEvent, match: AIJobMatch) => {
    e.stopPropagation();
    if (appliedJobIds.has(match.job.id)) return;
    applyMutation.mutate(match.job.id);
    if (match.job.externalUrl) {
      window.open(match.job.externalUrl, '_blank');
    }
  };

  const handleSaveToggle = (e: React.MouseEvent, match: AIJobMatch) => {
    e.stopPropagation();
    if (savedJobIds.has(match.job.id)) {
      unsaveMutation.mutate(match.job.id);
    } else {
      saveMutation.mutate(match.job.id);
    }
  };

  const handleHide = (e: React.MouseEvent, match: AIJobMatch) => {
    e.stopPropagation();
    hideMutation.mutate(match.job.id);
  };

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredMatches?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  const locations = useMemo(() => [...new Set((filteredMatches || []).map(m => m.job.location).filter(Boolean))], [filteredMatches]);
  const companies = useMemo(() => [...new Set((filteredMatches || []).map(m => m.job.company).filter(Boolean))], [filteredMatches]);
  const workTypes = useMemo(() => [...new Set((filteredMatches || []).map(m => m.job.workType).filter(Boolean))], [filteredMatches]);

  const clearFilters = () => {
    setSearchTerm("");
    setLocationFilter("all");
    setWorkTypeFilter("all");
    setCompanyFilter("all");
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border">
        {/* ... filter JSX ... */}
      </div>

      {/* Job Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !filteredMatches || filteredMatches.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>No job matches found yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Job count summary */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Showing {Math.min(displayLimit, filteredMatches.length)} of {filteredMatches.length} matches</span>
          </div>

          <div className="space-y-4 max-h-[calc(100vh-350px)] overflow-y-auto">
            {filteredMatches.slice(0, displayLimit).map((match) => {
              const isSaved = savedJobIds.has(match.job.id);
              const isApplied = appliedJobIds.has(match.job.id);
              // Determine trust badges
              const isVerifiedActive = match.isVerifiedActive || (match.job.trustScore && match.job.trustScore >= 85 && match.job.livenessStatus === 'active');
              const isDirectFromCompany = match.isDirectFromCompany || match.job.externalSource === 'internal' || match.job.externalSource === 'platform';

              return (
                <div key={match.id}>
                  <Card className="hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-150">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {match.job.aiCurated && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI Curated
                              </Badge>
                            )}
                            {/* PRD: Trust badges */}
                            {isVerifiedActive && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                <BadgeCheck className="h-3 w-3 mr-1" />
                                Verified Active
                              </Badge>
                            )}
                            {isDirectFromCompany && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                                <Shield className="h-3 w-3 mr-1" />
                                Direct from Company
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">Match: {match.matchScore}</span>
                          </div>
                          <h3 className="font-semibold text-lg truncate hover:text-blue-600 transition-colors">
                            <button
                              type="button"
                              className="text-left hover:underline"
                              onClick={() => setExpandedMatchId(expandedMatchId === match.id ? null : match.id)}
                            >
                              {match.job.title}
                            </button>
                          </h3>
                          <div className="flex items-center gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                            <div className="flex items-center">
                              <Building className="h-4 w-4 mr-1" /> {match.job.company}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" /> {match.job.location}
                            </div>
                            <div className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-1" /> {match.job.workType}
                            </div>
                          </div>

                          {/* PRD: "Why You're a Match" explanation */}
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-blue-600 dark:text-blue-400">Why you match:</span>{' '}
                            {match.aiExplanation || (match.skillMatches && match.skillMatches.length > 0
                              ? `Strong match for ${match.skillMatches.slice(0, 2).join(' & ')}`
                              : 'Skills and experience align with this role')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <Button
                            size="sm"
                            variant={isApplied ? "secondary" : "default"}
                            onClick={(e) => handleApply(e, match)}
                            disabled={isApplied}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {isApplied ? <Check className="h-4 w-4 mr-2" /> : null}
                            {isApplied ? "Applied" : "Apply"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleSaveToggle(e, match)}
                          >
                            <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current text-yellow-500" : ""}`} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleHide(e, match)}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); setSelectedMatch(match); setIsModalOpen(true); }}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {match.job.externalSource && match.job.externalSource !== 'internal' && (
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Via {match.job.externalSource}
                            {match.job.postedDate && (
                              <span className="ml-2">• Posted {new Date(match.job.postedDate).toLocaleDateString()}</span>
                            )}
                          </div>
                          {match.job.externalUrl && (
                            <a
                              href={match.job.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Original Post
                            </a>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* PRD: Load More button for pagination */}
          {filteredMatches.length > displayLimit && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setDisplayLimit(prev => prev + JOBS_PER_PAGE)}
                className="w-full max-w-xs"
              >
                <ChevronDown className="h-4 w-4 mr-2" />
                Load More ({filteredMatches.length - displayLimit} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
      <AIMatchBreakdownModal
        match={selectedMatch}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}

