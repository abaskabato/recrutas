import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { useLocation } from "wouter";
import { apiRequest, fetchProfileWithCache } from "@/lib/queryClient";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { US_METROS } from "@/lib/us-metros";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, FileText, Globe, Github, Linkedin, User, Sparkles, 
  X, Check, Briefcase, ArrowRight, ArrowLeft, PartyPopper,
  MapPin, DollarSign, Building, Clock, Award
} from "lucide-react";
import { Badge } from "./ui/badge";

interface ExtractedInfo {
  skills: {
    technical: string[];
    soft: string[];
    tools: string[];
  };
  experience: {
    level: string;
    years: number;
    positions: Array<{
      title: string;
      company: string;
      duration: string;
      description?: string;
    }>;
  };
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    year?: string;
  }>;
  certifications: string[];
  projects: Array<{
    name: string;
    description?: string;
    technologies?: string[];
  }>;
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    website: string;
  };
  skillsCount: number;
  workHistoryCount: number;
  educationCount: number;
  certificationsCount: number;
  projectsCount: number;
}

interface ProfileWizardProps {
  onComplete?: () => void;
}

interface JobPreferences {
  salaryMin?: number;
  salaryMax?: number;
  commitmentTypes?: string[];
  experienceLevels?: string[];
  industries?: string[];
  workTypes?: string[];
  companySizes?: string[];
  preferredLocations?: string[];
  maxTravelDays?: number;
}

const STEPS = [
  { id: 1, title: "Resume", description: "Upload your resume" },
  { id: 2, title: "Profile", description: "Skills & Experience" },
  { id: 3, title: "Preferences", description: "Location & Job prefs" },
  { id: 4, title: "Links", description: "Professional links" },
  { id: 5, title: "Done", description: "Ready to match!" },
];

