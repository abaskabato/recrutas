import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";

interface MatchingScoreVisualizerProps {
  title: string;
  overallScore: number;
  breakdown: {
    skills: number;
    experience: number;
    location: number;
    salary: number;
    workType: number;
    industry: number;
    titleRelevance: number;
  };
  improvements?: string[];
}

export default function MatchingScoreVisualizer({ 
  title, 
  overallScore, 
  breakdown, 
  improvements = [] 
}: MatchingScoreVisualizerProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600"; 
    return "text-red-600";
  };

  const getScoreVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const criteriaData = [
    {
      label: "Skills Compatibility",
      score: breakdown.skills,
      weight: 35,
      description: "Technical and professional skills alignment"
    },
    {
      label: "Experience Level",
      score: breakdown.experience,
      weight: 25,
      description: "Years of experience and seniority match"
    },
    {
      label: "Location Fit",
      score: breakdown.location,
      weight: 15,
      description: "Geographic and remote work compatibility"
    },
    {
      label: "Salary Alignment",
      score: breakdown.salary,
      weight: 10,
      description: "Compensation expectations match"
    },
    {
      label: "Work Preferences",
      score: breakdown.workType,
      weight: 8,
      description: "Remote, hybrid, or on-site preferences"
    },
    {
      label: "Industry Background",
      score: breakdown.industry,
      weight: 4,
      description: "Sector experience and knowledge"
    },
    {
      label: "Role Relevance",
      score: breakdown.titleRelevance,
      weight: 3,
      description: "Job title and responsibilities match"
    }
  ];

  const sortedCriteria = criteriaData.sort((a, b) => b.score - a.score);
  const topPerforming = sortedCriteria.slice(0, 3);
  const needsImprovement = sortedCriteria.filter(c => c.score < 60);

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className={`text-4xl font-bold ${getScoreColor(overallScore)} mb-2`}>
              {Math.round(overallScore)}%
            </div>
            <Badge variant={getScoreVariant(overallScore)} className="text-sm">
              {overallScore >= 80 ? 'Excellent Match' : 
               overallScore >= 60 ? 'Good Match' : 'Fair Match'}
            </Badge>
          </div>
          <Progress value={overallScore} className="h-3" />
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scoring Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {criteriaData.map((criteria, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{criteria.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {criteria.weight}%
                  </Badge>
                </div>
                <span className={`font-semibold ${getScoreColor(criteria.score)}`}>
                  {Math.round(criteria.score)}%
                </span>
              </div>
              <Progress value={criteria.score} className="h-2" />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {criteria.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Top Performing Areas */}
      {topPerforming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              Strongest Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topPerforming.map((criteria, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <span className="text-sm font-medium">{criteria.label}</span>
                  <Badge variant="default" className="bg-green-600">
                    {Math.round(criteria.score)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Areas for Improvement */}
      {needsImprovement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              Areas to Strengthen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {needsImprovement.map((criteria, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <span className="text-sm font-medium">{criteria.label}</span>
                  <Badge variant="secondary">
                    {Math.round(criteria.score)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Improvement Suggestions */}
      {improvements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Improvement Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {improvements.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="h-1.5 w-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}