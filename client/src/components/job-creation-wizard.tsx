import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Building, MapPin, DollarSign, Users, Clock, Briefcase, Star, ArrowLeft, ArrowRight, Check, X, Plus, Target, Zap, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface JobCreationWizardProps {
  open: boolean;
  onClose: () => void;
  editingJob?: any;
}

interface JobFormData {
  title: string;
  company: string;
  description: string;
  requirements: string[];
  skills: string[];
  location: string;
  salaryMin: string;
  salaryMax: string;
  workType: 'remote' | 'hybrid' | 'onsite';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  jobType: 'full-time' | 'part-time' | 'contract' | 'internship';
  industry: string;
  benefits: string[];
  urgency: 'low' | 'medium' | 'high';
  hasExam: boolean;
  examPassingScore: number;
  companySize: string;
  teamSize: string;
  reportingStructure: string;
}

const initialFormData: JobFormData = {
  title: '',
  company: '',
  description: '',
  requirements: [],
  skills: [],
  location: '',
  salaryMin: '',
  salaryMax: '',
  workType: 'remote',
  experienceLevel: 'mid',
  jobType: 'full-time',
  industry: '',
  benefits: [],
  urgency: 'medium',
  hasExam: true,
  examPassingScore: 70,
  companySize: '',
  teamSize: '',
  reportingStructure: ''
};

const steps = [
  { id: 'basics', title: 'Job Basics', description: 'Title, company, and role type' },
  { id: 'details', title: 'Job Details', description: 'Description and requirements' },
  { id: 'compensation', title: 'Compensation', description: 'Salary and benefits' },
  { id: 'requirements', title: 'Requirements', description: 'Skills and experience' },
  { id: 'assessment', title: 'Assessment', description: 'Merit-based access setup' },
  { id: 'review', title: 'Review', description: 'Final review and publish' }
];

const commonSkills = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C++', 'SQL', 'AWS', 'Docker',
  'Kubernetes', 'Git', 'HTML', 'CSS', 'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL', 'REST APIs',
  'Machine Learning', 'Data Analysis', 'Project Management', 'Agile', 'Scrum', 'Leadership',
  'Communication', 'Problem Solving', 'Critical Thinking', 'Teamwork'
];

const commonBenefits = [
  'Health Insurance', 'Dental Insurance', 'Vision Insurance', '401(k) Matching', 'Flexible PTO',
  'Remote Work', 'Flexible Hours', 'Professional Development', 'Conference Budget', 'Gym Membership',
  'Lunch Stipend', 'Commuter Benefits', 'Stock Options', 'Bonus Eligibility', 'Parental Leave',
  'Mental Health Support', 'Home Office Setup', 'Learning & Development Budget'
];

const industries = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing', 'Real Estate',
  'Marketing', 'Media', 'Government', 'Non-Profit', 'Consulting', 'Legal', 'Energy', 'Transportation',
  'Entertainment', 'Food & Beverage', 'Fashion', 'Sports', 'Travel'
];

