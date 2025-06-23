import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useMutation, queryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ExamQuestion {
  id: string;
  type: 'multiple-choice' | 'short-answer';
  question: string;
  options?: string[];
  points: number;
  correctAnswer?: number;
}

interface JobExam {
  id: number;
  jobId: number;
  questions: ExamQuestion[];
  timeLimit: number;
  passingScore: number;
}

interface JobExamProps {
  jobId: number;
  onComplete: () => void;
  onCancel: () => void;
}

export function JobExam({ jobId, onComplete, onCancel }: JobExamProps) {
  const [exam, setExam] = useState<JobExam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const { toast } = useToast();

  // Fetch exam data
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const response = await apiRequest('GET', `/api/jobs/${jobId}/exam`);
        const examData = await response.json();
        setExam(examData);
        setTimeRemaining(examData.timeLimit * 60); // Convert minutes to seconds
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load exam",
          variant: "destructive",
        });
      }
    };

    fetchExam();
  }, [jobId, toast]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const submitExamMutation = useMutation({
    mutationFn: async (examAnswers: Record<string, string>) => {
      const response = await apiRequest('POST', `/api/jobs/${jobId}/exam/submit`, {
        answers: examAnswers
      });
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: result.passed ? "Exam Passed!" : "Exam Completed",
        description: result.passed 
          ? `You scored ${result.score}% and passed the exam!`
          : `You scored ${result.score}%. The passing score was ${exam?.passingScore}%.`,
        variant: result.passed ? "default" : "destructive",
      });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitExam = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    submitExamMutation.mutate(answers);
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (!exam) return 0;
    const answered = Object.keys(answers).length;
    return (answered / exam.questions.length) * 100;
  };

  if (!exam) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading exam...</p>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === exam.questions.length - 1;
  const allQuestionsAnswered = exam.questions.every(q => answers[q.id]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>Job Assessment</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-4 h-4" />
                <span className={timeRemaining < 300 ? "text-red-600 font-bold" : ""}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="text-sm text-slate-500">
                Question {currentQuestionIndex + 1} of {exam.questions.length}
              </div>
            </div>
          </div>
          <Progress value={getProgress()} className="mt-2" />
        </CardHeader>
      </Card>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {currentQuestion.question}
          </CardTitle>
          <p className="text-sm text-slate-500">
            Worth {currentQuestion.points} points
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestion.type === 'multiple-choice' ? (
            <RadioGroup
              value={answers[currentQuestion.id] || ''}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <Textarea
              placeholder="Enter your answer here..."
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              rows={4}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {currentQuestionIndex > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              disabled={isSubmitting}
            >
              Previous
            </Button>
          )}
        </div>

        <div className="flex space-x-2">
          {!isLastQuestion ? (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              disabled={!answers[currentQuestion.id] || isSubmitting}
            >
              Next Question
            </Button>
          ) : (
            <Button
              onClick={handleSubmitExam}
              disabled={!allQuestionsAnswered || isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Submitting...</span>
                </div>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Exam
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Question Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Question Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {exam.questions.map((_, index) => (
              <Button
                key={index}
                variant={index === currentQuestionIndex ? "default" : "outline"}
                size="sm"
                className={`w-8 h-8 p-0 ${
                  answers[exam.questions[index].id] 
                    ? "bg-green-100 border-green-300 text-green-700" 
                    : ""
                }`}
                onClick={() => setCurrentQuestionIndex(index)}
                disabled={isSubmitting}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}