export default function ProfileWizard({ onComplete }: ProfileWizardProps) {
  const { session } = useSessionContext();
  const [, setNavigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [profileLinks, setProfileLinks] = useState({
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    personalWebsite: '',
  });
  const [jobPreferences, setJobPreferences] = useState<JobPreferences>({
    salaryMin: undefined,
    salaryMax: undefined,
    commitmentTypes: [],
    experienceLevels: [],
    industries: [],
    workTypes: [],
    companySizes: [],
    preferredLocations: [],
    maxTravelDays: 0
  });
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [parsedResumeData, setParsedResumeData] = useState<ExtractedInfo | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [userLocation, setUserLocation] = useState('');
  const [uploadElapsed, setUploadElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['/api/candidate/profile'],
    queryFn: fetchProfileWithCache,
    enabled: !!session,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    initialData: null,
  });

  useEffect(() => {
    if (profile && typeof profile === 'object') {
      setUserLocation((profile as any).location || '');
      setProfileLinks({
        linkedinUrl: (profile as any).linkedinUrl || '',
        githubUrl: (profile as any).githubUrl || '',
        portfolioUrl: (profile as any).portfolioUrl || '',
        personalWebsite: (profile as any).personalWebsite || '',
      });

      const prefs = (profile as any).jobPreferences || {};
      const WORK_TYPE_VALUES = ['Remote', 'Hybrid', 'Onsite'];
      const legacyCompanySizes: string[] = prefs.companySizes || [];
      const migratedWorkTypes: string[] = prefs.workTypes
        || legacyCompanySizes.filter((v: string) => WORK_TYPE_VALUES.includes(v));
      const cleanedCompanySizes: string[] = legacyCompanySizes.filter(
        (v: string) => !WORK_TYPE_VALUES.includes(v)
      );
      setJobPreferences({
        salaryMin: prefs.salaryMin || undefined,
        salaryMax: prefs.salaryMax || undefined,
        commitmentTypes: prefs.commitmentTypes || [],
        experienceLevels: prefs.experienceLevels || [],
        industries: prefs.industries || [],
        workTypes: migratedWorkTypes,
        companySizes: cleanedCompanySizes,
        preferredLocations: prefs.preferredLocations || [],
        maxTravelDays: prefs.maxTravelDays || 0
      });

      if ((profile as any).resumeUrl) {
        const savedSkills: string[] = (profile as any).skills || [];
        const savedExperienceLevel: string = (profile as any).experienceLevel || '';
        const savedPositions = (profile as any).resumeParsingData?.positions || [];

        // If skills were cleared, stay on step 1 so user can re-upload
        if (savedSkills.length === 0 && !savedExperienceLevel) {
          setCurrentStep(1);
        } else {
          setCurrentStep(2);
          // Populate parsedResumeData from saved profile so step 2 shows existing skills/experience
          if (savedSkills.length > 0 || savedExperienceLevel) {
            setParsedResumeData(prev => prev ?? {
              skills: { technical: savedSkills, soft: [], tools: [] },
              experience: { level: savedExperienceLevel, years: 0, positions: savedPositions },
              education: [],
              certifications: [],
              projects: [],
              personalInfo: { name: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '' },
              skillsCount: savedSkills.length,
              workHistoryCount: savedPositions.length,
              educationCount: 0,
              certificationsCount: 0,
              projectsCount: 0,
            } as any);
          }
        }
      }
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const hasParsedData = parsedResumeData && (
        parsedResumeData.skills?.technical?.length > 0 ||
        parsedResumeData.skills?.soft?.length > 0 ||
        parsedResumeData.skills?.tools?.length > 0
      );

      const profileDataToSave: Partial<any> = { ...profileLinks };
      
      if (hasParsedData) {
        profileDataToSave.skills = [
          ...(parsedResumeData.skills?.technical || []),
          ...(parsedResumeData.skills?.soft || []),
          ...(parsedResumeData.skills?.tools || []),
        ];
        if (parsedResumeData.experience?.level) {
          profileDataToSave.experienceLevel = parsedResumeData.experience.level;
        }
      }

      await apiRequest('POST', '/api/candidate/profile', { ...profileDataToSave, location: userLocation });
      await apiRequest('PUT', '/api/candidate/preferences', { jobPreferences });
    },
    onSuccess: () => {
      track('guided_setup_completed', { had_resume: !!parsedResumeData });
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-matches'] });
      setParsedResumeData(null);
      onComplete?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setUploadElapsed(0);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      const response = await fetch('/api/candidate/resume', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: (data) => {
      setParsedResumeData(data.extractedInfo ?? null);
      setPendingFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/profile'] });
      toast({
        title: "Resume Uploaded!",
        description: "We've extracted your information. Review and confirm below.",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
      setPendingFile(null);
    },
  });

  useEffect(() => {
    if (uploadMutation.isPending) {
      const interval = setInterval(() => setUploadElapsed(e => e + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [uploadMutation.isPending]);

  const handleConfirmUpload = () => {
    if (pendingFile) uploadMutation.mutate(pendingFile);
  };

  const handleCancelUpload = () => {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleArrayPreference = (field: keyof JobPreferences, value: string) => {
    setJobPreferences(prev => {
      const current = (prev[field] || []) as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      }
      return { ...prev, [field]: [...current, value] };
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!(profile as any)?.resumeUrl || parsedResumeData;
      case 2:
        return true;
      case 3:
        return !!userLocation;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    await saveMutation.mutateAsync();
    setCurrentStep(5);
  };

  const progress = (currentStep / 5) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-900 dark:text-white">
            Step {currentStep} of 5
          </span>
          <span className="text-gray-500">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step Indicators */}
        <div className="flex justify-between pt-2">
          {STEPS.map((step) => (
            <div 
              key={step.id}
              className={`flex flex-col items-center ${
                step.id === currentStep 
                  ? 'text-emerald-600' 
                  : step.id < currentStep 
                    ? 'text-emerald-500' 
                    : 'text-gray-300'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step.id === currentStep 
                  ? 'bg-emerald-100 dark:bg-emerald-900' 
                  : step.id < currentStep 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                {step.id < currentStep ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        {currentStep === 1 && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Upload Your Resume
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload your resume and we'll automatically extract your skills, experience, and more.
            </p>
          </CardHeader>
        )}
        
        {currentStep === 1 && (
          <CardContent className="space-y-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept=".pdf,.doc,.docx" 
              className="hidden" 
            />
            <Button 
              variant="outline" 
              className="flex items-center space-x-3 p-6 h-auto justify-start w-full border-2 border-dashed"
              onClick={() => fileInputRef.current?.click()} 
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <span>Scanning... {uploadElapsed}s</span>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-blue-600" />
                  <span>{(profile as any)?.resumeUrl ? 'Update Resume' : 'Upload Resume (PDF/DOC)'}</span>
                </>
              )}
            </Button>

            {pendingFile && !uploadMutation.isPending && (
              <div className="p-4 border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">{pendingFile.name}</p>
                    <p className="text-xs text-blue-600">{(pendingFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleConfirmUpload} className="bg-blue-600 hover:bg-blue-700">
                    <Check className="h-4 w-4 mr-1" /> Confirm & Upload
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelUpload}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {parsedResumeData && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                  <Check className="h-4 w-4" /> Resume scanned! Review in next step.
                </p>
              </div>
            )}

            {(profile as any)?.resumeUrl && !parsedResumeData && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                  <Check className="h-4 w-4" /> You have a resume on file!
                </p>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Why upload?</strong> Candidates with resumes get 3x more interview requests. 
                We'll extract your skills and experience automatically.
              </p>
            </div>
          </CardContent>
        )}

        {currentStep === 2 && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Your Profile
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Review and edit the skills and experience extracted from your resume.
            </p>
          </CardHeader>
        )}

        {currentStep === 2 && (
          <CardContent className="space-y-6">
            {parsedResumeData ? (
              <>
                {/* Skills from Resume */}
                <div className="space-y-3">
                  <Label className="font-semibold flex items-center gap-2">
                    <Award className="h-4 w-4" /> Skills ({parsedResumeData.skillsCount})
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ...(parsedResumeData.skills.technical || []),
                      ...(parsedResumeData.skills.soft || []),
                      ...(parsedResumeData.skills.tools || []),
                    ].map((skill: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <button onClick={() => {
                          const newSkills = { ...parsedResumeData.skills };
                          newSkills.technical = newSkills.technical.filter((s: string) => s !== skill);
                          newSkills.soft = newSkills.soft.filter((s: string) => s !== skill);
                          newSkills.tools = newSkills.tools.filter((s: string) => s !== skill);
                          setParsedResumeData({ ...parsedResumeData, skills: newSkills });
                        }}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Experience */}
                <div className="space-y-3">
                  <Label className="font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Experience Level
                  </Label>
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {parsedResumeData.experience?.level || 'Not detected'} 
                    {parsedResumeData.experience?.years > 0 && ` (${parsedResumeData.experience.years} years)`}
                  </Badge>
                </div>

                {/* Work History */}
                {parsedResumeData.experience?.positions?.length > 0 && (
                  <div className="space-y-3">
                    <Label className="font-semibold">Work History ({parsedResumeData.experience.positions.length})</Label>
                    <div className="space-y-2">
                      {parsedResumeData.experience.positions.map((pos: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium">{pos.title}</p>
                          <p className="text-sm text-gray-600">{pos.company}</p>
                          {pos.duration && <p className="text-xs text-gray-500">{pos.duration}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No resume data available</p>
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="mt-3">
                  Go back to upload
                </Button>
              </div>
            )}

            {/* Existing Skills from Profile */}
            {(profile as any)?.skills?.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Your Saved Skills</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={async () => {
                        if (!confirm('This will clear all your skills and take you back to upload a new resume. Continue?')) return;
                        try {
                          await apiRequest('POST', '/api/candidate/profile', { skills: [], experienceLevel: null, experience: null });
                          setParsedResumeData(null);
                          setCurrentStep(1);
                          queryClient.invalidateQueries({ queryKey: ['/api/candidate/profile'] });
                          queryClient.removeQueries({ queryKey: ['/api/ai-matches'] });
                          toast({ title: 'Skills & experience cleared', description: 'Upload a new resume to extract fresh skills.' });
                        } catch {
                          toast({ title: 'Failed to clear skills', variant: 'destructive' });
                        }
                      }}
                    >
                      Clear all
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(profile as any).skills.map((skill: string, idx: number) => (
                      <Badge key={idx} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        )}

        {currentStep === 3 && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              Job Preferences
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tell us what kind of jobs you're looking for so we can find the best matches.
            </p>
          </CardHeader>
        )}

        {currentStep === 3 && (
          <CardContent className="space-y-6">
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Where are you located?
              </Label>
              <Select value={userLocation} onValueChange={setUserLocation}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select your location" />
                </SelectTrigger>
                <SelectContent>
                  {userLocation && !US_METROS.includes(userLocation as typeof US_METROS[number]) && (
                    <SelectItem value={userLocation}>{userLocation} (current)</SelectItem>
                  )}
                  {US_METROS.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Salary Range */}
            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Expected Salary (Annual)
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salaryMin" className="text-sm text-gray-600">Minimum</Label>
                  <Input 
                    id="salaryMin" 
                    type="number" 
                    placeholder="50000" 
                    value={jobPreferences.salaryMin || ''} 
                    onChange={(e) => {
                      setSalaryError(null);
                      setJobPreferences({...jobPreferences, salaryMin: e.target.value ? parseInt(e.target.value) : undefined});
                    }} 
                  />
                </div>
                <div>
                  <Label htmlFor="salaryMax" className="text-sm text-gray-600">Maximum</Label>
                  <Input 
                    id="salaryMax" 
                    type="number" 
                    placeholder="150000" 
                    value={jobPreferences.salaryMax || ''} 
                    onChange={(e) => {
                      setSalaryError(null);
                      setJobPreferences({...jobPreferences, salaryMax: e.target.value ? parseInt(e.target.value) : undefined});
                    }} 
                  />
                </div>
              </div>
              {salaryError && <p className="text-sm text-red-500">{salaryError}</p>}
            </div>

            <Separator />

            {/* Work Type */}
            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                <Building className="h-4 w-4" /> Work Arrangement
              </Label>
              <div className="flex flex-wrap gap-2">
                {['Remote', 'Hybrid', 'Onsite'].map(type => (
                  <Badge 
                    key={type} 
                    variant={jobPreferences.workTypes?.includes(type) ? "default" : "outline"} 
                    className="cursor-pointer"
                    onClick={() => toggleArrayPreference('workTypes', type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Commitment */}
            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" /> Commitment Type
              </Label>
              <div className="flex flex-wrap gap-2">
                {['Full-time', 'Part-time', 'Contract'].map(type => (
                  <Badge 
                    key={type} 
                    variant={jobPreferences.commitmentTypes?.includes(type) ? "default" : "outline"} 
                    className="cursor-pointer"
                    onClick={() => toggleArrayPreference('commitmentTypes', type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}

        {currentStep === 4 && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              Professional Links
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add links to help recruiters learn more about you.
            </p>
          </CardHeader>
        )}

        {currentStep === 4 && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-blue-600" /> LinkedIn
                </Label>
                <Input 
                  id="linkedin" 
                  placeholder="https://linkedin.com/in/yourprofile" 
                  value={profileLinks.linkedinUrl} 
                  onChange={(e) => setProfileLinks({...profileLinks, linkedinUrl: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github" className="flex items-center gap-2">
                  <Github className="h-4 w-4" /> GitHub
                </Label>
                <Input 
                  id="github" 
                  placeholder="https://github.com/yourusername" 
                  value={profileLinks.githubUrl} 
                  onChange={(e) => setProfileLinks({...profileLinks, githubUrl: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-green-600" /> Portfolio
                </Label>
                <Input 
                  id="portfolio" 
                  placeholder="https://yourwebsite.com" 
                  value={profileLinks.portfolioUrl} 
                  onChange={(e) => setProfileLinks({...profileLinks, portfolioUrl: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Personal Website
                </Label>
                <Input 
                  id="website" 
                  placeholder="https://yourname.com" 
                  value={profileLinks.personalWebsite} 
                  onChange={(e) => setProfileLinks({...profileLinks, personalWebsite: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        )}

        {currentStep === 5 && (
          <CardContent className="py-12 text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <PartyPopper className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                You're All Set! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Your profile is complete. We're finding your best job matches now.
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>What's next?</strong> Check your job feed for AI-matched positions that fit your skills and preferences.
              </p>
            </div>
            <Button 
              onClick={() => setNavigate("/candidate-dashboard?tab=jobs")} 
              className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 py-6"
            >
              View My Job Matches <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Navigation Buttons */}
      {currentStep < 5 && (
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          
          {currentStep === 4 ? (
            <Button 
              onClick={handleComplete}
              disabled={saveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saveMutation.isPending ? 'Saving...' : 'Complete Profile'} <Check className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
