import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Star,
  Zap,
  Target,
  Users,
  Building
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CompatibilityFactors {
  skillAlignment: number;
  experienceMatch: number;
  locationFit: number;
  salaryMatch: number;
  industryRelevance: number;
}

interface EnhancedJobMatch {
  jobId: number;
  matchScore: number;
  confidenceLevel: number;
  skillMatches: string[];
  aiExplanation: string;
  urgencyScore: number;
  compatibilityFactors: CompatibilityFactors;
}

interface AdvancedMatchesResponse {
  matches: EnhancedJobMatch[];
  total: number;
  algorithm: string;
}

export default function AdvancedJobMatches({ candidateId }: { candidateId: string }) {
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<EnhancedJobMatch | null>(null);
  const [matchPreferences, setMatchPreferences] = useState({
    workType: 'hybrid',
    industry: '',
    location: '',
    salaryExpectation: 0
  });

  const { data: matchesData, isLoading, error } = useQuery<AdvancedMatchesResponse>({
    queryKey: ['/api/advanced-matches', candidateId],
    enabled: !!candidateId,
  });

  const updatePreferences = async (newPreferences: any) => {
    try {
      await apiRequest('PUT', '/api/candidate/match-preferences', newPreferences);
      setMatchPreferences(prev => ({ ...prev, ...newPreferences }));
      toast({
        title: 'Preferences Updated',
        description: 'Your job matching preferences have been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update your preferences. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-emerald-600 bg-emerald-50';
    if (score >= 0.8) return 'text-blue-600 bg-blue-50';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-slate-600 bg-slate-50';
  };

  const getUrgencyBadge = (urgency: number) => {
    if (urgency >= 0.8) return <Badge variant="destructive" className="text-xs">High Priority</Badge>;
    if (urgency >= 0.6) return <Badge variant="default" className="text-xs">Medium Priority</Badge>;
    return <Badge variant="secondary" className="text-xs">Standard</Badge>;
  };

  const renderCompatibilityChart = (factors: CompatibilityFactors) => {
    const factorLabels = {
      skillAlignment: 'Skill Match',
      experienceMatch: 'Experience Level',
      locationFit: 'Location',
      salaryMatch: 'Salary Range',
      industryRelevance: 'Industry Fit'
    };

    return (
      <div className="space-y-3">
        {Object.entries(factors).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{factorLabels[key as keyof CompatibilityFactors]}</span>
              <span className="font-medium">{Math.round(value * 100)}%</span>
            </div>
            <Progress value={value * 100} className="h-2" />
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-slate-600">Analyzing job matches with AI...</p>
        </div>
      </div>
    );
  }

  if (error || !matchesData) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="text-slate-400">
            <Briefcase className="w-12 h-12 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-slate-900">No Matches Found</h3>
            <p className="text-sm">We couldn't find any job matches at this time. Try updating your profile or preferences.</p>
          </div>
        </div>
      </Card>
    );
  }

  const { matches, total, algorithm } = matchesData;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">AI-Powered Job Matches</h2>
          <p className="text-slate-600 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {total} personalized matches found using {algorithm}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-purple-50">
            <Star className="w-3 h-3 mr-1" />
            Premium Matching
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="matches" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="matches" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Job Matches
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-4">
          {matches.length === 0 ? (
            <Card className="p-8">
              <div className="text-center space-y-4">
                <Briefcase className="w-16 h-16 text-slate-300 mx-auto" />
                <div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Matches Available</h3>
                  <p className="text-slate-600">Complete your profile to get personalized job recommendations.</p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6">
              {matches.map((match, index) => (
                <Card key={match.jobId} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">Job #{match.jobId}</CardTitle>
                          {getUrgencyBadge(match.urgencyScore)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            Tech Company
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            San Francisco
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Remote
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getMatchScoreColor(match.matchScore)}`}>
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {Math.round(match.matchScore * 100)}% Match
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {Math.round(match.confidenceLevel * 100)}% confidence
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Skills section */}
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Matching Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {match.skillMatches.slice(0, 5).map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
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

                    {/* AI Explanation */}
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">AI Match Analysis</h4>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                        {match.aiExplanation}
                      </p>
                    </div>

                    {/* Compatibility factors */}
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Compatibility Breakdown</h4>
                      {renderCompatibilityChart(match.compatibilityFactors)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMatch(match)}
                      >
                        View Details
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Save for Later
                        </Button>
                        <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                          Apply Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Matching Preferences
              </CardTitle>
              <p className="text-sm text-slate-600">
                Customize how we match you with relevant job opportunities.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Work Type</label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={matchPreferences.workType}
                    onChange={(e) => updatePreferences({ workType: e.target.value })}
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Preferred Industry</label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={matchPreferences.industry}
                    onChange={(e) => updatePreferences({ industry: e.target.value })}
                  >
                    <option value="">Any Industry</option>
                    <option value="technology">Technology</option>
                    <option value="finance">Finance</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Location</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md"
                    placeholder="City, State"
                    value={matchPreferences.location}
                    onChange={(e) => updatePreferences({ location: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Salary Expectation</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-md"
                    placeholder="Annual salary"
                    value={matchPreferences.salaryExpectation || ''}
                    onChange={(e) => updatePreferences({ salaryExpectation: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}