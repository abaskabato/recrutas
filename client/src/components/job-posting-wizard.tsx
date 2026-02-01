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
  type: 'custom' | 'third-party' | 'template';
  questions: Question[];
  timeLimit: number; // in minutes
  passingScore: number; // percentage
  thirdPartyUrl?: string; // For external testing platforms
  thirdPartyInstructions?: string;
  allowRetakes?: boolean;
  showResultsImmediately?: boolean;
}

interface Question {
  id: string;
  type: 'multiple-choice' | 'short-answer' | 'essay' | 'coding' | 'file-upload' | 'video-response';
  question: string;
  description?: string; // Additional context or instructions
  options?: string[]; // for multiple choice
  correctAnswer?: number | string; // index for multiple choice, string for short answer
  points: number;
  timeLimit?: number; // per question time limit
  required?: boolean;
  fileTypes?: string[]; // for file upload questions
  maxFileSize?: number; // in MB
  codeLanguage?: string; // for coding questions
  videoMaxDuration?: number; // in seconds for video responses
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
  expiresAt?: Date; // Job expiration date

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
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default: 30 days from now
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
    description: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    points: 10,
    required: true,
    timeLimit: undefined,
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
        correctAnswer: 0,
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
        // Step 3 (Filtering) is optional - allow proceeding with or without exam
        // If filtering is enabled, exam setup is optional (can add questions later)
        return true;
      case 4:
        return true; // Hiring manager info is optional
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

