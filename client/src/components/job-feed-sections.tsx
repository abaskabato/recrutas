import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Clock,
  MapPin,
  Building,
  Briefcase,
  BadgeCheck,
  Shield,
  ChevronRight,
  Star
} from "lucide-react";
import type { AIJobMatch } from "./ai-job-feed";

interface JobFeedSectionsProps {
  matches: AIJobMatch[];
  onJobClick: (match: AIJobMatch) => void;
  onApply: (match: AIJobMatch) => void;
  savedJobIds: Set<number>;
  appliedJobIds: Set<number>;
}

interface JobSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  jobs: AIJobMatch[];
  color: string;
}

export default function JobFeedSections({
  matches,
  onJobClick,
  onApply,
  savedJobIds,
  appliedJobIds
}: JobFeedSectionsProps) {
  const sections = useMemo<JobSection[]>(() => {
    if (!matches || matches.length === 0) return [];

    // Section 1: Top 5 AI Matches (highest match scores)
    const topMatches = [...matches]
      .sort((a, b) => {
        const scoreA = parseFloat(a.matchScore) || 0;
        const scoreB = parseFloat(b.matchScore) || 0;
        return scoreB - scoreA;
      })
      .slice(0, 5);

    // Section 2: Newly Posted & Verified Active
    const newlyPostedVerified = matches.filter(m => {
      const isVerified = m.isVerifiedActive ||
        (m.job.trustScore && m.job.trustScore >= 85 && m.job.livenessStatus === 'active');
      const isRecent = m.job.postedDate
        ? (Date.now() - new Date(m.job.postedDate).getTime()) < 7 * 24 * 60 * 60 * 1000
        : false;
      return isVerified && isRecent;
    }).slice(0, 5);

    // Section 3: Remote Roles Matching Your Skills
    const remoteRoles = matches.filter(m =>
      m.job.workType?.toLowerCase() === 'remote'
    ).slice(0, 5);

    return [
      {
        id: 'top-ai-matches',
        title: 'Your Top 5 AI Matches',
        icon: <Sparkles className="h-5 w-5 text-blue-500" />,
        description: 'Highest scoring matches based on your skills and experience',
        jobs: topMatches,
        color: 'blue'
      },
      {
        id: 'newly-posted-verified',
        title: 'Newly Posted & Verified Active',
        icon: <BadgeCheck className="h-5 w-5 text-green-500" />,
        description: 'Fresh opportunities confirmed to be actively hiring',
        jobs: newlyPostedVerified,
        color: 'green'
      },
      {
        id: 'remote-roles',
        title: 'Remote Roles Matching Your Skills',
        icon: <MapPin className="h-5 w-5 text-purple-500" />,
        description: 'Work from anywhere positions that fit your profile',
        jobs: remoteRoles,
        color: 'purple'
      }
    ].filter(section => section.jobs.length > 0);
  }, [matches]);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 mb-8">
      {sections.map(section => (
        <Card key={section.id} className="overflow-hidden">
          <CardHeader className={`pb-3 bg-${section.color}-50 dark:bg-${section.color}-900/20 border-b border-${section.color}-100 dark:border-${section.color}-800`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {section.icon}
                <div>
                  <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{section.description}</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {section.jobs.length} {section.jobs.length === 1 ? 'job' : 'jobs'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {section.jobs.map((match) => {
                const isApplied = appliedJobIds.has(match.job.id);
                const isSaved = savedJobIds.has(match.job.id);

                return (
                  <div
                    key={match.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => onJobClick(match)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {match.job.title}
                          </h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                            {match.matchScore} match
                          </span>
                          {isSaved && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center">
                            <Building className="h-3 w-3 mr-1" />
                            {match.job.company}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {match.job.location}
                          </span>
                          <span className="flex items-center">
                            <Briefcase className="h-3 w-3 mr-1" />
                            {match.job.workType}
                          </span>
                        </div>
                        {match.skillMatches && match.skillMatches.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {match.skillMatches.slice(0, 3).map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {match.skillMatches.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{match.skillMatches.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={isApplied ? "secondary" : "default"}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isApplied) onApply(match);
                          }}
                          disabled={isApplied}
                          className={isApplied ? "" : "bg-blue-600 hover:bg-blue-700 text-white"}
                        >
                          {isApplied ? "Applied" : "Apply"}
                        </Button>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
