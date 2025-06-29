import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  Eye, 
  MessageSquare, 
  ExternalLink, 
  ChevronRight,
  TrendingUp,
  Users,
  Award,
  Heart,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface ApplicationIntelligence {
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
  // Revolutionary Intelligence Features
  intelligence?: {
    timeline: Array<{
      timestamp: string;
      type: string;
      actor: string;
      details: {
        viewDuration?: number;
        ranking?: number;
        totalApplicants?: number;
        feedback?: string;
        humanReadable: string;
      };
    }>;
    insights: {
      strengthsIdentified: string[];
      improvementAreas: string[];
      recommendedActions: string[];
    };
    benchmarks: {
      averageViewTime: number;
      yourViewTime: number;
      averageScore: number;
      yourScore: number;
    };
  };
}

const statusConfig: Record<string, { label: string; color: string; progress: number; icon: any }> = {
  submitted: { label: "Submitted", color: "bg-blue-500", progress: 10, icon: CheckCircle },
  viewed: { label: "Viewed", color: "bg-yellow-500", progress: 25, icon: Eye },
  screening: { label: "In Review", color: "bg-orange-500", progress: 40, icon: Users },
  interview_scheduled: { label: "Interview Scheduled", color: "bg-purple-500", progress: 60, icon: Calendar },
  interview_completed: { label: "Interview Complete", color: "bg-indigo-500", progress: 80, icon: MessageSquare },
  offer: { label: "Offer Received", color: "bg-green-500", progress: 100, icon: Award },
  rejected: { label: "Not Selected", color: "bg-red-500", progress: 0, icon: AlertCircle },
  withdrawn: { label: "Withdrawn", color: "bg-gray-500", progress: 0, icon: Info }
};

