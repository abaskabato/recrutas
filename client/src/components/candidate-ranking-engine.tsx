import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  Star, 
  MessageCircle, 
  Calendar, 
  Brain, 
  Target, 
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  TrendingUp,
  Users,
  BarChart3,
  Filter,
  ArrowUp,
  ArrowDown,
  Zap
} from "lucide-react";

interface ExamResult {
  score: number;
  totalPoints: number;
  timeSpent: number;
  completedAt: string;
  answers: Array<{
    questionId: string;
    answer: string;
    correct: boolean;
    points: number;
  }>;
}

interface CandidateScore {
  id: string;
  candidateId: string;
  jobId: number;
  totalScore: number;
  examScore: number;
  profileMatchScore: number;
  experienceScore: number;
  skillMatchScore: number;
  responseTimeScore: number;
  overallRank: number;
  status: 'pending' | 'reviewed' | 'contacted' | 'interviewed' | 'hired' | 'rejected';
  autoQualified: boolean;
  examResult?: ExamResult;
  candidate: {
    firstName: string;
    lastName: string;
    email: string;
    skills: string[];
    experience: string;
    location: string;
    resumeUrl?: string;
    appliedAt: string;
  };
}

interface RankingFilters {
  minScore: number;
  maxScore: number;
  status: string[];
  autoQualifiedOnly: boolean;
  skillMatch: string[];
}

