import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye, 
  Clock, 
  Star, 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Target, 
  Heart,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Timer,
  BarChart3,
  Settings
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CandidateApplication {
  id: string;
  candidateId: string;
  jobId: number;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  appliedAt: string;
  status: 'new' | 'viewed' | 'screening' | 'interview' | 'rejected' | 'hired';
  matchScore: number;
  skills: string[];
  experience: string;
  location: string;
  resumeUrl?: string;
  // Application Intelligence tracking
  viewedAt?: string;
  viewDuration?: number; // in seconds
  ranking?: number;
  totalApplicants?: number;
  feedback?: string;
  hiringManagerNotes?: string;
  nextSteps?: string;
  transparencyLevel: 'full' | 'partial' | 'minimal';
}

interface ApplicationIntelligenceAction {
  type: 'view' | 'rank' | 'feedback' | 'decision' | 'note';
  timestamp: string;
  duration?: number;
  data: any;
}

interface TalentApplicationIntelligenceProps {
  applications: CandidateApplication[];
}

export default function TalentApplicationIntelligence({ applications }: TalentApplicationIntelligenceProps) {
  const { toast } = useToast();
  const [selectedApplication, setSelectedApplication] = useState<CandidateApplication | null>(null);
  const [viewStartTime, setViewStartTime] = useState<number | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [rankingDialog, setRankingDialog] = useState(false);
  const [transparencySettings, setTransparencySettings] = useState(false);

  // Track application viewing time
  useEffect(() => {
    if (selectedApplication && !viewStartTime) {
      setViewStartTime(Date.now());
    }
    
    return () => {
      if (selectedApplication && viewStartTime) {
        const duration = Math.floor((Date.now() - viewStartTime) / 1000);
        if (duration > 5) { // Only track if viewed for more than 5 seconds
          trackApplicationAction({
            applicationId: selectedApplication.id,
            type: 'view',
            duration,
            timestamp: new Date().toISOString()
          });
        }
      }
    };
  }, [selectedApplication, viewStartTime]);

  // Track application interaction
  const trackApplicationAction = async (action: {
    applicationId: string;
    type: string;
    duration?: number;
    timestamp: string;
    data?: any;
  }) => {
    try {
      await apiRequest('POST', `/api/talent/applications/${action.applicationId}/track`, action);
    } catch (error) {
      console.error('Failed to track application action:', error);
    }
  };

  // Update application status
  const updateApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, updates }: { applicationId: string; updates: Partial<CandidateApplication> }) => {
      return await apiRequest('PATCH', `/api/talent/applications/${applicationId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/talent/applications'] });
      toast({
        title: "Application Updated",
        description: "Changes saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Could not save changes",
        variant: "destructive",
      });
    }
  });

  // Provide feedback to candidate
  const provideFeedbackMutation = useMutation({
    mutationFn: async ({ applicationId, feedback, rating, nextSteps }: {
      applicationId: string;
      feedback: string;
      rating: number;
      nextSteps?: string;
    }) => {
      return await apiRequest('POST', `/api/talent/applications/${applicationId}/feedback`, {
        feedback,
        rating,
        nextSteps,
        timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/talent/applications'] });
      setFeedbackDialog(false);
      toast({
        title: "Feedback Provided",
        description: "Candidate will receive your feedback",
      });
    }
  });

  // Rank candidates
  const rankCandidatesMutation = useMutation({
    mutationFn: async ({ jobId, rankings }: { jobId: number; rankings: { applicationId: string; rank: number }[] }) => {
      return await apiRequest('POST', `/api/talent/jobs/${jobId}/rank-candidates`, { rankings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/talent/applications'] });
      setRankingDialog(false);
      toast({
        title: "Candidates Ranked",
        description: "Rankings updated successfully",
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500';
      case 'viewed': return 'bg-green-500';
      case 'screening': return 'bg-yellow-500';
      case 'interview': return 'bg-purple-500';
      case 'rejected': return 'bg-red-500';
      case 'hired': return 'bg-emerald-500';
      default: return 'bg-slate-500';
    }
  };

  const getTransparencyLevel = (level: string) => {
    switch (level) {
      case 'full': return { label: 'Full Transparency', color: 'text-green-600', description: 'Candidate sees all interactions' };
      case 'partial': return { label: 'Partial Transparency', color: 'text-yellow-600', description: 'Limited visibility' };
      case 'minimal': return { label: 'Minimal Transparency', color: 'text-red-600', description: 'Basic status only' };
      default: return { label: 'Default', color: 'text-slate-600', description: 'Standard visibility' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Application Intelligence Dashboard</h3>
          <p className="text-sm text-slate-600">Manage candidate transparency and provide feedback</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setTransparencySettings(true)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Transparency Settings
        </Button>
      </div>

      {/* Application Intelligence Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Applications Viewed</p>
                <p className="text-xl font-semibold text-slate-900">
                  {applications.filter(app => app.viewedAt).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <MessageSquare className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Feedback Provided</p>
                <p className="text-xl font-semibold text-slate-900">
                  {applications.filter(app => app.feedback).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Timer className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Avg Review Time</p>
                <p className="text-xl font-semibold text-slate-900">
                  {Math.round(
                    applications.filter(app => app.viewDuration).reduce((sum, app) => sum + (app.viewDuration || 0), 0) / 
                    Math.max(1, applications.filter(app => app.viewDuration).length)
                  )}s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List with Intelligence Features */}
      <div className="space-y-4">
        {applications.map((application) => (
          <Card key={application.id} className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-slate-600">
                          {application.candidateName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">{application.candidateName}</h4>
                        <p className="text-sm text-slate-600">{application.jobTitle}</p>
                      </div>
                    </div>
                    
                    <Badge className={`${getStatusColor(application.status)} text-white`}>
                      {application.status}
                    </Badge>
                    
                    {application.ranking && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        #{application.ranking} of {application.totalApplicants}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Star className="h-4 w-4" />
                      {application.matchScore}% match
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="h-4 w-4" />
                      {application.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4" />
                      Applied {formatDistanceToNow(new Date(application.appliedAt), { addSuffix: true })}
                    </div>
                  </div>

                  {/* Application Intelligence Status */}
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-slate-900 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Application Intelligence
                      </h5>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${getTransparencyLevel(application.transparencyLevel).color}`}>
                          {getTransparencyLevel(application.transparencyLevel).label}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-slate-600">Review Status:</span>
                        <div className="flex items-center gap-1 mt-1">
                          {application.viewedAt ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-green-600">Reviewed ({application.viewDuration}s)</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                              <span className="text-yellow-600">Pending Review</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-slate-600">Feedback Status:</span>
                        <div className="flex items-center gap-1 mt-1">
                          {application.feedback ? (
                            <>
                              <MessageSquare className="h-4 w-4 text-blue-500" />
                              <span className="text-blue-600">Provided</span>
                            </>
                          ) : (
                            <>
                              <MessageSquare className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-500">Not Provided</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-slate-600">Candidate Visibility:</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            application.transparencyLevel === 'full' ? 'bg-green-100 text-green-700' :
                            application.transparencyLevel === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {getTransparencyLevel(application.transparencyLevel).description}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-2">
                    {application.skills?.slice(0, 5).map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {application.skills && application.skills.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{application.skills.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedApplication(application)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Review Application
                  </Button>
                  
                  <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Provide Feedback
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Application Feedback</DialogTitle>
                        <p className="text-sm text-slate-600">
                          This feedback will be visible to the candidate based on transparency settings
                        </p>
                      </DialogHeader>
                      
                      <FeedbackForm 
                        application={application}
                        onSubmit={(feedback) => provideFeedbackMutation.mutate({ 
                          applicationId: application.id, 
                          ...feedback 
                        })}
                        isLoading={provideFeedbackMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>

                  {application.status === 'viewed' && (
                    <Button size="sm">
                      Move to Interview
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transparency Settings Dialog */}
      <Dialog open={transparencySettings} onOpenChange={setTransparencySettings}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Application Transparency Settings</DialogTitle>
            <p className="text-sm text-slate-600">
              Control what candidates see about their application status and your interactions
            </p>
          </DialogHeader>
          
          <TransparencySettingsForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Feedback Form Component
function FeedbackForm({ 
  application, 
  onSubmit, 
  isLoading 
}: { 
  application: CandidateApplication;
  onSubmit: (feedback: { feedback: string; rating: number; nextSteps?: string }) => void;
  isLoading: boolean;
}) {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [nextSteps, setNextSteps] = useState('');

  const handleSubmit = () => {
    if (!feedback.trim()) return;
    onSubmit({ feedback, rating, nextSteps });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Overall Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`p-1 ${star <= rating ? 'text-yellow-500' : 'text-slate-300'}`}
            >
              <Star className="h-5 w-5 fill-current" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Feedback Message</label>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Provide constructive feedback about their application, skills, and fit for the role..."
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Next Steps (Optional)</label>
        <Input
          value={nextSteps}
          onChange={(e) => setNextSteps(e.target.value)}
          placeholder="e.g., We'll schedule a technical interview next week"
        />
      </div>

      <div className="flex items-center justify-between pt-4">
        <div className="text-xs text-slate-500">
          This feedback will be visible to {application.candidateName}
        </div>
        <Button onClick={handleSubmit} disabled={isLoading || !feedback.trim()}>
          Send Feedback
        </Button>
      </div>
    </div>
  );
}

// Transparency Settings Form Component
function TransparencySettingsForm() {
  const [settings, setSettings] = useState({
    defaultTransparencyLevel: 'partial',
    showViewTime: true,
    showRanking: false,
    showFeedback: true,
    allowCandidateQuestions: true,
    anonymizeReviewer: false
  });

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Default Transparency Level</label>
        <Select 
          value={settings.defaultTransparencyLevel} 
          onValueChange={(value) => setSettings({ ...settings, defaultTransparencyLevel: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Full Transparency - Show all interactions</SelectItem>
            <SelectItem value="partial">Partial Transparency - Show key updates only</SelectItem>
            <SelectItem value="minimal">Minimal Transparency - Basic status only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium">What candidates can see:</h4>
        
        {[
          { key: 'showViewTime', label: 'Application review time', description: 'How long you spent reviewing their application' },
          { key: 'showRanking', label: 'Candidate ranking', description: 'Their position among all applicants' },
          { key: 'showFeedback', label: 'Detailed feedback', description: 'Your comments and improvement suggestions' },
          { key: 'allowCandidateQuestions', label: 'Allow follow-up questions', description: 'Candidates can ask for clarification' },
          { key: 'anonymizeReviewer', label: 'Anonymous reviewer', description: 'Hide your name and title from candidates' }
        ].map(({ key, label, description }) => (
          <div key={key} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={settings[key as keyof typeof settings] as boolean}
              onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-sm">{label}</div>
              <div className="text-xs text-slate-600">{description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Button>Save Settings</Button>
      </div>
    </div>
  );
}