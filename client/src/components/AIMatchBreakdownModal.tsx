
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Briefcase, MapPin, DollarSign, CheckCircle, AlertCircle, Building2, Shield, ExternalLink } from "lucide-react";
import { AIJobMatch } from "./ai-job-feed";

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
  const scoreBg = score >= 80 ? "bg-green-100 dark:bg-green-900/30" : score >= 60 ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-red-100 dark:bg-red-900/30";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center text-xl">
              <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
              AI Match Breakdown
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

          {/* AI Explanation */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center">
              <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
              Why This Match
            </h4>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {match.aiExplanation}
              </p>
            </div>
          </div>

          {/* Skills Match */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Your Matching Skills ({match.skillMatches.length})
            </h4>
            {match.skillMatches.length > 0 ? (
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
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <Briefcase className="h-4 w-4 mr-2 text-purple-500" />
                Job Requirements
              </h4>
              <ul className="space-y-1">
                {match.job.requirements.slice(0, 5).map((req, index) => (
                  <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                    <span className="text-purple-500 mr-2">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Score Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${scoreBg} border border-slate-200 dark:border-slate-700`}>
              <h4 className="font-semibold text-sm mb-1">Match Score</h4>
              <p className={`text-3xl font-bold ${scoreColor}`}>{match.matchScore}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {score >= 80 ? 'Excellent match!' : score >= 60 ? 'Good match' : 'Could be improved'}
              </p>
            </div>
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-sm mb-1">AI Confidence</h4>
              <p className="text-3xl font-bold text-slate-700 dark:text-slate-300">{match.confidenceLevel}%</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Based on profile data
              </p>
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
