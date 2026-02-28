import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users, Briefcase, MessageSquare, Star, Target, Calendar,
  Linkedin, Github, Globe, ExternalLink, Trophy
} from "lucide-react";
import type { JobPosting } from "./types";

interface CandidatesTabProps {
  selectedJob: JobPosting | null;
  applicants: any[];
  applicantsLoading: boolean;
  applicantsWithSeparator: any[];
  totalRanked: number;
  maxChat: number;
  expandedApplicantId: number | null;
  setExpandedApplicantId: (id: number | null) => void;
  screeningQuestions: { [key: number]: string[] } | undefined;
  handleUpdateStatus: (applicationId: number, status: string) => void;
  startChatMutation: any;
  generateQuestionsMutation: any;
  setScheduleApplicant: (data: { applicationId: number; candidateId: string; name: string } | null) => void;
  setScheduleInterviewOpen: (open: boolean) => void;
}

export default function CandidatesTab({
  selectedJob,
  applicants,
  applicantsLoading,
  applicantsWithSeparator,
  totalRanked,
  maxChat,
  expandedApplicantId,
  setExpandedApplicantId,
  screeningQuestions,
  handleUpdateStatus,
  startChatMutation,
  generateQuestionsMutation,
  setScheduleApplicant,
  setScheduleInterviewOpen,
}: CandidatesTabProps) {
  if (!selectedJob) {
    return (
      <Card className="bg-white dark:bg-gray-800 shadow-md">
        <CardContent className="p-12 text-center">
          <Briefcase className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Job to View Applicants</h3>
          <p className="text-gray-500 dark:text-gray-400">Go to the 'Jobs' tab and click 'View Applicants' on a job posting.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          Applicants for {selectedJob.title}
        </h2>
        <p className="text-gray-500 dark:text-gray-400">Review and manage candidates for this role.</p>
      </div>

      {applicantsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse bg-white dark:bg-gray-800 shadow-md">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : applicants.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <CardContent className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No applicants yet</h3>
            <p className="text-gray-500 dark:text-gray-400">As soon as candidates apply, you'll see them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applicantsWithSeparator.map((item: any) => {
            if (item._separator) {
              return (
                <div key="cutoff-separator" className="flex items-center gap-3 py-2">
                  <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    Below top {maxChat} — chat not unlocked
                  </span>
                  <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
                </div>
              );
            }

            const applicant = item;
            const isExpanded = expandedApplicantId === applicant.applicationId;
            const questions = screeningQuestions?.[applicant.candidate.id];

            return (
              <Card key={applicant.applicationId}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <h3 className="font-semibold text-lg">{applicant.candidate?.firstName || 'Unknown'} {applicant.candidate?.lastName || ''}</h3>
                        {applicant.examScore != null && (
                          <Badge variant="default" className={applicant.examScore >= 80 ? "bg-emerald-600 hover:bg-emerald-700" : applicant.examScore >= 60 ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-500 hover:bg-gray-600"}>
                            <Target className="h-3 w-3 mr-1" />
                            Exam: {applicant.examScore}%
                          </Badge>
                        )}
                        {applicant.examRanking != null && (
                          <Badge variant="outline" className={applicant.qualifiedForChat ? "border-amber-400 text-amber-600" : "border-gray-300 text-gray-500"}>
                            <Trophy className="h-3 w-3 mr-1" />
                            #{applicant.examRanking} of {totalRanked}
                          </Badge>
                        )}
                        {applicant.match?.matchScore && (
                          <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                            <Star className="h-3 w-3 mr-1" />
                            {applicant.match.matchScore} Match
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{applicant.candidate?.email || ''}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {(applicant.profile?.skills || []).map((skill: string) => (
                          <Badge key={skill} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                      {/* Professional Links */}
                      {(applicant.profile?.linkedinUrl || applicant.profile?.githubUrl || applicant.profile?.portfolioUrl) && (
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500 font-medium">Professional Links:</span>
                          <div className="flex items-center gap-2">
                            {applicant.profile?.linkedinUrl && (
                              <a
                                href={applicant.profile.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs transition-colors"
                              >
                                <Linkedin className="h-3 w-3" />
                                LinkedIn
                                <ExternalLink className="h-2 w-2 ml-1" />
                              </a>
                            )}
                            {applicant.profile?.githubUrl && (
                              <a
                                href={applicant.profile.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs transition-colors"
                              >
                                <Github className="h-3 w-3" />
                                GitHub
                                <ExternalLink className="h-2 w-2 ml-1" />
                              </a>
                            )}
                            {applicant.profile?.portfolioUrl && (
                              <a
                                href={applicant.profile.portfolioUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 hover:bg-green-100 text-green-600 rounded text-xs transition-colors"
                              >
                                <Globe className="h-3 w-3" />
                                Portfolio
                                <ExternalLink className="h-2 w-2 ml-1" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Select
                        defaultValue={applicant.status}
                        onValueChange={(newStatus) => handleUpdateStatus(applicant.applicationId, newStatus)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="viewed">Viewed</SelectItem>
                          <SelectItem value="screening">Screening</SelectItem>
                          <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                          <SelectItem value="interview_completed">Interview Completed</SelectItem>
                          <SelectItem value="offer">Offer</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="withdrawn">Withdrawn</SelectItem>
                        </SelectContent>
                      </Select>
                      {applicant.match?.aiExplanation && (
                        <Button size="sm" variant="link" onClick={() => setExpandedApplicantId(isExpanded ? null : applicant.applicationId)}>
                          {isExpanded ? 'Hide' : 'Show'} AI Insights
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Primary actions */}
                  <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    {(!selectedJob?.hasExam || applicant.qualifiedForChat) ? (
                      <Button
                        size="sm"
                        onClick={() => selectedJob && startChatMutation.mutate({ jobId: selectedJob.id, candidateId: applicant.candidate?.id })}
                        disabled={startChatMutation.isPending}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Start Chat
                      </Button>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button size="sm" variant="outline" disabled>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Chat Locked
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Top {maxChat} candidates unlock chat.</p>
                            <p>This candidate ranked #{applicant.examRanking ?? '?'} of {totalRanked}.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      onClick={() => {
                        setScheduleApplicant({
                          applicationId: applicant.applicationId,
                          candidateId: applicant.candidate?.id,
                          name: `${applicant.candidate?.firstName || ''} ${applicant.candidate?.lastName || ''}`.trim()
                        });
                        setScheduleInterviewOpen(true);
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Interview
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                      {applicant.match?.aiExplanation && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-sm mb-2 text-gray-800 dark:text-gray-200">AI Insights:</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{applicant.match.aiExplanation}</p>
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => selectedJob && generateQuestionsMutation.mutate({ jobId: selectedJob.id, candidateId: applicant.candidate?.id })}
                          disabled={generateQuestionsMutation.isPending || !selectedJob}
                        >
                          Generate AI Screening Questions
                        </Button>
                      </div>
                      {questions && (
                        <div className="mt-4">
                          <h5 className="font-semibold text-sm mb-2">Suggested Questions:</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            {questions.map((q, i) => <li key={i}>{q}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
