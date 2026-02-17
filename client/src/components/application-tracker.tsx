import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Eye, MessageSquare, ExternalLink, ChevronRight, Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ApplicationStatus {
  id: number;
  status: string;
  appliedAt: string;
  viewedByEmployerAt?: string;
  lastStatusUpdate: string;
  interviewDate?: string;
  autoFilled?: boolean;
  metadata?: { agentApply?: boolean; queuedAt?: string };
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    salaryMin?: number;
    salaryMax?: number;
    workType: string;
    externalUrl?: string;
  };
  match?: {
    matchScore: string;
    confidenceLevel: string;
  };
}

interface AgentTaskStatus {
  id: number;
  applicationId: number;
  status: 'queued' | 'processing' | 'submitted' | 'failed' | 'cancelled';
  lastError?: string;
}

const agentStatusConfig: Record<string, { label: string; color: string }> = {
  queued: { label: "Queued", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300" },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
  submitted: { label: "Submitted", color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
  failed: { label: "Failed", color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300" },
};

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
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: applications, isLoading } = useQuery<ApplicationStatus[]>({
    queryKey: ["/api/candidate/applications"],
  });

  const { data: agentTasks } = useQuery<AgentTaskStatus[]>({
    queryKey: ["/api/candidate/agent-tasks"],
  });

  const agentTaskByAppId = useMemo(() => {
    const map = new Map<number, AgentTaskStatus>();
    (agentTasks || []).forEach(t => map.set(t.applicationId, t));
    return map;
  }, [agentTasks]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: number; status: string }) => {
      // Use candidate-specific endpoint for self-service status update
      const res = await apiRequest('PUT', `/api/candidate/application/${applicationId}/status`, { status });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status Updated", description: "Your application status has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/applications"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <div className="text-2xl font-bold text-emerald-600">
              {applications.filter(app => app.autoFilled || app.metadata?.agentApply).length}
            </div>
            <div className="text-sm text-gray-600">Agent Applied</div>
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
                      <CardTitle className="text-lg">{application.job?.title || 'Unknown Job'}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>{application.job?.company || 'Unknown Company'}</span>
                        {application.job?.location && (
                          <>
                            <span>•</span>
                            <span>{application.job.location}</span>
                          </>
                        )}
                        {application.job?.workType && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{application.job.workType}</span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(application.autoFilled || application.metadata?.agentApply) && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs">
                          <Bot className="h-3 w-3 mr-1" />
                          Agent Applied
                        </Badge>
                      )}
                      {(application.autoFilled || application.metadata?.agentApply) && agentTaskByAppId.get(application.id) && (() => {
                        const task = agentTaskByAppId.get(application.id)!;
                        const cfg = agentStatusConfig[task.status] || agentStatusConfig.queued;
                        return (
                          <Badge variant="secondary" className={`text-xs ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                        );
                      })()}
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
                    {/* Self-service status update for external jobs */}
                    {application.job?.externalUrl && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Update Status:</span>
                        <Select
                          value={application.status}
                          onValueChange={(newStatus) => updateStatusMutation.mutate({ applicationId: application.id, status: newStatus })}
                        >
                          <SelectTrigger className="w-[180px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="screening">In Progress</SelectItem>
                            <SelectItem value="interview_scheduled">Interview</SelectItem>
                            <SelectItem value="offer">Offer</SelectItem>
                            <SelectItem value="rejected">Not Selected</SelectItem>
                            <SelectItem value="withdrawn">Withdrawn</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Timeline Info */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Applied {application.appliedAt && !isNaN(new Date(application.appliedAt).getTime())
                            ? formatDistanceToNow(new Date(application.appliedAt), { addSuffix: true })
                            : 'recently'}
                        </span>
                        {application.viewedByEmployerAt && !isNaN(new Date(application.viewedByEmployerAt).getTime()) && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            Viewed {formatDistanceToNow(new Date(application.viewedByEmployerAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {/* Message button: only for internal jobs at screening+ stage */}
                        {!application.job?.externalUrl && ['screening', 'interview_scheduled', 'interview_completed', 'offer'].includes(application.status) && (
                          <Button variant="outline" size="sm" onClick={() => setLocation('/chat')}>
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Message
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (application.job?.externalUrl) {
                              window.open(application.job.externalUrl, '_blank');
                            } else {
                              setLocation(`/candidate-dashboard?tab=jobs&job=${application.job?.id || ''}`);
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Job
                        </Button>
                      </div>
                    </div>

                    {/* Salary Range */}
                    {(application.job?.salaryMin || application.job?.salaryMax) && (
                      <div className="text-sm text-gray-600">
                        Salary: ${application.job?.salaryMin?.toLocaleString() || 'N/A'} - ${application.job?.salaryMax?.toLocaleString() || 'N/A'}
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
                      <h4 className="font-medium">{application.job?.title || 'Unknown Job'}</h4>
                      <p className="text-sm text-gray-600">{application.job?.company || 'Unknown Company'}</p>
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