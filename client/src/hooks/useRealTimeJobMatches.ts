import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface JobMatch {
  id: number;
  jobId: number;
  matchScore: number;
  status: string;
  createdAt: string;
  job?: {
    id: number;
    title: string;
    company: string;
    location: string;
    source: string;
    hasExam: boolean;
    workType: string;
    salaryMin?: number;
    salaryMax?: number;
    externalUrl?: string;
  };
}

export function useRealTimeJobMatches() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const lastMatchCountRef = useRef<number>(0);
  const notificationShownRef = useRef<Set<number>>(new Set());

  // Fetch job matches with optimized caching for instant updates
  const { data: matches = [], isLoading, error, refetch } = useQuery<JobMatch[]>({
    queryKey: ['/api/candidates/matches'],
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (updated from cacheTime)
    refetchInterval: 60 * 1000, // Refetch every minute
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 3,
  });

  // Real-time notifications for new matches
  useEffect(() => {
    if (!Array.isArray(matches) || !matches.length) return;

    const currentMatchCount = matches.length;
    const newMatches = matches.filter((match: any) => !notificationShownRef.current.has(match.id));

    // Show notification for genuinely new matches (not initial load)
    if (lastMatchCountRef.current > 0 && newMatches.length > 0) {
      const latestMatch = newMatches[0];
      
      toast({
        title: "New Job Match Found!",
        description: `${latestMatch.job?.title} at ${latestMatch.job?.company} - ${Math.round(latestMatch.matchScore * 100)}% match`,
        duration: 6000,
      });

      // Mark these matches as notified
      newMatches.forEach((match: any) => notificationShownRef.current.add(match.id));
    }

    lastMatchCountRef.current = currentMatchCount;
  }, [matches, toast]);

  // Force refresh function for immediate updates
  const forceRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/candidates/matches'] });
    return refetch();
  };

  // Get matches by priority (internal jobs with exams first)
  const prioritizedMatches = Array.isArray(matches) ? matches.sort((a: any, b: any) => {
    // Internal jobs with exams get highest priority
    if (a.job?.source === 'internal' && a.job?.hasExam && 
        !(b.job?.source === 'internal' && b.job?.hasExam)) {
      return -1;
    }
    if (b.job?.source === 'internal' && b.job?.hasExam && 
        !(a.job?.source === 'internal' && a.job?.hasExam)) {
      return 1;
    }
    
    // Then by match score
    return b.matchScore - a.matchScore;
  }) : [];

  // Get match statistics
  const stats = {
    total: Array.isArray(matches) ? matches.length : 0,
    newToday: Array.isArray(matches) ? matches.filter((match: any) => {
      const today = new Date();
      const matchDate = new Date(match.createdAt);
      return matchDate.toDateString() === today.toDateString();
    }).length : 0,
    highQuality: Array.isArray(matches) ? matches.filter((match: any) => match.matchScore >= 0.8).length : 0,
    withExams: Array.isArray(matches) ? matches.filter((match: any) => match.job?.hasExam).length : 0,
    internal: Array.isArray(matches) ? matches.filter((match: any) => match.job?.source === 'internal').length : 0,
  };

  return {
    matches: prioritizedMatches,
    isLoading,
    error,
    stats,
    forceRefresh,
    refetch,
  };
}