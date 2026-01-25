import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Eye, MessageSquare, ExternalLink, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ApplicationStatus {
  id: number;
  status: string;
  appliedAt: string;
  viewedByEmployerAt?: string;
  lastStatusUpdate: string;
  interviewDate?: string;
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    salaryMin?: number;
    salaryMax?: number;
    workType: string;
  };
  match?: {
    matchScore: string;
    confidenceLevel: string;
  };
}

const statusConfig: Record<string, { label: string; color: string; progress: number }> = {
  submitted: { label: "Submitted", color: "bg-blue-500", progress: 10 },
  viewed: { label: "Viewed", color: "bg-yellow-500", progress: 25 },
  screening: { label: "In Review", color: "bg-orange-500", progress: 40 },
  interview_scheduled: { label: "Interview Scheduled", color: "bg-purple-500", progress: 60 },
  interview_completed: { label: "Interview Complete", color: "bg-indigo-500", progress: 80 },
  offer: { label: "Offer Received", color: "bg-green-500", progress: 100 },
  rejected: { label: "Not Selected", color: "bg-red-500", progress: 0 },
  withdrawn: { label: "Withdrawn", color: "bg-gray-500", progress: 0 }
};

export default function ApplicationTracker() {
  const { data: applications, isLoading } = useQuery<ApplicationStatus[]>({
    queryKey: ["/api/candidate/applications"],
  });

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.submitted;
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const getProgressPercentage = (status: string) => {
    return statusConfig[status]?.progress || 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">
            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Applications Yet</h3>
            <p className="text-sm">Start applying to jobs to track your progress here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeApplications = useMemo(() => (applications || []).filter(app => 
    !['rejected', 'withdrawn'].includes(app.status)
  ), [applications]);
  const closedApplications = useMemo(() => (applications || []).filter(app => 
    ['rejected', 'withdrawn'].includes(app.status)
  ), [applications]);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{applications.length}</div>
            <div className="text-sm text-gray-600">Total Applications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{activeApplications.length}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {applications.filter(app => app.status === 'interview_scheduled').length}
            </div>
            <div className="text-sm text-gray-600">Interviews</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {applications.filter(app => app.status === 'offer').length}
            </div>
            <div className="text-sm text-gray-600">Offers</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Applications */}
      {activeApplications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Applications ({activeApplications.length})
          </h3>
          <div className="space-y-4">
            {activeApplications.map((application) => (
              <Card key={application.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{application.job.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>{application.job.company}</span>
                        <span>•</span>
                        <span>{application.job.location}</span>
                        {application.job.workType && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{application.job.workType}</span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {application.match && (
                        <Badge variant="outline" className="text-xs">
                          {application.match.matchScore}% match
                        </Badge>
                      )}
                      {getStatusBadge(application.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Application Progress</span>
                        <span>{getProgressPercentage(application.status)}%</span>
                      </div>
                      <Progress value={getProgressPercentage(application.status)} className="h-2" />
                    </div>

                    {/* Timeline Info */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Applied {formatDistanceToNow(new Date(application.appliedAt), { addSuffix: true })}
                        </span>
                        {application.viewedByEmployerAt && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            Viewed {formatDistanceToNow(new Date(application.viewedByEmployerAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.location.href = '/chat'}>
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.location.href = `/candidate-dashboard?tab=jobs&job=${application.job.id}`}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Job
                        </Button>
                      </div>
                    </div>

                    {/* Salary Range */}
                    {(application.job.salaryMin || application.job.salaryMax) && (
                      <div className="text-sm text-gray-600">
                        Salary: ${application.job.salaryMin?.toLocaleString()} - ${application.job.salaryMax?.toLocaleString()}
                      </div>
                    )}

                    {/* Interview Info */}
                    {application.status === 'interview_scheduled' && application.interviewDate && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">Interview scheduled</span>
                        </div>
                        <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                          {new Date(application.interviewDate).toLocaleDateString()} at{' '}
                          {new Date(application.interviewDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Closed Applications */}
      {closedApplications.length > 0 && (
        <div>
          <Separator />
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 mt-6">
            Past Applications ({closedApplications.length})
          </h3>
          <div className="space-y-3">
            {closedApplications.map((application) => (
              <Card key={application.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{application.job.title}</h4>
                      <p className="text-sm text-gray-600">{application.job.company}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(application.status)}
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}