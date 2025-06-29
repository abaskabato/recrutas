import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useSession } from "@/lib/auth-client";
import { JobExam } from "@/components/job-exam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Briefcase, Clock, CheckCircle } from "lucide-react";

interface ExamPageProps {
  jobId?: number;
  jobTitle?: string;
  onComplete?: (score: number, passed: boolean) => void;
  onCancel?: () => void;
}

export default function ExamPage() {
  const [, setLocation] = useLocation();
  const { data: session } = useSession();
  const params = useParams();
  
  // Parse URL parameters
  const jobId = params.jobId ? parseInt(params.jobId) : undefined;
  const jobTitle = params.jobTitle || "Job Assessment";
  
  const [examStarted, setExamStarted] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [examResult, setExamResult] = useState<{ score: number; passed: boolean } | null>(null);

  const handleExamStart = () => {
    setExamStarted(true);
  };

  const handleExamComplete = (score: number, passed: boolean) => {
    setExamResult({ score, passed });
    setExamCompleted(true);
    setExamStarted(false);
  };

  const handleExamCancel = () => {
    setLocation('/candidate-dashboard');
  };

  const handleReturnToDashboard = () => {
    setLocation('/candidate-dashboard');
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-slate-600">Please log in to take the exam.</p>
            <Button 
              className="mt-4" 
              onClick={() => setLocation('/auth')}
            >
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!jobId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-slate-600">Invalid exam link. Please return to the job listing.</p>
            <Button 
              className="mt-4" 
              onClick={handleReturnToDashboard}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExamCancel}
                className="flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Jobs</span>
              </Button>
              <div className="h-6 w-px bg-slate-300" />
              <div className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-slate-500" />
                <h1 className="text-lg font-semibold text-slate-900">{jobTitle}</h1>
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Assessment</span>
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!examStarted && !examCompleted && (
          <div className="space-y-6">
            {/* Exam Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="w-5 h-5" />
                  <span>Job Assessment for {jobTitle}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-slate max-w-none">
                  <p>
                    Welcome to the assessment for the <strong>{jobTitle}</strong> position. 
                    This exam will help us evaluate your skills and experience for this role.
                  </p>
                  
                  <h4>What to expect:</h4>
                  <ul>
                    <li>Multiple choice and open-ended questions</li>
                    <li>Questions specific to the job requirements</li>
                    <li>Time limit will be displayed during the exam</li>
                    <li>Your progress will be saved automatically</li>
                  </ul>
                  
                  <h4>Instructions:</h4>
                  <ul>
                    <li>Read each question carefully</li>
                    <li>You can navigate between questions</li>
                    <li>Submit when you're confident in your answers</li>
                    <li>Ensure you have a stable internet connection</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Note:</strong> Once you start the exam, the timer will begin. 
                    Make sure you're ready before clicking "Start Exam".
                  </p>
                </div>

                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={handleExamStart}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    Start Exam
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {examStarted && !examCompleted && (
          <JobExam
            jobId={jobId}
            onComplete={handleExamComplete}
            onCancel={handleExamCancel}
          />
        )}

        {examCompleted && examResult && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className={`w-5 h-5 ${examResult.passed ? 'text-green-600' : 'text-orange-600'}`} />
                  <span>Exam Completed</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-slate-900">
                      Your Score: <span className="text-2xl font-bold">{examResult.score}%</span>
                    </p>
                    <Badge 
                      variant={examResult.passed ? "default" : "secondary"}
                      className={`text-sm px-3 py-1 ${
                        examResult.passed ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {examResult.passed ? '✅ Passed' : '⏳ Under Review'}
                    </Badge>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-700">
                      {examResult.passed ? (
                        <>
                          <strong>Congratulations!</strong> You've successfully passed the assessment. 
                          You can now communicate directly with the hiring manager for this position.
                        </>
                      ) : (
                        <>
                          <strong>Thank you for completing the assessment.</strong> 
                          While you didn't meet the passing threshold this time, your application 
                          will still be reviewed by the hiring team.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex justify-center space-x-4">
                    <Button 
                      onClick={handleReturnToDashboard}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Return to Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}