function ApplicationIntelligenceTracker() {
  const [expandedApplication, setExpandedApplication] = useState<number | null>(null);
  
  const { data: applications, isLoading } = useQuery<ApplicationIntelligence[]>({
    queryKey: ["/api/applications/status"],
  });

  const getStatusBadge = (status: string, intelligence?: ApplicationIntelligence['intelligence']) => {
    const config = statusConfig[status] || statusConfig.submitted;
    const IconComponent = config.icon;
    
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const getProgressPercentage = (status: string) => {
    return statusConfig[status]?.progress || 0;
  };

  const getBenchmarkComparison = (benchmarks: any) => {
    if (!benchmarks) return null;
    const viewTimePercentage = ((benchmarks.yourViewTime - benchmarks.averageViewTime) / benchmarks.averageViewTime * 100);
    const scorePercentage = ((benchmarks.yourScore - benchmarks.averageScore) / benchmarks.averageScore * 100);
    
    return {
      viewTime: {
        value: viewTimePercentage,
        text: viewTimePercentage > 0 ? `${Math.round(viewTimePercentage)}% longer than average` : `${Math.round(Math.abs(viewTimePercentage))}% shorter than average`,
        positive: viewTimePercentage > 0
      },
      score: {
        value: scorePercentage,
        text: scorePercentage > 0 ? `${Math.round(scorePercentage)}% above average` : `${Math.round(Math.abs(scorePercentage))}% below average`,
        positive: scorePercentage > 0
      }
    };
  };

  const toggleExpanded = (applicationId: number) => {
    setExpandedApplication(expandedApplication === applicationId ? null : applicationId);
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
            <p className="text-sm">Start applying to jobs to see revolutionary transparency here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeApplications = applications.filter(app => 
    !['rejected', 'withdrawn'].includes(app.status)
  );
  const closedApplications = applications.filter(app => 
    ['rejected', 'withdrawn'].includes(app.status)
  );

  return (
    <div className="space-y-6">
      {/* Active Applications */}
      {activeApplications.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Active Applications ({activeApplications.length})
          </h3>
          <div className="space-y-4">
            {activeApplications.map((application) => (
              <Card key={application.id} className="transition-all duration-200 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-medium">
                        {application.job.title}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600">
                        {application.job.company} • {application.job.location}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {application.match && (
                        <Badge variant="outline" className="text-xs">
                          {application.match.matchScore}% match
                        </Badge>
                      )}
                      {getStatusBadge(application.status, application.intelligence)}
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

                    {/* Revolutionary Intelligence Summary */}
                    {application.intelligence && (
                      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">Application Intelligence</span>
                        </div>
                        
                        {/* Latest Update */}
                        {application.intelligence.timeline.length > 0 && (
                          <div className="text-sm mb-2">
                            <p className="text-gray-700 dark:text-gray-300">
                              {application.intelligence.timeline[0].details.humanReadable}
                            </p>
                          </div>
                        )}

                        {/* Quick Benchmarks */}
                        {application.intelligence.benchmarks && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white dark:bg-gray-800 p-2 rounded">
                              <span className="text-gray-500">View Time:</span>
                              <span className={`ml-1 font-medium ${
                                getBenchmarkComparison(application.intelligence.benchmarks).viewTime.positive 
                                  ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {application.intelligence.benchmarks.yourViewTime}s
                              </span>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-2 rounded">
                              <span className="text-gray-500">Your Score:</span>
                              <span className={`ml-1 font-medium ${
                                getBenchmarkComparison(application.intelligence.benchmarks).score.positive 
                                  ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {application.intelligence.benchmarks.yourScore}/100
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Applied {formatDistanceToNow(new Date(application.appliedAt), { addSuffix: true })}
                      </div>
                      {application.viewedByEmployerAt && (
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Viewed {formatDistanceToNow(new Date(application.viewedByEmployerAt), { addSuffix: true })}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleExpanded(application.id)}
                      >
                        {expandedApplication === application.id ? 'Hide Details' : 'View Intelligence'}
                        <ChevronRight className={`h-3 w-3 ml-1 transition-transform ${
                          expandedApplication === application.id ? 'rotate-90' : ''
                        }`} />
                      </Button>
                      {application.status === 'interview_scheduled' && (
                        <Button size="sm">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Prepare
                        </Button>
                      )}
                    </div>

                    {/* Expanded Intelligence Details */}
                    {expandedApplication === application.id && application.intelligence && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-4">
                        {/* Timeline */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Application Timeline
                          </h4>
                          <div className="space-y-2">
                            {application.intelligence.timeline.map((event, index) => (
                              <div key={index} className="flex items-start gap-3 text-sm">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                  <p className="font-medium">{event.actor}</p>
                                  <p className="text-gray-600 dark:text-gray-400">{event.details.humanReadable}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                                  </p>
                                  {event.details.feedback && (
                                    <div className="mt-1 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-xs">
                                      <strong>Feedback:</strong> {event.details.feedback}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Insights */}
                        {application.intelligence.insights && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Strengths */}
                            {application.intelligence.insights.strengthsIdentified.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2 text-green-600">
                                  <Award className="h-4 w-4" />
                                  Identified Strengths
                                </h4>
                                <ul className="text-sm space-y-1">
                                  {application.intelligence.insights.strengthsIdentified.map((strength, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                      {strength}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Improvement Areas */}
                            {application.intelligence.insights.improvementAreas.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2 text-orange-600">
                                  <TrendingUp className="h-4 w-4" />
                                  Growth Opportunities
                                </h4>
                                <ul className="text-sm space-y-1">
                                  {application.intelligence.insights.improvementAreas.map((area, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <Info className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                                      {area}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Benchmarks */}
                        {application.intelligence.benchmarks && (
                          <div>
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              How You Compare
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white dark:bg-gray-800 p-3 rounded">
                                <p className="text-sm font-medium">Profile View Time</p>
                                <p className="text-lg font-bold">{application.intelligence.benchmarks.yourViewTime}s</p>
                                <p className={`text-xs ${
                                  getBenchmarkComparison(application.intelligence.benchmarks).viewTime.positive 
                                    ? 'text-green-600' : 'text-orange-600'
                                }`}>
                                  {getBenchmarkComparison(application.intelligence.benchmarks).viewTime.text}
                                </p>
                              </div>
                              <div className="bg-white dark:bg-gray-800 p-3 rounded">
                                <p className="text-sm font-medium">Application Score</p>
                                <p className="text-lg font-bold">{application.intelligence.benchmarks.yourScore}/100</p>
                                <p className={`text-xs ${
                                  getBenchmarkComparison(application.intelligence.benchmarks).score.positive 
                                    ? 'text-green-600' : 'text-orange-600'
                                }`}>
                                  {getBenchmarkComparison(application.intelligence.benchmarks).score.text}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Closed Applications with Learning Insights */}
      {closedApplications.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-gray-600" />
            Learning from Past Applications ({closedApplications.length})
          </h3>
          <div className="space-y-4">
            {closedApplications.map((application) => (
              <Card key={application.id} className="opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        {application.job.title}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-500">
                        {application.job.company} • {application.job.location}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(application.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Learning Summary for Rejected Applications */}
                  {application.status === 'rejected' && application.intelligence && (
                    <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-sm">What You Can Learn</span>
                      </div>
                      {application.intelligence.insights.recommendedActions.length > 0 && (
                        <ul className="text-sm space-y-1">
                          {application.intelligence.insights.recommendedActions.slice(0, 2).map((action, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Applied {formatDistanceToNow(new Date(application.appliedAt), { addSuffix: true })}
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

export default ApplicationIntelligenceTracker;