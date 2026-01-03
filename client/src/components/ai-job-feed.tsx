import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Building, Filter, ExternalLink, Briefcase, Bookmark, EyeOff, Check, Star, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rawMatches, isLoading } = useQuery<AIJobMatch[]>({
    queryKey: ['/api/ai-matches'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/ai-matches');
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
    onSuccess: (data, variables) => {
      toast({ title: "Job Saved!" });
      queryClient.setQueryData(['userJobActions'], (oldData: any) => ({
        ...oldData,
        saved: new Set(oldData.saved).add(variables),
      }));
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const unsaveMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest("DELETE", `/api/candidate/saved-jobs/${jobId}`),
    onSuccess: (data, variables) => {
      toast({ title: "Job Unsaved" });
      queryClient.setQueryData(['userJobActions'], (oldData: any) => {
        const newSaved = new Set(oldData.saved);
        newSaved.delete(variables);
        return { ...oldData, saved: newSaved };
      });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const hideMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest("POST", '/api/candidate/hidden-jobs', { jobId }),
    onSuccess: () => {
      toast({ title: "Job Hidden", description: "You won't see this job in your feed anymore." });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-matches'] });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
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

  const aiMatches = rawMatches || [];

  const filteredMatches = useMemo(() => {
    return aiMatches.filter((match: AIJobMatch) => {
      const job = match.job;
      const matchesSearch = !searchTerm ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLocation = locationFilter === "all" ||
        job.location.toLowerCase().includes(locationFilter.toLowerCase());

      const matchesCompany = companyFilter === "all" ||
        job.company.toLowerCase().includes(companyFilter.toLowerCase());

      const matchesWorkType = workTypeFilter === "all" ||
        job.workType?.toLowerCase() === workTypeFilter.toLowerCase();

      return matchesSearch && matchesLocation && matchesCompany && matchesWorkType;
    });
  }, [aiMatches, searchTerm, locationFilter, companyFilter, workTypeFilter]);

  const locations = useMemo(() => [...new Set(aiMatches.map(m => m.job.location).filter(Boolean))], [aiMatches]);
  const companies = useMemo(() => [...new Set(aiMatches.map(m => m.job.company).filter(Boolean))], [aiMatches]);
  const workTypes = useMemo(() => [...new Set(aiMatches.map(m => m.job.workType).filter(Boolean))], [aiMatches]);

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
        <div className="space-y-3">{/* ... loading skeleton ... */}</div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">{/* ... no results ... */}</div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((match) => {
            const isSaved = savedJobIds.has(match.job.id);
            const isApplied = appliedJobIds.has(match.job.id);
            const isExpanded = expandedMatchId === match.id;
            return (
              <Card key={match.id} className="hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-150">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* ... job details ... */}
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
                        onClick={(e) => { e.stopPropagation(); setExpandedMatchId(isExpanded ? null : match.id); }}
                      >
                        <Sparkles className={`h-4 w-4 ${isExpanded ? "fill-current text-blue-500" : ""}`} />
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold text-sm mb-2 flex items-center">
                        <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
                        AI Match Breakdown
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{match.aiExplanation}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm font-medium">Your matching skills:</span>
                        {match.skillMatches.map((skill, index) => (
                          <Badge key={index} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* ... external source footer ... */}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

