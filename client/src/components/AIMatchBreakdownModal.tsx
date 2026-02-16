import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Briefcase, MapPin, DollarSign, CheckCircle, AlertCircle, Building2, Shield, ExternalLink, Award } from "lucide-react";
import { AIJobMatch } from "./ai-job-feed";

// Helper function to strip HTML tags
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// Helper to clean requirement text
function cleanRequirement(req: string): string {
  // If it looks like HTML, strip it
  if (req.includes('<') || req.includes('&')) {
    return stripHtml(req);
  }
  return req;
}

// Component for breakdown item with progress bar
function BreakdownItem({ 
  icon: Icon, 
  label, 
  score, 
  weight 
}: { 
  icon: React.ElementType; 
  label: string; 
  score: number; 
  weight: string;
}) {
  const getColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-500" />
          <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
          <span className="text-xs text-slate-400">({weight})</span>
        </div>
        <span className={`font-semibold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
          {score}%
        </span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(score)} rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

interface AIMatchBreakdownModalProps {
  match: AIJobMatch | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function AIMatchBreakdownModal({ match, isOpen, onOpenChange }: AIMatchBreakdownModalProps) {
  if (!match) {
    return null;
  }

  const score = parseInt(match.matchScore) || 0;
  const scoreColor = score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";

  // Derive real skills match percentage from actual data
  const totalJobSkills = match.job.skills?.length || 0;
  const matchedSkillCount = match.skillMatches?.length || 0;
  const skillsMatchPercent = totalJobSkills > 0
    ? Math.min(100, Math.round((matchedSkillCount / totalJobSkills) * 100))
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-2xl">
        <div className="bg-gradient-to-b from-blue-50/50 to-transparent absolute top-0 left-0 right-0 h-20 pointer-events-none" />
        <DialogHeader className="space-y-3 relative">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              <Target className="h-5 w-5 mr-2 text-blue-500" />
              Recrutas Match Breakdown
            </DialogTitle>
            <div className="flex gap-1">
              {match.isVerifiedActive && (
                <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified Active
                </Badge>
              )}
              {match.isDirectFromCompany && (
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                  <Building2 className="h-3 w-3 mr-1" />
                  Direct Apply
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription className="text-base">
            How your profile matches this position
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Job Summary Card */}
          <Card className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{match.job.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{match.job.company}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {match.job.location && (
                    <span className="flex items-center text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3 w-3 mr-1" />
                      {match.job.location}
                    </span>
                  )}
                  {match.job.workType && (
                    <Badge variant="secondary" className="text-xs">
                      {match.job.workType}
                    </Badge>
                  )}
                  {(match.job.salaryMin || match.job.salaryMax) && (
                    <span className="flex items-center text-slate-500 dark:text-slate-400">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {match.job.salaryMin ? `$${(match.job.salaryMin / 1000).toFixed(0)}k` : ''}{match.job.salaryMin && match.job.salaryMax ? ' - ' : ''}{match.job.salaryMax ? `$${(match.job.salaryMax / 1000).toFixed(0)}k` : ''}
                    </span>
                  )}
                </div>
                {match.job.externalUrl && (
                  <a 
                    href={match.job.externalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View Original Posting <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Overall Score with Detailed Breakdown */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" />
                <h4 className="font-bold text-slate-900 dark:text-white">Overall Match Score</h4>
              </div>
              <div className={`text-4xl font-bold ${scoreColor}`}>{match.matchScore}%</div>
            </div>
            
            {/* Skills Breakdown (real data) */}
            {totalJobSkills > 0 && (
              <div className="space-y-3 mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                <h5 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Skills Breakdown</h5>
                <BreakdownItem
                  icon={CheckCircle}
                  label="Skills Match"
                  score={skillsMatchPercent}
                  weight={`${matchedSkillCount}/${totalJobSkills} skills`}
                />
              </div>
            )}
          </div>

          {/* Why This Match */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center">
              <Target className="h-4 w-4 mr-2 text-blue-500" />
              Why This Match
            </h4>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {match.aiExplanation || "Your profile aligns well with this position based on your skills and experience."}
              </p>
            </div>
          </div>

          {/* Skills Match */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Your Matching Skills ({match.skillMatches?.length || 0})
            </h4>
            {match.skillMatches && match.skillMatches.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {match.skillMatches.map((skill, index) => (
                  <Badge 
                    key={index} 
                    className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex items-center text-yellow-600 dark:text-yellow-400 text-sm">
                <AlertCircle className="h-4 w-4 mr-2" />
                No direct skill matches found - consider adding more skills to your profile
              </div>
            )}
          </div>

          {/* Job Requirements */}
          {match.job.requirements && match.job.requirements.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-sm mb-3 flex items-center">
                <Briefcase className="h-4 w-4 mr-2 text-purple-500" />
                Job Requirements
              </h4>
              <ul className="space-y-2">
                {match.job.requirements.slice(0, 5).map((req, index) => (
                  <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                    <span className="text-purple-500 mr-2 mt-1">•</span>
                    <span className="leading-relaxed">{cleanRequirement(req)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Confidence */}
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm mb-1">AI Confidence</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Based on profile data completeness
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{match.confidenceLevel}%</p>
                <p className="text-xs text-slate-500">
                  {match.confidenceLevel >= 90 ? 'Very High' : match.confidenceLevel >= 75 ? 'High' : 'Moderate'}
                </p>
              </div>
            </div>
          </div>

          {/* Trust Score */}
          {match.job.trustScore && (
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
              <div className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Trust Score</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full" 
                    style={{ width: `${match.job.trustScore}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{match.job.trustScore}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
