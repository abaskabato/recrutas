import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Globe, Github, Linkedin, User, Camera, BarChart3, Edit3, Sparkles, X, Check, Briefcase, AlertCircle } from "lucide-react";
import { Badge } from "./ui/badge";
import { fetchProfileWithCache } from "@/lib/queryClient";

interface ExtractedInfo {
  skills: string[];
  experience: string;
  workHistoryCount: number;
}

interface ProfileUploadProps {
  onProfileSaved?: () => void;
}

interface JobPreferences {
  salaryMin?: number;
  salaryMax?: number;
  commitmentTypes?: string[];
  experienceLevels?: string[];
  industries?: string[];
  companySizes?: string[];
  preferredLocations?: string[];
  maxTravelDays?: number;
}

export default function ProfileUpload({ onProfileSaved }: ProfileUploadProps) {
  const [profileLinks, setProfileLinks] = useState({
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    personalWebsite: '',
    behanceUrl: '',
    dribbbleUrl: '',
    stackOverflowUrl: '',
    mediumUrl: ''
  });
  const [jobPreferences, setJobPreferences] = useState<JobPreferences>({
    salaryMin: undefined,
    salaryMax: undefined,
    commitmentTypes: [],
    experienceLevels: [],
    industries: [],
    companySizes: [],
    preferredLocations: [],
    maxTravelDays: 0
  });
  const [parsedResumeData, setParsedResumeData] = useState<ExtractedInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: ['/api/candidate/profile'],
    queryFn: fetchProfileWithCache,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  // Show error state with retry button
  if (isError && !profile) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="text-amber-800 dark:text-amber-200">Could not load profile. Your data is safe.</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => queryClient.refetchQueries({ queryKey: ['/api/candidate/profile'] })}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  useEffect(() => {
    if (profile && typeof profile === 'object') {
      setProfileLinks({
        linkedinUrl: (profile as any).linkedinUrl || '',
        githubUrl: (profile as any).githubUrl || '',
        portfolioUrl: (profile as any).portfolioUrl || '',
        personalWebsite: (profile as any).personalWebsite || '',
        behanceUrl: (profile as any).behanceUrl || '',
        dribbbleUrl: (profile as any).dribbbleUrl || '',
        stackOverflowUrl: (profile as any).stackOverflowUrl || '',
        mediumUrl: (profile as any).mediumUrl || ''
      });

      const prefs = (profile as any).jobPreferences || {};
      setJobPreferences({
        salaryMin: prefs.salaryMin || undefined,
        salaryMax: prefs.salaryMax || undefined,
        commitmentTypes: prefs.commitmentTypes || [],
        experienceLevels: prefs.experienceLevels || [],
        industries: prefs.industries || [],
        companySizes: prefs.companySizes || [],
        preferredLocations: prefs.preferredLocations || [],
        maxTravelDays: prefs.maxTravelDays || 0
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<any>) => {
      return await apiRequest('POST', '/api/candidate/profile', profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-matches'] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully!",
      });
      setParsedResumeData(null);
      onProfileSaved?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      const response = await apiRequest('POST', '/api/candidate/resume', formData);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
      if (data.parsed && data.extractedInfo) {
        setParsedResumeData(data.extractedInfo);
        toast({
          title: "Resume Scanned Successfully!",
          description: "Please review the extracted information below.",
        });
      } else {
        toast({
          title: "Resume Uploaded",
          description: "Your resume has been updated.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please upload a PDF or Word document.", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "Please upload a file smaller than 5MB.", variant: "destructive" });
        return;
      }
      uploadMutation.mutate(file);
    }
  };

  const handleSaveParsedData = () => {
    if (parsedResumeData) {
      updateProfileMutation.mutate({
        skills: parsedResumeData.skills,
        experience: parsedResumeData.experience,
      });
    }
  };

  const handleLinkChange = (key: keyof typeof profileLinks, value: string) => {
    setProfileLinks(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveLinks = () => {
    updateProfileMutation.mutate(profileLinks);
  };

  const toggleArrayPreference = (field: keyof JobPreferences, value: string) => {
    setJobPreferences(prev => {
      const current = (prev[field] || []) as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const handleSavePreferences = () => {
    updateProfileMutation.mutate({ jobPreferences });
  };

  const professionalLinks = [
    { key: 'linkedinUrl' as const, label: 'LinkedIn Profile', icon: Linkedin, placeholder: 'https://linkedin.com/in/yourprofile' },
    { key: 'githubUrl' as const, label: 'GitHub Profile', icon: Github, placeholder: 'https://github.com/yourusername' },
    { key: 'portfolioUrl' as const, label: 'Portfolio', icon: User, placeholder: 'https://yourportfolio.com' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Resume</CardTitle>
        </CardHeader>
        <CardContent>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.doc,.docx" className="hidden" />
          <Button variant="outline" className="flex items-center space-x-3 p-4 h-auto justify-start w-full" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? (
              <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div><span>Scanning Resume...</span></>
            ) : (
              <><Upload className="h-5 w-5 text-primary" /><span>Upload & AI Scan Resume</span></>
            )}
          </Button>
          {profile && (profile as any)?.resumeUrl && !parsedResumeData && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">A resume is on file and has been scanned.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {parsedResumeData && (
        <Card className="border-blue-500 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-500" /> AI-Powered Profile Update</CardTitle>
            <p className="text-sm text-gray-600">We've extracted the following information from your resume. Please review and confirm.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="font-semibold">Detected Skills</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(parsedResumeData.skills || []).map((skill, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <button onClick={() => setParsedResumeData(prev => prev ? ({ ...prev, skills: prev.skills.filter(s => s !== skill) }) : null)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="font-semibold">Experience Level</Label>
              <div className="mt-2">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {(() => {
                    const levelMap: Record<string, string> = {
                      entry: 'Entry Level',
                      mid: 'Mid Level',
                      senior: 'Senior Level',
                      executive: 'Executive Level'
                    };
                    return levelMap[parsedResumeData.experience?.toLowerCase()] || parsedResumeData.experience || 'Not detected';
                  })()}
                </Badge>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setParsedResumeData(null)}>Cancel</Button>
              <Button onClick={handleSaveParsedData} className="bg-blue-600 hover:bg-blue-700">
                <Check className="h-4 w-4 mr-2" />
                Confirm and Save to Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Professional Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {professionalLinks.map(({ key, label, icon: Icon, placeholder }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</Label>
                <Input id={key} type="url" placeholder={placeholder} value={profileLinks[key]} onChange={(e) => handleLinkChange(key, e.target.value)} />
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button onClick={handleSaveLinks} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Links'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Job Preferences</CardTitle>
          <p className="text-sm text-gray-600">Set your job search preferences. We'll use these to show you the most relevant jobs.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Salary Range */}
          <div className="space-y-2">
            <Label className="font-semibold">Salary Range (Annual)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="salaryMin" className="text-sm text-gray-600">Minimum ($)</Label>
                <Input id="salaryMin" type="number" placeholder="50000" value={jobPreferences.salaryMin || ''} onChange={(e) => setJobPreferences({...jobPreferences, salaryMin: e.target.value ? parseInt(e.target.value) : undefined})} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="salaryMax" className="text-sm text-gray-600">Maximum ($)</Label>
                <Input id="salaryMax" type="number" placeholder="200000" value={jobPreferences.salaryMax || ''} onChange={(e) => setJobPreferences({...jobPreferences, salaryMax: e.target.value ? parseInt(e.target.value) : undefined})} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Commitment Types */}
          <div className="space-y-2">
            <Label className="font-semibold">Commitment Type</Label>
            <div className="flex flex-wrap gap-2">
              {['Full-time', 'Part-time', 'Contract', 'Freelance'].map(type => (
                <Badge key={type} variant={jobPreferences.commitmentTypes?.includes(type) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleArrayPreference('commitmentTypes', type)}>
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Experience Level */}
          <div className="space-y-2">
            <Label className="font-semibold">Experience Level</Label>
            <div className="flex flex-wrap gap-2">
              {['Entry', 'Mid', 'Senior'].map(level => (
                <Badge key={level} variant={jobPreferences.experienceLevels?.includes(level) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleArrayPreference('experienceLevels', level)}>
                  {level}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Work Type / Location */}
          <div className="space-y-2">
            <Label className="font-semibold">Work Arrangement</Label>
            <div className="flex flex-wrap gap-2">
              {['Remote', 'Hybrid', 'Onsite'].map(type => (
                <Badge key={type} variant={jobPreferences.companySizes?.includes(type) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleArrayPreference('companySizes', type)}>
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Industries */}
          <div className="space-y-2">
            <Label className="font-semibold">Preferred Industries</Label>
            <div className="flex flex-wrap gap-2">
              {['Tech', 'Finance', 'Healthcare', 'E-commerce', 'SaaS'].map(industry => (
                <Badge key={industry} variant={jobPreferences.industries?.includes(industry) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleArrayPreference('industries', industry)}>
                  {industry}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Company Size */}
          <div className="space-y-2">
            <Label className="font-semibold">Company Size</Label>
            <div className="flex flex-wrap gap-2">
              {['Startup', 'SMB', 'Enterprise'].map(size => (
                <Badge key={size} variant={jobPreferences.companySizes?.includes(size) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleArrayPreference('companySizes', size)}>
                  {size}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Max Travel */}
          <div className="space-y-2">
            <Label htmlFor="maxTravel" className="font-semibold">Max Travel Requirement (days/month)</Label>
            <Input id="maxTravel" type="number" placeholder="0" value={jobPreferences.maxTravelDays || ''} onChange={(e) => setJobPreferences({...jobPreferences, maxTravelDays: e.target.value ? parseInt(e.target.value) : 0})} />
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleSavePreferences} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
