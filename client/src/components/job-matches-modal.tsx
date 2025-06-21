import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, MapPin, DollarSign, Clock, ArrowRight, Sparkles, X, MessageCircle, Eye, Heart, Building, ExternalLink, Users, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

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

interface JobMatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JobMatchesModal({ isOpen, onClose }: JobMatchesModalProps) {
  const [appliedJobs, setAppliedJobs] = useState<number[]>([]);
  const [likedJobs, setLikedJobs] = useState<number[]>([]);

  // Fetch fresh AI job matches for the current user
  const { data: matches, isLoading, error } = useQuery<AIJobMatch[]>({
    queryKey: ['/api/ai-matches'],
    enabled: isOpen,
    retry: 2,
  });

  const matchesArray = (matches as AIJobMatch[]) || [];
  
  console.log('Modal state:', { isOpen, isLoading, error, matchesCount: matchesArray.length });
  console.log('Modal render - isOpen prop:', isOpen);

  const handleQuickApply = (match: AIJobMatch) => {
    setAppliedJobs(prev => [...prev, match.id]);
    // Here you would typically send an API request to apply
  };

  const handleLike = (match: AIJobMatch) => {
    setLikedJobs(prev => [...prev, match.id]);
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salary not specified";
    if (!max) return `$${min?.toLocaleString()}+`;
    if (!min) return `Up to $${max?.toLocaleString()}`;
    return `$${min?.toLocaleString()} - $${max?.toLocaleString()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Direct Company Matches
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh] space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : matchesArray.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No matches found</h3>
              <p className="text-muted-foreground">
                Try uploading your resume or updating your profile for better matches.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {matchesArray.map((match: any, index: number) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-foreground hover:text-primary cursor-pointer">
                                {match.job.title}
                              </h3>
                              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                <Building className="h-4 w-4" />
                                <span className="font-medium">{match.job.company}</span>
                                {match.job.externalSource && (
                                  <Badge variant="outline" className="text-xs">
                                    {match.job.externalSource}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                {match.matchScore}% match
                              </Badge>
                              <Badge variant="outline">
                                AI Score: {match.confidenceLevel}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{match.job.location || "Remote"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <DollarSign className="h-4 w-4" />
                              <span>{formatSalary(match.job.salaryMin, match.job.salaryMax)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Briefcase className="h-4 w-4" />
                              <span className="capitalize">{match.job.workType || "Full-time"}</span>
                            </div>
                          </div>

                          {match.skillMatches && match.skillMatches.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Matching Skills:</p>
                              <div className="flex flex-wrap gap-1">
                                {match.skillMatches.slice(0, 5).map((skill: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {match.skillMatches.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{match.skillMatches.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {match.aiExplanation && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                              <p className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>AI Analysis:</strong> {match.aiExplanation}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:min-w-[140px]">
                          {appliedJobs.includes(match.id) ? (
                            <Button disabled className="bg-green-600 text-white">
                              Applied ✓
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => handleQuickApply(match)}
                              className="bg-primary hover:bg-primary/90"
                            >
                              Apply Direct
                            </Button>
                          )}
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLike(match)}
                              className={likedJobs.includes(match.id) ? "text-red-600" : ""}
                            >
                              <Heart className={`h-4 w-4 ${likedJobs.includes(match.id) ? "fill-current" : ""}`} />
                            </Button>
                            
                            <Button variant="outline" size="sm" title="Message hiring manager directly">
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            
                            {match.job.externalUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={match.job.externalUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {matchesArray.length > 0 && `${matchesArray.length} personalized matches found`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onClose}>
              View All Jobs
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}