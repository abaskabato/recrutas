import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useVirtualizer } from '@tanstack/react-virtual';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Building, Filter, ExternalLink, Briefcase, Bookmark, EyeOff, Check, Sparkles, Shield, BadgeCheck, ChevronDown, RotateCcw, Bot, Clock, FileText, Upload, Loader2, Layers } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import AIMatchBreakdownModal from "./AIMatchBreakdownModal";
import { useToast } from "@/hooks/use-toast";

type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

function inferJobLevel(title: string): ExperienceLevel {
  const t = (title || '').toLowerCase();
  if (/director|vp|vice president|head of|chief|cto|ceo/i.test(t)) return 'executive';
  if (/lead|manager|principal/i.test(t)) return 'lead';
  if (/senior|sr\.|staff/i.test(t)) return 'senior';
  if (/junior|entry|intern|associate|new grad/i.test(t)) return 'entry';
  return 'mid';
}

const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior',
  lead: 'Lead',
  executive: 'Executive',
};

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
    hasExam?: boolean;
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
  section?: 'applyAndKnowToday' | 'matchedForYou';
}

interface SectionedResponse {
  applyAndKnowToday: AIJobMatch[];
  matchedForYou: AIJobMatch[];
}

const INITIAL_JOB_LIMIT = 20;
const JOBS_PER_PAGE = 20;

interface AIJobFeedProps {
  onUploadClick?: () => void;
}