export function JobCreationWizard({ open, onClose, editingJob }: JobCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skillInput, setSkillInput] = useState('');
  const [requirementInput, setRequirementInput] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize form data when editing
  useEffect(() => {
    if (editingJob) {
      setFormData({
        title: editingJob.title || '',
        company: editingJob.company || '',
        description: editingJob.description || '',
        requirements: editingJob.requirements || [],
        skills: editingJob.skills || [],
        location: editingJob.location || '',
        salaryMin: editingJob.salaryMin?.toString() || '',
        salaryMax: editingJob.salaryMax?.toString() || '',
        workType: editingJob.workType || 'remote',
        experienceLevel: editingJob.experienceLevel || 'mid',
        jobType: editingJob.jobType || 'full-time',
        industry: editingJob.industry || '',
        benefits: editingJob.benefits || [],
        urgency: editingJob.urgency || 'medium',
        hasExam: editingJob.hasExam ?? true,
        examPassingScore: editingJob.examPassingScore || 70,
        companySize: editingJob.companySize || '',
        teamSize: editingJob.teamSize || '',
        reportingStructure: editingJob.reportingStructure || ''
      });
    } else {
      setFormData(initialFormData);
    }
  }, [editingJob]);

  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingJob ? `/api/jobs/${editingJob.id}` : '/api/jobs';
      const method = editingJob ? 'PUT' : 'POST';
      return await apiRequest(url, { method, body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: editingJob ? "Job Updated" : "Job Posted",
        description: editingJob ? "Job posting updated successfully" : "Job posting created successfully",
      });
      onClose();
      setCurrentStep(0);
      setFormData(initialFormData);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save job posting",
        variant: "destructive"
      });
    }
  });

  const updateFormData = (field: keyof JobFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      updateFormData('skills', [...formData.skills, skill]);
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    updateFormData('skills', formData.skills.filter(skill => skill !== skillToRemove));
  };

  const addRequirement = (requirement: string) => {
    if (requirement && !formData.requirements.includes(requirement)) {
      updateFormData('requirements', [...formData.requirements, requirement]);
      setRequirementInput('');
    }
  };

  const removeRequirement = (requirementToRemove: string) => {
    updateFormData('requirements', formData.requirements.filter(req => req !== requirementToRemove));
  };

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepIndex) {
      case 0: // Basics
        if (!formData.title.trim()) newErrors.title = 'Job title is required';
        if (!formData.company.trim()) newErrors.company = 'Company name is required';
        if (!formData.location.trim()) newErrors.location = 'Location is required';
        break;
      case 1: // Details
        if (!formData.description.trim()) newErrors.description = 'Job description is required';
        if (formData.requirements.length === 0) newErrors.requirements = 'At least one requirement is needed';
        break;
      case 2: // Compensation
        if (!formData.salaryMin && !formData.salaryMax) {
          newErrors.salary = 'Please provide salary information';
        }
        break;
      case 3: // Requirements
        if (formData.skills.length === 0) newErrors.skills = 'At least one skill is required';
        break;
      case 4: // Assessment
        if (formData.hasExam && (formData.examPassingScore < 50 || formData.examPassingScore > 100)) {
          newErrors.examPassingScore = 'Passing score must be between 50-100';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      // Convert form data to API format
      const jobData = {
        ...formData,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
      };
      createJobMutation.mutate(jobData);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {editingJob ? 'Edit Job Posting' : 'Create New Job Posting'}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{steps[currentStep].title}</span>
              <span>{currentStep + 1} of {steps.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-6">
          {/* Step 0: Basics */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Let's start with the basics</h3>
                <p className="text-gray-600 dark:text-gray-400">Tell us about the role and your company</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company Name *</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => updateFormData('company', e.target.value)}
                    placeholder="e.g., TechCorp Inc."
                    className={errors.company ? 'border-red-500' : ''}
                  />
                  {errors.company && <p className="text-sm text-red-500">{errors.company}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateFormData('location', e.target.value)}
                    placeholder="e.g., San Francisco, CA or Remote"
                    className={errors.location ? 'border-red-500' : ''}
                  />
                  {errors.location && <p className="text-sm text-red-500">{errors.location}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={formData.industry} onValueChange={(value) => updateFormData('industry', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map(industry => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Work Type</Label>
                  <RadioGroup
                    value={formData.workType}
                    onValueChange={(value) => updateFormData('workType', value)}
                    className="flex space-x-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="remote" id="remote" />
                      <Label htmlFor="remote">Remote</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hybrid" id="hybrid" />
                      <Label htmlFor="hybrid">Hybrid</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="onsite" id="onsite" />
                      <Label htmlFor="onsite">On-site</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Job Type</Label>
                  <Select value={formData.jobType} onValueChange={(value) => updateFormData('jobType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Job Details</h3>
                <p className="text-gray-600 dark:text-gray-400">Describe the role and what you're looking for</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="description">Job Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
                    rows={8}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements *</Label>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        value={requirementInput}
                        onChange={(e) => setRequirementInput(e.target.value)}
                        placeholder="Add a requirement"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addRequirement(requirementInput);
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        onClick={() => addRequirement(requirementInput)}
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {formData.requirements.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.requirements.map((req, index) => (
                          <Badge key={index} variant="secondary" className="text-sm">
                            {req}
                            <button
                              onClick={() => removeRequirement(req)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.requirements && <p className="text-sm text-red-500">{errors.requirements}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Experience Level</Label>
                  <Select value={formData.experienceLevel} onValueChange={(value) => updateFormData('experienceLevel', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                      <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                      <SelectItem value="senior">Senior Level (5+ years)</SelectItem>
                      <SelectItem value="executive">Executive Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Compensation */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Compensation & Benefits</h3>
                <p className="text-gray-600 dark:text-gray-400">Set competitive compensation and benefits</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="salaryMin">Minimum Salary ($)</Label>
                    <Input
                      id="salaryMin"
                      type="number"
                      value={formData.salaryMin}
                      onChange={(e) => updateFormData('salaryMin', e.target.value)}
                      placeholder="e.g., 80000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryMax">Maximum Salary ($)</Label>
                    <Input
                      id="salaryMax"
                      type="number"
                      value={formData.salaryMax}
                      onChange={(e) => updateFormData('salaryMax', e.target.value)}
                      placeholder="e.g., 120000"
                    />
                  </div>
                </div>
                {errors.salary && <p className="text-sm text-red-500">{errors.salary}</p>}

                <div className="space-y-2">
                  <Label>Benefits</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {commonBenefits.map(benefit => (
                      <div key={benefit} className="flex items-center space-x-2">
                        <Checkbox
                          id={benefit}
                          checked={formData.benefits.includes(benefit)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateFormData('benefits', [...formData.benefits, benefit]);
                            } else {
                              updateFormData('benefits', formData.benefits.filter(b => b !== benefit));
                            }
                          }}
                        />
                        <Label htmlFor={benefit} className="text-sm">{benefit}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Requirements */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Skills & Requirements</h3>
                <p className="text-gray-600 dark:text-gray-400">Define the skills and qualifications needed</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="skills">Required Skills *</Label>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        placeholder="Add a skill"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSkill(skillInput);
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        onClick={() => addSkill(skillInput)}
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Common skills suggestions */}
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Popular skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {commonSkills.slice(0, 10).map(skill => (
                          <Badge 
                            key={skill} 
                            variant="outline" 
                            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => addSkill(skill)}
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {formData.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-sm">
                            {skill}
                            <button
                              onClick={() => removeSkill(skill)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.skills && <p className="text-sm text-red-500">{errors.skills}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Priority Level</Label>
                  <RadioGroup
                    value={formData.urgency}
                    onValueChange={(value) => updateFormData('urgency', value)}
                    className="flex space-x-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="low" />
                      <Label htmlFor="low">Low Priority</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium">Medium Priority</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="high" />
                      <Label htmlFor="high">High Priority</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Assessment */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Merit-Based Access</h3>
                <p className="text-gray-600 dark:text-gray-400">Set up the assessment system for candidate qualification</p>
              </div>

              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Recrutas uses merit-based access: candidates must pass your assessment to unlock direct chat access with you.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasExam"
                      checked={formData.hasExam}
                      onCheckedChange={(checked) => updateFormData('hasExam', checked)}
                    />
                    <Label htmlFor="hasExam" className="text-base">
                      Enable assessment for this position
                    </Label>
                  </div>

                  {formData.hasExam && (
                    <div className="ml-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="examPassingScore">Passing Score (%)</Label>
                        <div className="flex items-center space-x-4">
                          <Input
                            id="examPassingScore"
                            type="number"
                            min="50"
                            max="100"
                            value={formData.examPassingScore}
                            onChange={(e) => updateFormData('examPassingScore', parseInt(e.target.value))}
                            className="w-32"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Candidates need {formData.examPassingScore}% to unlock chat
                          </span>
                        </div>
                        {errors.examPassingScore && <p className="text-sm text-red-500">{errors.examPassingScore}</p>}
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                          Assessment Details
                        </h4>
                        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                          <li>• AI-generated questions based on job requirements</li>
                          <li>• Multiple choice and short answer format</li>
                          <li>• Automatically scored and evaluated</li>
                          <li>• Only qualified candidates can message you</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Review & Publish</h3>
                <p className="text-gray-600 dark:text-gray-400">Review your job posting before publishing</p>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Briefcase className="h-5 w-5" />
                      <span>{formData.title}</span>
                    </CardTitle>
                    <CardDescription>
                      {formData.company} • {formData.location} • {formData.workType}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Job Description</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                        {formData.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Key Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {formData.skills.slice(0, 5).map(skill => (
                          <Badge key={skill} variant="outline">{skill}</Badge>
                        ))}
                        {formData.skills.length > 5 && (
                          <Badge variant="outline">+{formData.skills.length - 5} more</Badge>
                        )}
                      </div>
                    </div>

                    {(formData.salaryMin || formData.salaryMax) && (
                      <div>
                        <h4 className="font-medium mb-2">Compensation</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formData.salaryMin && formData.salaryMax
                            ? `$${parseInt(formData.salaryMin).toLocaleString()} - $${parseInt(formData.salaryMax).toLocaleString()}`
                            : formData.salaryMin
                              ? `From $${parseInt(formData.salaryMin).toLocaleString()}`
                              : `Up to $${parseInt(formData.salaryMax).toLocaleString()}`
                          }
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium mb-2">Assessment</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formData.hasExam 
                          ? `Enabled with ${formData.examPassingScore}% passing score`
                          : 'Disabled - direct applications allowed'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Once published, your job will be visible to candidates and AI matching will begin automatically.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <Button 
            variant="outline" 
            onClick={currentStep === 0 ? onClose : handleBack}
            disabled={createJobMutation.isPending}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          
          <div className="flex space-x-2">
            {currentStep < steps.length - 1 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={createJobMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createJobMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingJob ? 'Updating...' : 'Publishing...'}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {editingJob ? 'Update Job' : 'Publish Job'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}