import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  X, 
  Code, 
  FileText, 
  CheckCircle, 
  Clock,
  Users,
  Brain,
  Target,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

interface FilteringExam {
  type: 'multiple-choice' | 'coding' | 'situational' | 'technical';
  questions: Question[];
  timeLimit: number; // in minutes
  passingScore: number; // percentage
  autoReject: boolean;
}

interface Question {
  id: string;
  type: 'multiple-choice' | 'coding' | 'essay' | 'true-false';
  question: string;
  options?: string[]; // for multiple choice
  correctAnswer?: string | number;
  points: number;
  timeLimit?: number; // in minutes for individual questions
}

interface JobPostingData {
  // Basic Info
  title: string;
  company: string;
  description: string;
  requirements: string[];
  skills: string[];
  location: string;
  workType: 'remote' | 'hybrid' | 'onsite';
  salaryMin: number;
  salaryMax: number;
  
  // Advanced Filtering
  enableFiltering: boolean;
  filteringExam?: FilteringExam;
  
  // Direct Connection
  hiringManager: {
    name: string;
    email: string;
    schedulingUrl?: string;
  };
  autoConnectTopCandidates: boolean;
  topCandidateThreshold: number; // top X candidates to auto-connect
}

export default function JobPostingWizard({ 
  onSubmit, 
  onCancel 
}: { 
  onSubmit: (data: JobPostingData) => void;
  onCancel: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [jobData, setJobData] = useState<JobPostingData>({
    title: '',
    company: '',
    description: '',
    requirements: [],
    skills: [],
    location: '',
    workType: 'remote',
    salaryMin: 0,
    salaryMax: 0,
    enableFiltering: false,
    hiringManager: {
      name: '',
      email: '',
    },
    autoConnectTopCandidates: true,
    topCandidateThreshold: 5,
  });

  const [currentRequirement, setCurrentRequirement] = useState('');
  const [currentSkill, setCurrentSkill] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    points: 10,
  });

  const addRequirement = () => {
    if (currentRequirement.trim()) {
      setJobData(prev => ({
        ...prev,
        requirements: [...prev.requirements, currentRequirement.trim()]
      }));
      setCurrentRequirement('');
    }
  };

  const addSkill = () => {
    if (currentSkill.trim()) {
      setJobData(prev => ({
        ...prev,
        skills: [...prev.skills, currentSkill.trim()]
      }));
      setCurrentSkill('');
    }
  };

  const addQuestion = () => {
    if (currentQuestion.question?.trim()) {
      const newQuestion: Question = {
        id: Date.now().toString(),
        type: currentQuestion.type as Question['type'],
        question: currentQuestion.question,
        options: currentQuestion.type === 'multiple-choice' ? currentQuestion.options : undefined,
        correctAnswer: currentQuestion.correctAnswer,
        points: currentQuestion.points || 10,
        timeLimit: currentQuestion.timeLimit,
      };

      setJobData(prev => ({
        ...prev,
        filteringExam: {
          ...prev.filteringExam!,
          questions: [...(prev.filteringExam?.questions || []), newQuestion]
        }
      }));

      // Reset current question
      setCurrentQuestion({
        type: 'multiple-choice',
        question: '',
        options: ['', '', '', ''],
        points: 10,
      });
    }
  };

  const removeQuestion = (questionId: string) => {
    setJobData(prev => ({
      ...prev,
      filteringExam: {
        ...prev.filteringExam!,
        questions: prev.filteringExam?.questions.filter(q => q.id !== questionId) || []
      }
    }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      onSubmit(jobData);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return jobData.title && jobData.company && jobData.description && jobData.location;
      case 2:
        return jobData.requirements.length > 0 && jobData.skills.length > 0;
      case 3:
        return !jobData.enableFiltering || (
          jobData.filteringExam && 
          jobData.filteringExam.questions.length > 0 &&
          jobData.filteringExam.timeLimit > 0 &&
          jobData.filteringExam.passingScore > 0
        );
      case 4:
        return jobData.hiringManager.name && jobData.hiringManager.email;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep >= step 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
              </div>
              {step < 4 && (
                <div className={`
                  flex-1 h-1 mx-4
                  ${currentStep > step ? 'bg-purple-600' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>Basic Info</span>
          <span>Requirements</span>
          <span>Filtering</span>
          <span>Connection</span>
        </div>
      </div>

      {/* Step 1: Basic Job Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Basic Job Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={jobData.title}
                  onChange={(e) => setJobData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>
              <div>
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  value={jobData.company}
                  onChange={(e) => setJobData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="e.g. Tech Corp"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                value={jobData.description}
                onChange={(e) => setJobData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={jobData.location}
                  onChange={(e) => setJobData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. San Francisco, CA"
                />
              </div>
              <div>
                <Label htmlFor="workType">Work Type</Label>
                <Select 
                  value={jobData.workType} 
                  onValueChange={(value: any) => setJobData(prev => ({ ...prev, workType: value }))}
                >
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="salaryMin">Minimum Salary</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  value={jobData.salaryMin || ''}
                  onChange={(e) => setJobData(prev => ({ ...prev, salaryMin: parseInt(e.target.value) || 0 }))}
                  placeholder="80000"
                />
              </div>
              <div>
                <Label htmlFor="salaryMax">Maximum Salary</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  value={jobData.salaryMax || ''}
                  onChange={(e) => setJobData(prev => ({ ...prev, salaryMax: parseInt(e.target.value) || 0 }))}
                  placeholder="120000"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Requirements and Skills */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Requirements & Skills</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Job Requirements</Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  value={currentRequirement}
                  onChange={(e) => setCurrentRequirement(e.target.value)}
                  placeholder="e.g. 5+ years of experience with React"
                  onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
                />
                <Button onClick={addRequirement} type="button">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {jobData.requirements.map((req, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <span>{req}</span>
                    <button
                      onClick={() => setJobData(prev => ({
                        ...prev,
                        requirements: prev.requirements.filter((_, i) => i !== index)
                      }))}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <Label>Required Skills</Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  value={currentSkill}
                  onChange={(e) => setCurrentSkill(e.target.value)}
                  placeholder="e.g. JavaScript, Python, AWS"
                  onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                />
                <Button onClick={addSkill} type="button">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {jobData.skills.map((skill, index) => (
                  <Badge key={index} variant="outline" className="flex items-center space-x-1">
                    <span>{skill}</span>
                    <button
                      onClick={() => setJobData(prev => ({
                        ...prev,
                        skills: prev.skills.filter((_, i) => i !== index)
                      }))}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Filtering Exam */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5" />
              <span>Automated Filtering</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="enableFiltering"
                checked={jobData.enableFiltering}
                onCheckedChange={(checked) => {
                  setJobData(prev => ({ 
                    ...prev, 
                    enableFiltering: !!checked,
                    filteringExam: checked ? {
                      type: 'multiple-choice',
                      questions: [],
                      timeLimit: 30,
                      passingScore: 70,
                      autoReject: false
                    } : undefined
                  }));
                }}
              />
              <Label htmlFor="enableFiltering">Enable automated applicant filtering</Label>
            </div>

            {jobData.enableFiltering && (
              <div className="space-y-6 p-4 border rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Exam Type</Label>
                    <Select 
                      value={jobData.filteringExam?.type || 'multiple-choice'} 
                      onValueChange={(value: any) => setJobData(prev => ({
                        ...prev,
                        filteringExam: { ...prev.filteringExam!, type: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                        <SelectItem value="coding">Coding Challenge</SelectItem>
                        <SelectItem value="situational">Situational</SelectItem>
                        <SelectItem value="technical">Technical Essay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Time Limit (minutes)</Label>
                    <Input
                      type="number"
                      value={jobData.filteringExam?.timeLimit || 30}
                      onChange={(e) => setJobData(prev => ({
                        ...prev,
                        filteringExam: { ...prev.filteringExam!, timeLimit: parseInt(e.target.value) }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Passing Score (%)</Label>
                    <Input
                      type="number"
                      value={jobData.filteringExam?.passingScore || 70}
                      onChange={(e) => setJobData(prev => ({
                        ...prev,
                        filteringExam: { ...prev.filteringExam!, passingScore: parseInt(e.target.value) }
                      }))}
                    />
                  </div>
                </div>

                <Separator />

                {/* Question Builder */}
                <div className="space-y-4">
                  <h4 className="font-medium">Add Questions</h4>
                  
                  <div>
                    <Label>Question</Label>
                    <Textarea
                      value={currentQuestion.question || ''}
                      onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                      placeholder="Enter your question here..."
                      rows={3}
                    />
                  </div>

                  {currentQuestion.type === 'multiple-choice' && (
                    <div>
                      <Label>Answer Options</Label>
                      <div className="space-y-2 mt-2">
                        {currentQuestion.options?.map((option, index) => (
                          <div key={index} className="flex space-x-2">
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(currentQuestion.options || [])];
                                newOptions[index] = e.target.value;
                                setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
                              }}
                              placeholder={`Option ${index + 1}`}
                            />
                            <RadioGroup 
                              value={currentQuestion.correctAnswer?.toString()}
                              onValueChange={(value) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: parseInt(value) }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                                <Label htmlFor={`option-${index}`} className="text-sm">Correct</Label>
                              </div>
                            </RadioGroup>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Points</Label>
                      <Input
                        type="number"
                        value={currentQuestion.points || 10}
                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>Time Limit (minutes, optional)</Label>
                      <Input
                        type="number"
                        value={currentQuestion.timeLimit || ''}
                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || undefined }))}
                      />
                    </div>
                  </div>

                  <Button onClick={addQuestion} type="button" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </div>

                {/* Questions List */}
                {jobData.filteringExam?.questions && jobData.filteringExam.questions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Questions ({jobData.filteringExam.questions.length})</h4>
                    {jobData.filteringExam.questions.map((question, index) => (
                      <div key={question.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">Q{index + 1}: {question.question}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {question.points} points • {question.type}
                              {question.timeLimit && ` • ${question.timeLimit} min`}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeQuestion(question.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Direct Connection Setup */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Direct Connection Setup</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="managerName">Hiring Manager Name *</Label>
                <Input
                  id="managerName"
                  value={jobData.hiringManager.name}
                  onChange={(e) => setJobData(prev => ({
                    ...prev,
                    hiringManager: { ...prev.hiringManager, name: e.target.value }
                  }))}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <Label htmlFor="managerEmail">Hiring Manager Email *</Label>
                <Input
                  id="managerEmail"
                  type="email"
                  value={jobData.hiringManager.email}
                  onChange={(e) => setJobData(prev => ({
                    ...prev,
                    hiringManager: { ...prev.hiringManager, email: e.target.value }
                  }))}
                  placeholder="john@company.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="schedulingUrl">Scheduling URL (Optional)</Label>
              <Input
                id="schedulingUrl"
                value={jobData.hiringManager.schedulingUrl || ''}
                onChange={(e) => setJobData(prev => ({
                  ...prev,
                  hiringManager: { ...prev.hiringManager, schedulingUrl: e.target.value }
                }))}
                placeholder="https://calendly.com/john-smith"
              />
              <p className="text-sm text-gray-600 mt-1">
                Add your Calendly, Acuity, or other scheduling link for direct candidate booking
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="autoConnect"
                  checked={jobData.autoConnectTopCandidates}
                  onCheckedChange={(checked) => setJobData(prev => ({ 
                    ...prev, 
                    autoConnectTopCandidates: !!checked 
                  }))}
                />
                <Label htmlFor="autoConnect">Automatically connect with top-ranked candidates</Label>
              </div>

              {jobData.autoConnectTopCandidates && (
                <div>
                  <Label htmlFor="threshold">Number of top candidates to auto-connect</Label>
                  <Select 
                    value={jobData.topCandidateThreshold.toString()} 
                    onValueChange={(value) => setJobData(prev => ({ 
                      ...prev, 
                      topCandidateThreshold: parseInt(value) 
                    }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Top 3</SelectItem>
                      <SelectItem value="5">Top 5</SelectItem>
                      <SelectItem value="10">Top 10</SelectItem>
                      <SelectItem value="15">Top 15</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Direct Hiring Process</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Candidates apply and complete your filtering exam (if enabled)</li>
                <li>• System automatically ranks candidates based on scores and profile match</li>
                <li>• Top candidates receive direct chat access to hiring manager</li>
                <li>• Scheduling integration enables immediate interview booking</li>
                <li>• No recruiter intermediary - direct candidate-to-company connection</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={currentStep === 1 ? onCancel : prevStep}>
          {currentStep === 1 ? 'Cancel' : (
            <>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </>
          )}
        </Button>
        <Button 
          onClick={nextStep} 
          disabled={!canProceed()}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {currentStep === 4 ? 'Create Job Posting' : (
            <>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}