export default function AIJobFeed({ onUploadClick }: AIJobFeedProps) {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [experienceLevelFilter, setExperienceLevelFilter] = useState("all");
  const [selectedMatch, setSelectedMatch] = useState<AIJobMatch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(INITIAL_JOB_LIMIT);
  const [agentApplyingIds, setAgentApplyingIds] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Read candidate profile from cache (parent dashboard already fetches it)
  const cachedProfile = queryClient.getQueryData<any>(['/api/candidate/profile']);
  const hasSkills = Array.isArray(cachedProfile?.skills) && cachedProfile.skills.length > 0;

  // Track retries when matches come back empty (backend still computing)
  const emptyRetryCount = useRef(0);
  const MAX_EMPTY_RETRIES = 6; // ~30s of retrying (6 × 5s)
  const [waitingForMatches, setWaitingForMatches] = useState(false);

  // Fetch all matches once — filters applied client-side for instant interaction
  const { data: allMatches, isLoading, isFetching, refetch } = useQuery<AIJobMatch[]>({
    queryKey: ['/api/ai-matches'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/ai-matches');
      const data = await response.json();

      // Handle sectioned response: { applyAndKnowToday, matchedForYou }
      if (data && !Array.isArray(data) && data.applyAndKnowToday) {
        const sectioned = data as SectionedResponse;
        return [
          ...sectioned.applyAndKnowToday.map((m: AIJobMatch) => ({ ...m, section: 'applyAndKnowToday' as const })),
          ...sectioned.matchedForYou.map((m: AIJobMatch) => ({ ...m, section: 'matchedForYou' as const })),
        ];
      }
      // Backward compat: flat array
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Auto-retry when matches are empty — backend may still be computing
  useEffect(() => {
    if (isLoading || isFetching) return;
    if (allMatches && allMatches.length > 0) {
      emptyRetryCount.current = 0;
      setWaitingForMatches(false);
      return;
    }
    // No skills = no matches possible — skip retries
    if (!hasSkills) {
      setWaitingForMatches(false);
      return;
    }
    // Data came back empty — retry if under limit
    if (emptyRetryCount.current < MAX_EMPTY_RETRIES) {
      setWaitingForMatches(true);
      const timer = setTimeout(() => {
        emptyRetryCount.current++;
        refetch();
      }, 5000);
      return () => clearTimeout(timer);
    }
    // Exhausted retries — show empty state
    setWaitingForMatches(false);
  }, [allMatches, isLoading, isFetching, refetch, hasSkills]);

  // Client-side filtering — instant, no network calls
  const filteredMatches = useMemo(() => {
    if (!allMatches) return undefined;
    const term = searchTerm.toLowerCase().trim();
    return allMatches.filter(m => {
      if (term && !m.job.title.toLowerCase().includes(term) && !m.job.company.toLowerCase().includes(term) && !(m.job.description || '').toLowerCase().includes(term)) return false;
      if (locationFilter !== 'all' && m.job.location !== locationFilter) return false;
      if (workTypeFilter !== 'all' && m.job.workType !== workTypeFilter) return false;
      if (companyFilter !== 'all' && m.job.company !== companyFilter) return false;
      if (experienceLevelFilter !== 'all') {
        const level = inferJobLevel(m.job.title);
        // When filtering for entry level, also include mid (many entry jobs lack "junior" in title)
        if (experienceLevelFilter === 'entry') {
          if (level !== 'entry' && level !== 'mid') return false;
        } else {
          if (level !== experienceLevelFilter) return false;
        }
      }
      return true;
    });
  }, [allMatches, searchTerm, locationFilter, workTypeFilter, companyFilter, experienceLevelFilter]);

  const { data: userJobActions } = useQuery({
    queryKey: ['/api/candidate/job-actions'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/candidate/job-actions');
      const data = await response.json();
      return {
        saved: new Set<number>(data?.saved || []),
        applied: new Set<number>(data?.applied || []),
      };
    },
  });

  const savedJobIds = userJobActions?.saved ?? new Set();
  const appliedJobIds = userJobActions?.applied ?? new Set();

  const applyMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/candidate/apply/${jobId}`, {});
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Application failed' }));
        throw new Error(data.message || `Application failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Application Tracked!", description: "We've marked this job as applied." });
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/job-actions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/applications'] });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest("POST", '/api/candidate/saved-jobs', { jobId }),
    onMutate: async (jobId: number) => {
      await queryClient.cancelQueries({ queryKey: ['/api/candidate/job-actions'] });
      const previousJobActions = queryClient.getQueryData(['/api/candidate/job-actions']);
      queryClient.setQueryData(['/api/candidate/job-actions'], (oldData: any) => {
        if (!oldData) {return oldData;}
        return {
          ...oldData,
          saved: new Set(oldData.saved).add(jobId),
        };
      });
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
        if (!oldData) {return oldData;}
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
      await queryClient.cancelQueries({ queryKey: ['/api/ai-matches'] });
      const previousMatches = queryClient.getQueryData(['/api/ai-matches']);
      queryClient.setQueryData(['/api/ai-matches'], (oldData: any) =>
        Array.isArray(oldData) ? oldData.filter((match: AIJobMatch) => match.job.id !== jobId) : oldData
      );
      return { previousMatches };
    },
    onSuccess: () => {
      toast({ title: "Job Hidden", description: "You won't see this job in your feed anymore." });
    },
    onError: (err, variables, context) => {
      if (context?.previousMatches) {
        queryClient.setQueryData(['/api/ai-matches'], context.previousMatches);
      }
      toast({ title: "Error", description: "Failed to hide job.", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-matches'] });
    },
  });

  const agentApplyMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/candidate/agent-apply/${jobId}`, {});
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Application failed' }));
        throw new Error(data.message || `Application failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.verificationRequired) {
        toast({ title: "Verification Needed", description: `Check your email for a verification code to complete the application.` });
      } else {
        toast({ title: "Applied!", description: "Your application was submitted automatically." });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/job-actions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/agent-tasks'] });
    },
    onError: (error: any) => toast({ title: "Application Failed", description: error.message, variant: "destructive" }),
  });

  const handleAgentApply = (e: React.MouseEvent, match: AIJobMatch) => {
    e.stopPropagation();
    if (appliedJobIds.has(match.job.id) || agentApplyingIds.has(match.job.id)) {return;}
    setAgentApplyingIds(prev => new Set(prev).add(match.job.id));
    agentApplyMutation.mutate(match.job.id, {
      onSettled: () => {
        setAgentApplyingIds(prev => { const next = new Set(prev); next.delete(match.job.id); return next; });
      },
    });
  };

  const handleApply = (e: React.MouseEvent, match: AIJobMatch) => {
    e.stopPropagation();
    if (appliedJobIds.has(match.job.id)) {return;}
    const isInternal = !match.job.externalUrl;
    applyMutation.mutate(match.job.id, {
      onSuccess: () => {
        if (isInternal && match.job.hasExam) {
          setLocation(`/exam/${match.job.id}`);
        }
      },
    });
    if (match.job.externalUrl) {
      toast({
        title: "Opening External Application",
        description: `You'll be redirected to ${match.job.company}'s career page. We've tracked this application for you.`,
      });
      setTimeout(() => {
        window.open(match.job.externalUrl, '_blank');
      }, 500);
    } else if (!match.job.hasExam) {
      toast({
        title: "Application Submitted",
        description: `Your application for ${match.job.title} at ${match.job.company} has been sent.`,
      });
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

  const _rowVirtualizer = useVirtualizer({
    count: filteredMatches?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  const locations = useMemo(() => [...new Set((allMatches || []).map(m => m.job.location).filter(Boolean))].sort(), [allMatches]);
  const companies = useMemo(() => [...new Set((allMatches || []).map(m => m.job.company).filter(Boolean))].sort(), [allMatches]);
  const workTypes = useMemo(() => [...new Set((allMatches || []).map(m => m.job.workType).filter(Boolean))].sort(), [allMatches]);

  const clearFilters = () => {
    setSearchTerm("");
    setLocationFilter("all");
    setWorkTypeFilter("all");
    setCompanyFilter("all");
    setExperienceLevelFilter("all");
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          
          {/* Filter dropdowns - stack on mobile, row on tablet+ */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <MapPin className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <Briefcase className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue placeholder="Work Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {workTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Building className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company} value={company}>{company}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={experienceLevelFilter} onValueChange={setExperienceLevelFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <Layers className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {(Object.keys(EXPERIENCE_LEVEL_LABELS) as ExperienceLevel[]).map(level => (
                  <SelectItem key={level} value={level}>{EXPERIENCE_LEVEL_LABELS[level]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchTerm || locationFilter !== 'all' || workTypeFilter !== 'all' || companyFilter !== 'all' || experienceLevelFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
                <Filter className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Job Feed */}
      {isLoading || waitingForMatches || (isFetching && (!filteredMatches || filteredMatches.length === 0)) ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Finding your best job matches...</p>
        </div>
      ) : !filteredMatches || filteredMatches.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No matches yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            We couldn't find jobs matching your profile. This could be because:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-6 max-w-sm mx-auto text-left bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
            <li className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 text-gray-400" />
              Your profile needs more details
            </li>
            <li className="flex items-start gap-2">
              <Briefcase className="h-4 w-4 mt-0.5 text-gray-400" />
              Your skills don't match current openings
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-gray-400" />
              Try adjusting your location preferences
            </li>
          </ul>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => onUploadClick?.()}
              className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Update Profile
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Job count summary with refresh */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Showing {Math.min(displayLimit, filteredMatches.length)} of {filteredMatches.length} matches</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2"
            >
              <RotateCcw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          <div className="space-y-4 max-h-[calc(100vh-350px)] overflow-y-auto">
            {filteredMatches.slice(0, displayLimit).map((match, idx) => {
              const prevSection = idx > 0 ? filteredMatches[idx - 1]?.section : undefined;
              const showSectionHeader = match.section && match.section !== prevSection;
              const isSaved = savedJobIds.has(match.job.id);
              const isApplied = appliedJobIds.has(match.job.id);
              // Determine trust badges
              const isVerifiedActive = match.isVerifiedActive || (match.job.trustScore && match.job.trustScore >= 85 && match.job.livenessStatus === 'active');
              const isDirectFromCompany = match.isDirectFromCompany || match.job.externalSource === 'internal' || match.job.externalSource === 'platform';
              const isInternalJob = (match.job as any).source === 'platform' || match.job.externalSource === 'platform' || !match.job.externalUrl;
              // Agent-apply submits directly via the Greenhouse Boards API (HTTP, no browser).
              // Only shown for jobs sourced from Greenhouse where we can parse boardToken + jobId.
              // Google, Meta, Amazon, Lever etc. require account login or CSRF — not supported.
              const supportsAgentApply = (() => {
                if (!match.job.externalUrl) return false;
                if ((match.job as any).source === 'greenhouse') return true;
                const url = match.job.externalUrl.toLowerCase();
                return url.includes('greenhouse.io');
              })();

              return (
                <div key={match.id}>
                  {showSectionHeader && match.section === 'applyAndKnowToday' && (
                    <div className="flex items-center gap-2 pb-3 pt-1">
                      <Shield className="h-5 w-5 text-green-600" />
                      <h2 className="font-semibold text-lg text-green-700 dark:text-green-400">Apply & Know Today</h2>
                      <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs">Results within 24h</Badge>
                    </div>
                  )}
                  {showSectionHeader && match.section === 'matchedForYou' && (
                    <div className="flex items-center gap-2 pb-3 pt-4 border-t mt-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      <h2 className="font-semibold text-lg text-blue-700 dark:text-blue-400">Matched For You</h2>
                    </div>
                  )}
                  <Card className="hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-150">
                    <CardContent className="p-3 sm:p-4">
                      {/* Mobile: Stack vertically, Desktop: Side by side */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {match.job.aiCurated && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI Curated
                              </Badge>
                            )}
                            {/* PRD: Trust badges */}
                            {isVerifiedActive && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 text-xs">
                                <BadgeCheck className="h-3 w-3 mr-1" />
                                Verified Active
                              </Badge>
                            )}
                            {isDirectFromCompany && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                Direct
                              </Badge>
                            )}
                            {isInternalJob && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Same-day Response
                              </Badge>
                            )}
                            {isInternalJob && match.job.hasExam && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                Has Exam
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500 hidden sm:inline">Match: {match.matchScore}</span>
                          </div>
                          <h3 className="font-semibold text-base sm:text-lg leading-tight">
                            <span className="line-clamp-2 sm:line-clamp-1">{match.job.title}</span>
                          </h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 sm:gap-x-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <div className="flex items-center">
                              <Building className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" /> {match.job.company}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" /> {match.job.location}
                            </div>
                            <div className="flex items-center sm:hidden">
                              <Briefcase className="h-3 w-3 mr-1 shrink-0" /> {match.job.workType}
                            </div>
                          </div>

                          {/* PRD: "Why You're a Match" explanation */}
                          <div className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            <span className="font-medium text-blue-600 dark:text-blue-400">Why you match:</span>{' '}
                            {match.aiExplanation || (match.skillMatches && match.skillMatches.length > 0
                              ? `Strong match for ${match.skillMatches.slice(0, 2).join(' & ')}`
                              : 'Skills and experience align with this role')}
                          </div>
                        </div>
                        {/* Mobile: Full width buttons, Desktop: Right side buttons */}
                        <div className="flex flex-row sm:flex-col lg:flex-row items-center gap-2 sm:gap-1.5 lg:gap-2 sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-700">
                          <Button
                            size="sm"
                            variant={isApplied ? "outline" : "default"}
                            onClick={(e) => handleApply(e, match)}
                            disabled={isApplied || applyMutation.isPending}
                            className={`flex-1 sm:flex-none text-xs sm:text-sm ${isApplied ? 'border-green-400 text-green-700 dark:border-green-600 dark:text-green-400' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            title={match.job.externalUrl ? "Opens company career page in new tab" : isInternalJob && match.job.hasExam ? "Apply and take the screening exam" : "Submit application for this job"}
                          >
                            {applyMutation.isPending
                              ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                              : isApplied
                                ? <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                : isInternalJob && match.job.hasExam
                                  ? <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  : <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />}
                            <span className="hidden sm:inline">
                              {applyMutation.isPending ? "Applying..." : isApplied ? "Applied" : isInternalJob && match.job.hasExam ? "Apply & Take Exam" : match.job.externalUrl ? "Apply Externally" : "Apply Now"}
                            </span>
                            <span className="sm:hidden">{applyMutation.isPending ? "..." : isApplied ? "Applied" : isInternalJob && match.job.hasExam ? "Exam" : "Apply"}</span>
                          </Button>
                          {supportsAgentApply && !isApplied && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleAgentApply(e, match)}
                              disabled={agentApplyingIds.has(match.job.id)}
                              className="flex-1 sm:flex-none border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20 text-xs sm:text-sm"
                              title="Auto-fills and submits your application on the company's Greenhouse/Lever form"
                            >
                              {agentApplyingIds.has(match.job.id)
                                ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                                : <Bot className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />}
                              <span className="hidden sm:inline">{agentApplyingIds.has(match.job.id) ? "Applying..." : "Apply For Me"}</span>
                              <span className="sm:hidden">{agentApplyingIds.has(match.job.id) ? "..." : "Agent"}</span>
                            </Button>
                          )}
                          <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleSaveToggle(e, match)}
                              disabled={saveMutation.isPending || unsaveMutation.isPending}
                              className="px-2 sm:px-2.5"
                            >
                              {(saveMutation.isPending || unsaveMutation.isPending)
                                ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                : <Bookmark className={`h-3 w-3 sm:h-4 sm:w-4 ${isSaved ? "fill-current text-yellow-500" : ""}`} />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleHide(e, match)}
                              disabled={hideMutation.isPending}
                              className="px-2 sm:px-2.5"
                            >
                              {hideMutation.isPending
                                ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                : <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); setSelectedMatch(match); setIsModalOpen(true); }}
                              className="px-2 sm:px-2.5"
                            >
                              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
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

