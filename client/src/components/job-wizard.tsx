import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Briefcase, DollarSign, MapPin, Users, Clock, Award } from "lucide-react";

export interface JobPostingData {
  title: string;
  company: string;
  description: string;
  location?: string;
  workType?: "remote" | "hybrid" | "onsite";
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: string;
  jobType?: string;
  benefits?: string;
  applicationDeadline?: Date;
  exam?: {
    title: string;
    description: string;
    questions: Array<{
      id: string;
      type: "multiple-choice" | "coding" | "essay";
      question: string;
      options?: string[];
      correctAnswer?: string;
      points: number;
    }>;
    timeLimit: number;
    passingScore: number;
  };
}

interface JobWizardProps {
  onSubmit: (data: JobPostingData) => void;
  onCancel: () => void;
}

export default function JobWizard({ onSubmit, onCancel }: JobWizardProps) {
  const [step, setStep] = useState(1);
  const [jobData, setJobData] = useState<JobPostingData>({
    title: "",
    company: "",
    description: "",
    location: "",
    workType: "remote",
    salaryMin: 0,
    salaryMax: 0,
    experienceLevel: "mid",
    jobType: "full-time",
    benefits: "",
    exam: {
      title: "",
      description: "",
      questions: [],
      timeLimit: 60,
      passingScore: 70
    }
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    id: "",
    type: "multiple-choice" as const,
    question: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    points: 10
  });

  const handleJobDataChange = (field: string, value: any) => {
    setJobData(prev => ({ ...prev, [field]: value }));
  };

  const handleExamChange = (field: string, value: any) => {
    setJobData(prev => ({
      ...prev,
      exam: { ...prev.exam!, [field]: value }
    }));
  };

  const addQuestion = () => {
    if (!currentQuestion.question) return;
    
    const questionId = `q_${Date.now()}`;
    const newQuestion = {
      ...currentQuestion,
      id: questionId,
      options: currentQuestion.type === "multiple-choice" ? currentQuestion.options.filter(opt => opt.trim()) : undefined
    };

    setJobData(prev => ({
      ...prev,
      exam: {
        ...prev.exam!,
        questions: [...prev.exam!.questions, newQuestion]
      }
    }));

    setCurrentQuestion({
      id: "",
      type: "multiple-choice",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: "",
      points: 10
    });
  };

  const removeQuestion = (questionId: string) => {
    setJobData(prev => ({
      ...prev,
      exam: {
        ...prev.exam!,
        questions: prev.exam!.questions.filter(q => q.id !== questionId)
      }
    }));
  };

  const handleSubmit = () => {
    onSubmit(jobData);
  };

  const canProceedToStep2 = jobData.title && jobData.company && jobData.description;
  const canSubmit = canProceedToStep2 && jobData.exam!.title && jobData.exam!.questions.length > 0;

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Briefcase className="h-5 w-5 mr-2" />
            Create Job with Integrated Exam
          </DialogTitle>
        </DialogHeader>

        <div className="flex mb-6">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span className={step >= 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}>Job Details</span>
            <div className={`w-12 h-px ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className={step >= 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}>Exam Setup</span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      value={jobData.title}
                      onChange={(e) => handleJobDataChange("title", e.target.value)}
                      placeholder="e.g., Senior Software Engineer"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company *</Label>
                    <Input
                      id="company"
                      value={jobData.company}
                      onChange={(e) => handleJobDataChange("company", e.target.value)}
                      placeholder="e.g., TechCorp Inc."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Job Description *</Label>
                  <Textarea
                    id="description"
                    value={jobData.description}
                    onChange={(e) => handleJobDataChange("description", e.target.value)}
                    placeholder="Describe the role, responsibilities, and requirements..."
                    className="min-h-[120px]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={jobData.location}
                      onChange={(e) => handleJobDataChange("location", e.target.value)}
                      placeholder="e.g., San Francisco, CA"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workType">Work Type</Label>
                    <Select value={jobData.workType} onValueChange={(value) => handleJobDataChange("workType", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="onsite">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="experienceLevel">Experience Level</Label>
                    <Select value={jobData.experienceLevel} onValueChange={(value) => handleJobDataChange("experienceLevel", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry Level</SelectItem>
                        <SelectItem value="mid">Mid Level</SelectItem>
                        <SelectItem value="senior">Senior Level</SelectItem>
                        <SelectItem value="lead">Lead/Principal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salaryMin">Minimum Salary</Label>
                    <Input
                      id="salaryMin"
                      type="number"
                      value={jobData.salaryMin}
                      onChange={(e) => handleJobDataChange("salaryMin", parseInt(e.target.value) || 0)}
                      placeholder="80000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salaryMax">Maximum Salary</Label>
                    <Input
                      id="salaryMax"
                      type="number"
                      value={jobData.salaryMax}
                      onChange={(e) => handleJobDataChange("salaryMax", parseInt(e.target.value) || 0)}
                      placeholder="120000"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep(2)} 
                disabled={!canProceedToStep2}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next: Setup Exam
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-4 w-4 mr-2" />
                  Exam Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="examTitle">Exam Title *</Label>
                  <Input
                    id="examTitle"
                    value={jobData.exam!.title}
                    onChange={(e) => handleExamChange("title", e.target.value)}
                    placeholder="e.g., Technical Assessment for Software Engineer"
                  />
                </div>

                <div>
                  <Label htmlFor="examDescription">Exam Description</Label>
                  <Textarea
                    id="examDescription"
                    value={jobData.exam!.description}
                    onChange={(e) => handleExamChange("description", e.target.value)}
                    placeholder="Describe what the exam covers and what candidates should expect..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      value={jobData.exam!.timeLimit}
                      onChange={(e) => handleExamChange("timeLimit", parseInt(e.target.value) || 60)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="passingScore">Passing Score (%)</Label>
                    <Input
                      id="passingScore"
                      type="number"
                      value={jobData.exam!.passingScore}
                      onChange={(e) => handleExamChange("passingScore", parseInt(e.target.value) || 70)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Exam Questions ({jobData.exam!.questions.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">Add New Question</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="questionType">Question Type</Label>
                      <Select 
                        value={currentQuestion.type} 
                        onValueChange={(value: any) => setCurrentQuestion(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                          <SelectItem value="coding">Coding Challenge</SelectItem>
                          <SelectItem value="essay">Essay Question</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="questionText">Question</Label>
                      <Textarea
                        id="questionText"
                        value={currentQuestion.question}
                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                        placeholder="Enter your question here..."
                      />
                    </div>

                    {currentQuestion.type === "multiple-choice" && (
                      <div>
                        <Label>Answer Options</Label>
                        <div className="space-y-2">
                          {currentQuestion.options.map((option, index) => (
                            <Input
                              key={index}
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...currentQuestion.options];
                                newOptions[index] = e.target.value;
                                setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
                              }}
                              placeholder={`Option ${index + 1}`}
                            />
                          ))}
                        </div>
                        <div className="mt-2">
                          <Label htmlFor="correctAnswer">Correct Answer</Label>
                          <Select 
                            value={currentQuestion.correctAnswer} 
                            onValueChange={(value) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select correct answer" />
                            </SelectTrigger>
                            <SelectContent>
                              {currentQuestion.options.filter(opt => opt.trim()).map((option, index) => (
                                <SelectItem key={index} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="points">Points</Label>
                        <Input
                          id="points"
                          type="number"
                          value={currentQuestion.points}
                          onChange={(e) => setCurrentQuestion(prev => ({ ...prev, points: parseInt(e.target.value) || 10 }))}
                          className="w-20"
                        />
                      </div>
                      <Button onClick={addQuestion} disabled={!currentQuestion.question}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </div>
                  </div>
                </div>

                {jobData.exam!.questions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Added Questions</h4>
                    {jobData.exam!.questions.map((question, index) => (
                      <div key={question.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{question.type.replace("-", " ")}</Badge>
                            <span className="font-medium">Question {index + 1}</span>
                            <span className="text-sm text-gray-600">({question.points} pts)</span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{question.question.substring(0, 100)}...</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(question.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!canSubmit}
                className="bg-green-600 hover:bg-green-700"
              >
                Create Job with Exam
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}