            <div>
              <Label htmlFor="expiresAt">Job Expiry Date *</Label>
              <Input
                id="expiresAt"
                type="date"
                value={jobData.expiresAt ? jobData.expiresAt.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined;
                  setJobData(prev => ({ ...prev, expiresAt: date }));
                }}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-sm text-gray-500 mt-1">
                {jobData.expiresAt && `Job will expire in ${Math.ceil((jobData.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`}
              </p>
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
                      type: 'custom',
                      questions: [],
                      timeLimit: 30,
                      passingScore: 70,
                      allowRetakes: false,
                      showResultsImmediately: true
                    } : undefined
                  }));
                }}
              />
              <Label htmlFor="enableFiltering">Enable automated applicant filtering</Label>
            </div>

            {jobData.enableFiltering && (
              <div className="space-y-6 p-4 border rounded-lg">
                {/* Exam Type Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Assessment Type</Label>
                  <RadioGroup
                    value={jobData.filteringExam?.type || 'custom'}
                    onValueChange={(value: 'custom' | 'third-party' | 'template') =>
                      setJobData(prev => ({
                        ...prev,
                        filteringExam: { ...prev.filteringExam!, type: value }
                      }))
                    }
                    className="grid grid-cols-1 gap-4"
                  >
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <RadioGroupItem value="custom" id="custom" />
                      <div className="flex-1">
                        <Label htmlFor="custom" className="font-medium">Custom Assessment</Label>
                        <p className="text-sm text-gray-600">Create your own questions with multiple formats</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <RadioGroupItem value="third-party" id="third-party" />
                      <div className="flex-1">
                        <Label htmlFor="third-party" className="font-medium">Third-Party Testing Tool</Label>
                        <p className="text-sm text-gray-600">Integrate with external platforms like HackerRank, Codility, etc.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <RadioGroupItem value="template" id="template" />
                      <div className="flex-1">
                        <Label htmlFor="template" className="font-medium">Pre-built Template</Label>
                        <p className="text-sm text-gray-600">Use industry-standard assessment templates</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Third-Party Integration */}
                {jobData.filteringExam?.type === 'third-party' && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">Third-Party Integration</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>Assessment Platform URL</Label>
                        <Input
                          placeholder="https://platform.com/assessment-link"
                          value={jobData.filteringExam?.thirdPartyUrl || ''}
                          onChange={(e) => setJobData(prev => ({
                            ...prev,
                            filteringExam: { ...prev.filteringExam!, thirdPartyUrl: e.target.value }
                          }))}
                        />
                      </div>
                      <div>
                        <Label>Instructions for Candidates</Label>
                        <Textarea
                          placeholder="Provide detailed instructions for accessing the external assessment..."
                          value={jobData.filteringExam?.thirdPartyInstructions || ''}
                          onChange={(e) => setJobData(prev => ({
                            ...prev,
                            filteringExam: { ...prev.filteringExam!, thirdPartyInstructions: e.target.value }
                          }))}
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Basic Settings */}
                <div className="grid grid-cols-2 gap-4">
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

                {/* Advanced Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allowRetakes"
                      checked={jobData.filteringExam?.allowRetakes || false}
                      onCheckedChange={(checked) => setJobData(prev => ({
                        ...prev,
                        filteringExam: { ...prev.filteringExam!, allowRetakes: !!checked }
                      }))}
                    />
                    <Label htmlFor="allowRetakes">Allow retakes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showResults"
                      checked={jobData.filteringExam?.showResultsImmediately !== false}
                      onCheckedChange={(checked) => setJobData(prev => ({
                        ...prev,
                        filteringExam: { ...prev.filteringExam!, showResultsImmediately: !!checked }
                      }))}
                    />
                    <Label htmlFor="showResults">Show results immediately</Label>
                  </div>
                </div>

                <Separator />

                {/* Custom Question Builder */}
                {jobData.filteringExam?.type === 'custom' && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Create Questions</h4>

                    {/* Question Type and Points */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Question Type</Label>
                        <Select
                          value={currentQuestion.type || 'multiple-choice'}
                          onValueChange={(value: any) => setCurrentQuestion(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple-choice">📋 Multiple Choice</SelectItem>
                            <SelectItem value="short-answer">✏️ Short Answer</SelectItem>
                            <SelectItem value="essay">📝 Essay/Long Form</SelectItem>
                            <SelectItem value="coding">💻 Coding Challenge</SelectItem>
                            <SelectItem value="file-upload">📎 File Upload</SelectItem>
                            <SelectItem value="video-response">🎥 Video Response</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={currentQuestion.points || 10}
                          onChange={(e) => setCurrentQuestion(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                          min="1"
                          max="100"
                        />
                      </div>
                    </div>

                    {/* Question Text */}
                    <div>
                      <Label>Question</Label>
                      <Textarea
                        value={currentQuestion.question || ''}
                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                        placeholder="Enter your question here..."
                        rows={3}
                      />
                    </div>

                    {/* Question Description (Optional) */}
                    <div>
                      <Label>Additional Instructions (Optional)</Label>
                      <Textarea
                        value={currentQuestion.description || ''}
                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Provide additional context or specific instructions for this question..."
                        rows={2}
                      />
                    </div>

                    {/* Question-specific settings */}
                    {currentQuestion.type === 'coding' && (
                      <div>
                        <Label>Programming Language</Label>
                        <Select
                          value={currentQuestion.codeLanguage || 'javascript'}
                          onValueChange={(value) => setCurrentQuestion(prev => ({ ...prev, codeLanguage: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="javascript">JavaScript</SelectItem>
                            <SelectItem value="python">Python</SelectItem>
                            <SelectItem value="java">Java</SelectItem>
                            <SelectItem value="cpp">C++</SelectItem>
                            <SelectItem value="go">Go</SelectItem>
                            <SelectItem value="any">Any Language</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {currentQuestion.type === 'file-upload' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Allowed File Types</Label>
                          <Input
                            placeholder="pdf,doc,docx"
                            value={currentQuestion.fileTypes?.join(',') || ''}
                            onChange={(e) => setCurrentQuestion(prev => ({
                              ...prev,
                              fileTypes: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                            }))}
                          />
                        </div>
                        <div>
                          <Label>Max File Size (MB)</Label>
                          <Input
                            type="number"
                            value={currentQuestion.maxFileSize || 10}
                            onChange={(e) => setCurrentQuestion(prev => ({
                              ...prev,
                              maxFileSize: parseInt(e.target.value)
                            }))}
                            min="1"
                            max="50"
                          />
                        </div>
                      </div>
                    )}

                    {currentQuestion.type === 'video-response' && (
                      <div>
                        <Label>Maximum Video Duration (seconds)</Label>
                        <Input
                          type="number"
                          value={currentQuestion.videoMaxDuration || 120}
                          onChange={(e) => setCurrentQuestion(prev => ({
                            ...prev,
                            videoMaxDuration: parseInt(e.target.value)
                          }))}
                          min="30"
                          max="600"
                        />
                      </div>
                    )}

                    {/* Time Limit per Question */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Time Limit per Question (minutes, optional)</Label>
                        <Input
                          type="number"
                          value={currentQuestion.timeLimit || ''}
                          onChange={(e) => setCurrentQuestion(prev => ({
                            ...prev,
                            timeLimit: e.target.value ? parseInt(e.target.value) : undefined
                          }))}
                          placeholder="No limit"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Checkbox
                          id="required"
                          checked={currentQuestion.required !== false}
                          onCheckedChange={(checked) => setCurrentQuestion(prev => ({
                            ...prev,
                            required: !!checked
                          }))}
                        />
                        <Label htmlFor="required">Required question</Label>
                      </div>
                    </div>

                    {/* Multiple Choice Options */}
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

                    <Button onClick={addQuestion} type="button" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </div>
                )}

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