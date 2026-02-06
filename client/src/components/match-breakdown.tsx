import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, XCircle, Target, MapPin, DollarSign, Briefcase, Building, Star } from "lucide-react";

interface MatchBreakdownProps {
  match: {
    matchScore: string;
    confidenceLevel: number;
    skillMatches: string[];
    aiExplanation: string;
    breakdown?: {
      skills: number;
      experience: number;
      location: number;
      salary: number;
      workType: number;
      industry: number;
      titleRelevance: number;
    };
  };
  job: {
    title: string;
    company: string;
    skills: string[];
    requirements: string[];
    location: string;
    workType: string;
    salaryMin?: number;
    salaryMax?: number;
  };
}

export default function MatchBreakdown({ match, job }: MatchBreakdownProps) {
  const overallScore = parseInt(match.matchScore.replace('%', ''));
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 60) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const breakdown = match.breakdown || {
    skills: overallScore * 0.35,
    experience: overallScore * 0.25,
    location: overallScore * 0.15,
    salary: overallScore * 0.10,
    workType: overallScore * 0.08,
    industry: overallScore * 0.04,
    titleRelevance: overallScore * 0.03
  };

  const criteriaData = [
    {
      label: "Skills Match",
      score: Math.round(breakdown.skills),
      weight: "35%",
      icon: <Target className="h-4 w-4" />,
      description: `${match.skillMatches?.length || 0} of ${job.skills?.length || 0} required skills matched`
    },
    {
      label: "Experience Level",
      score: Math.round(breakdown.experience),
      weight: "25%",
      icon: <Briefcase className="h-4 w-4" />,
      description: "Experience aligns with role requirements"
    },
    {
      label: "Location",
      score: Math.round(breakdown.location),
      weight: "15%",
      icon: <MapPin className="h-4 w-4" />,
      description: job.workType === 'remote' ? 'Remote work available' : `Located in ${job.location}`
    },
    {
      label: "Salary Range",
      score: Math.round(breakdown.salary),
      weight: "10%",
      icon: <DollarSign className="h-4 w-4" />,
      description: job.salaryMin && job.salaryMax 
        ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
        : 'Salary range compatible'
    },
    {
      label: "Work Type",
      score: Math.round(breakdown.workType),
      weight: "8%",
      icon: <Building className="h-4 w-4" />,
      description: `${job.workType} position`
    },
    {
      label: "Industry Fit",
      score: Math.round(breakdown.industry),
      weight: "4%",
      icon: <Building className="h-4 w-4" />,
      description: "Industry background alignment"
    },
    {
      label: "Title Relevance",
      score: Math.round(breakdown.titleRelevance),
      weight: "3%",
      icon: <Star className="h-4 w-4" />,
      description: `Relevance to ${job.title} role`
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Match Analysis
          <Badge variant={overallScore >= 80 ? "default" : overallScore >= 60 ? "secondary" : "destructive"} className="ml-auto">
            {match.matchScore} Match
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Compatibility</span>
            <span className={getScoreColor(overallScore)}>{overallScore}%</span>
          </div>
          <Progress value={overallScore} className="h-2" />
        </div>

        {/* AI Explanation */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">{match.aiExplanation}</p>
        </div>

        {/* Skill Matches */}
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Matching Skills ({match.skillMatches.length})
          </h4>
          <div className="flex flex-wrap gap-1">
            {match.skillMatches.map((skill, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div>
          <h4 className="font-medium mb-3">Detailed Scoring</h4>
          <div className="space-y-3">
            {criteriaData.map((criteria, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {criteria.icon}
                    <span className="font-medium">{criteria.label}</span>
                    <span className="text-xs text-gray-500">({criteria.weight})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getScoreIcon(criteria.score)}
                    <span className={getScoreColor(criteria.score)}>{criteria.score}%</span>
                  </div>
                </div>
                <Progress value={criteria.score} className="h-1" />
                <p className="text-xs text-gray-600 dark:text-gray-400">{criteria.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence Level */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <span className="text-sm font-medium">Confidence Level</span>
          <Badge variant={match.confidenceLevel >= 0.8 ? "default" : match.confidenceLevel >= 0.6 ? "secondary" : "outline"}>
            {match.confidenceLevel >= 0.8 ? 'High' : match.confidenceLevel >= 0.6 ? 'Medium' : 'Low'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}