export default function CandidateRankingEngine({ 
  jobId,
  onCandidateSelect,
  onDirectConnect
}: {
  jobId: number;
  onCandidateSelect: (candidate: CandidateScore) => void;
  onDirectConnect: (candidate: CandidateScore) => void;
}) {
  const [sortBy, setSortBy] = useState<'totalScore' | 'examScore' | 'appliedAt'>('totalScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<RankingFilters>({
    minScore: 0,
    maxScore: 100,
    status: [],
    autoQualifiedOnly: false,
    skillMatch: []
  });

  // Fetch ranked candidates for this job
  const { data: rankedCandidates = [], isLoading } = useQuery<CandidateScore[]>({
    queryKey: ['/api/jobs', jobId, 'candidates', 'ranked'],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Fetch job details for context
  const { data: jobDetails } = useQuery({
    queryKey: ['/api/jobs', jobId],
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hired': return 'bg-green-100 text-green-800';
      case 'interviewed': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-purple-100 text-purple-800';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAndSortedCandidates = rankedCandidates
    .filter(candidate => {
      if (candidate.totalScore < filters.minScore || candidate.totalScore > filters.maxScore) return false;
      if (filters.status.length > 0 && !filters.status.includes(candidate.status)) return false;
      if (filters.autoQualifiedOnly && !candidate.autoQualified) return false;
      if (filters.skillMatch.length > 0) {
        const hasSkillMatch = filters.skillMatch.some(skill => 
          candidate.candidate.skills.some(candidateSkill => 
            candidateSkill.toLowerCase().includes(skill.toLowerCase())
          )
        );
        if (!hasSkillMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'totalScore':
          comparison = a.totalScore - b.totalScore;
          break;
        case 'examScore':
          comparison = (a.examScore || 0) - (b.examScore || 0);
          break;
        case 'appliedAt':
          comparison = new Date(a.candidate.appliedAt).getTime() - new Date(b.candidate.appliedAt).getTime();
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const topCandidates = filteredAndSortedCandidates.slice(0, 10);
  const averageScore = rankedCandidates.length > 0 
    ? rankedCandidates.reduce((sum, c) => sum + c.totalScore, 0) / rankedCandidates.length 
    : 0;

  const statusCounts = rankedCandidates.reduce((acc, candidate) => {
    acc[candidate.status] = (acc[candidate.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{rankedCandidates.length}</p>
                <p className="text-sm text-gray-600">Total Applicants</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{rankedCandidates.filter(c => c.autoQualified).length}</p>
                <p className="text-sm text-gray-600">Auto-Qualified</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{Math.round(averageScore)}</p>
                <p className="text-sm text-gray-600">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{statusCounts.contacted || 0}</p>
                <p className="text-sm text-gray-600">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ranked" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ranked">Ranked Candidates</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
          <TabsTrigger value="automated">Automated Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="ranked" className="space-y-4">
          {/* Sorting and Filtering */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Sort by:</span>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="totalScore">Total Score</option>
                  <option value="examScore">Exam Score</option>
                  <option value="appliedAt">Application Date</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                >
                  {sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Badge variant="secondary">
                {filteredAndSortedCandidates.length} of {rankedCandidates.length}
              </Badge>
            </div>
          </div>

          {/* Candidate List */}
          <div className="space-y-4">
            {filteredAndSortedCandidates.map((candidate, index) => (
              <Card key={candidate.id} className={`hover:shadow-md transition-shadow ${
                candidate.autoQualified ? 'border-l-4 border-l-green-500' : ''
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Rank Badge */}
                      <div className="flex flex-col items-center">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white
                          ${index < 3 ? 'bg-yellow-500' : index < 10 ? 'bg-blue-500' : 'bg-gray-500'}
                        `}>
                          {index + 1}
                        </div>
                        {index < 3 && <Trophy className="h-4 w-4 text-yellow-500 mt-1" />}
                      </div>

                      {/* Candidate Info */}
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-purple-100 text-purple-600">
                          {candidate.candidate.firstName[0]}{candidate.candidate.lastName[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-lg">
                            {candidate.candidate.firstName} {candidate.candidate.lastName}
                          </h4>
                          {candidate.autoQualified && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Auto-Qualified
                            </Badge>
                          )}
                          <Badge className={getStatusColor(candidate.status)}>
                            {candidate.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600">{candidate.candidate.email}</p>
                        <p className="text-sm text-gray-500">{candidate.candidate.location}</p>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${getScoreColor(candidate.totalScore)}`}>
                          {Math.round(candidate.totalScore)}
                        </p>
                        <p className="text-xs text-gray-500">Total Score</p>
                      </div>

                      {candidate.examScore !== undefined && (
                        <div className="text-center">
                          <p className={`text-lg font-semibold ${getScoreColor(candidate.examScore)}`}>
                            {Math.round(candidate.examScore)}
                          </p>
                          <p className="text-xs text-gray-500">Exam</p>
                        </div>
                      )}

                      <div className="text-center">
                        <p className={`text-lg font-semibold ${getScoreColor(candidate.skillMatchScore)}`}>
                          {Math.round(candidate.skillMatchScore)}
                        </p>
                        <p className="text-xs text-gray-500">Skills</p>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onCandidateSelect(candidate)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        
                        {(candidate.status === 'pending' || candidate.status === 'reviewed') && (
                          <Button 
                            size="sm" 
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => onDirectConnect(candidate)}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="mt-4 grid grid-cols-4 gap-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Profile Match</span>
                        <span>{Math.round(candidate.profileMatchScore)}%</span>
                      </div>
                      <Progress value={candidate.profileMatchScore} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Experience</span>
                        <span>{Math.round(candidate.experienceScore)}%</span>
                      </div>
                      <Progress value={candidate.experienceScore} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Skills</span>
                        <span>{Math.round(candidate.skillMatchScore)}%</span>
                      </div>
                      <Progress value={candidate.skillMatchScore} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Response Time</span>
                        <span>{Math.round(candidate.responseTimeScore)}%</span>
                      </div>
                      <Progress value={candidate.responseTimeScore} className="h-2" />
                    </div>
                  </div>

                  {/* Skills Tags */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {candidate.candidate.skills.slice(0, 5).map((skill, skillIndex) => {
                      const isMatchingSkill = jobDetails?.skills?.includes(skill);
                      return (
                        <Badge 
                          key={skillIndex} 
                          variant={isMatchingSkill ? "default" : "secondary"}
                          className={isMatchingSkill ? "bg-purple-100 text-purple-800" : ""}
                        >
                          {skill}
                        </Badge>
                      );
                    })}
                    {candidate.candidate.skills.length > 5 && (
                      <Badge variant="outline">
                        +{candidate.candidate.skills.length - 5} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredAndSortedCandidates.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No candidates match your filters</h3>
                  <p className="text-gray-600">Try adjusting your filters to see more candidates.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['90-100', '80-89', '70-79', '60-69', '< 60'].map((range, index) => {
                    const [min, max] = range.includes('<') ? [0, 59] : range.split('-').map(Number);
                    const count = rankedCandidates.filter(c => 
                      range.includes('<') ? c.totalScore < 60 : (c.totalScore >= min && c.totalScore <= max)
                    ).length;
                    const percentage = rankedCandidates.length > 0 ? (count / rankedCandidates.length) * 100 : 0;
                    
                    return (
                      <div key={range}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{range} points</span>
                          <span>{count} candidates ({Math.round(percentage)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Application Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Application Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statusCounts && Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <Badge className={getStatusColor(status)}>{status}</Badge>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Most Common Skills</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const skillCounts: Record<string, number> = {};
                  rankedCandidates.forEach(candidate => {
                    candidate.candidate.skills.forEach(skill => {
                      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
                    });
                  });
                  
                  const topSkills = Object.entries(skillCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8);

                  return (
                    <div className="space-y-2">
                      {topSkills.map(([skill, count]) => (
                        <div key={skill} className="flex justify-between items-center">
                          <span className="text-sm">{skill}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Exam Performance */}
            {rankedCandidates.some(c => c.examScore !== undefined) && (
              <Card>
                <CardHeader>
                  <CardTitle>Exam Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Average Score:</span>
                      <span className="font-semibold">
                        {Math.round(
                          rankedCandidates
                            .filter(c => c.examScore !== undefined)
                            .reduce((sum, c) => sum + (c.examScore || 0), 0) / 
                          rankedCandidates.filter(c => c.examScore !== undefined).length
                        )}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pass Rate:</span>
                      <span className="font-semibold">
                        {Math.round(
                          (rankedCandidates.filter(c => (c.examScore || 0) >= 70).length / 
                           rankedCandidates.filter(c => c.examScore !== undefined).length) * 100
                        )}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Exams:</span>
                      <span className="font-semibold">
                        {rankedCandidates.filter(c => c.examScore !== undefined).length} / {rankedCandidates.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="automated" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Auto-Qualification Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Auto-Qualification Rules</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900">Active Rules</h4>
                    <ul className="text-sm text-green-700 mt-2 space-y-1">
                      <li>• Total score ≥ 85%</li>
                      <li>• Exam score ≥ 80% (if enabled)</li>
                      <li>• Skill match ≥ 70%</li>
                      <li>• Experience score ≥ 60%</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">Auto-Actions</h4>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• Send welcome message to top 5 candidates</li>
                      <li>• Schedule screening call for auto-qualified candidates</li>
                      <li>• Notify hiring manager of qualified candidates</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Automated Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Automated Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rankedCandidates.filter(c => c.autoQualified).slice(0, 5).map((candidate) => (
                    <div key={candidate.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {candidate.candidate.firstName} {candidate.candidate.lastName}
                        </p>
                        <p className="text-xs text-gray-600">Auto-qualified and contacted</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        {Math.round(candidate.totalScore)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}