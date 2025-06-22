import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Globe, Github, Linkedin, User, Camera, BarChart3, Edit3 } from "lucide-react";

export default function ProfileUpload() {
  const [uploading, setUploading] = useState(false);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing profile data
  const { data: profile } = useQuery({
    queryKey: ['/api/candidate/profile'],
    retry: false,
  });

  // Update local state when profile data loads
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
    }
  }, [profile]);

  // Update profile links mutation
  const updateLinksMutation = useMutation({
    mutationFn: async (links: typeof profileLinks) => {
      return await apiRequest('PATCH', '/api/candidate/profile', links);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/profile'] });
      toast({
        title: "Profile Updated",
        description: "Your professional links have been saved successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile links. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      
      const response = await fetch('/api/candidate/resume', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates/profile"] });
      
      if (data.parsed && data.extractedInfo) {
        const { skillsCount, experience, workHistoryCount } = data.extractedInfo;
        toast({
          title: "Resume Scanned Successfully!",
          description: `Found ${skillsCount} skills, ${experience} experience, and ${workHistoryCount} work entries. Your profile has been automatically updated.`,
        });
      } else {
        toast({
          title: "Resume Uploaded",
          description: "Your resume has been uploaded successfully!",
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
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF or Word document.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      uploadMutation.mutate(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleLinkChange = (key: keyof typeof profileLinks, value: string) => {
    setProfileLinks(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveLinks = () => {
    updateLinksMutation.mutate(profileLinks);
  };

  const professionalLinks = [
    { key: 'linkedinUrl' as const, label: 'LinkedIn Profile', icon: Linkedin, placeholder: 'https://linkedin.com/in/yourprofile' },
    { key: 'githubUrl' as const, label: 'GitHub Profile', icon: Github, placeholder: 'https://github.com/yourusername' },
    { key: 'portfolioUrl' as const, label: 'Portfolio', icon: User, placeholder: 'https://yourportfolio.com' },
    { key: 'personalWebsite' as const, label: 'Personal Website', icon: Globe, placeholder: 'https://yourwebsite.com' },
    { key: 'behanceUrl' as const, label: 'Behance', icon: Camera, placeholder: 'https://behance.net/yourprofile' },
    { key: 'dribbbleUrl' as const, label: 'Dribbble', icon: Camera, placeholder: 'https://dribbble.com/yourprofile' },
    { key: 'stackOverflowUrl' as const, label: 'Stack Overflow', icon: BarChart3, placeholder: 'https://stackoverflow.com/users/yourprofile' },
    { key: 'mediumUrl' as const, label: 'Medium', icon: Edit3, placeholder: 'https://medium.com/@yourusername' },
  ];

  return (
    <div className="space-y-6">
      {/* Resume Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resume Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx"
            className="hidden"
          />
          <Button 
            variant="outline" 
            className="flex items-center space-x-3 p-4 h-auto justify-start w-full"
            onClick={handleClick}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span>Scanning Resume...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 text-primary" />
                <span>Upload & Scan Resume</span>
              </>
            )}
          </Button>
          
          {/* Show current resume info if available */}
          {profile && (profile as any)?.resumeUrl && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Resume Active
                  </p>
                  {(profile as any).skills && (profile as any).skills.length > 0 && (
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Auto-detected {(profile as any).skills.length} skills: {(profile as any).skills.slice(0, 3).join(', ')}
                      {(profile as any).skills.length > 3 && ` +${(profile as any).skills.length - 3} more`}
                    </p>
                  )}
                  {(profile as any).experience && (
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Experience: {(profile as any).experience}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Professional Links Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Professional Showcase
          </CardTitle>
          <p className="text-sm text-gray-600">
            Add your professional profiles and portfolios to showcase your work
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {professionalLinks.map(({ key, label, icon: Icon, placeholder }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </Label>
                <Input
                  id={key}
                  type="url"
                  placeholder={placeholder}
                  value={profileLinks[key]}
                  onChange={(e) => handleLinkChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>
          
          <Separator />
          
          <div className="flex justify-end">
            <Button
              onClick={handleSaveLinks}
              disabled={updateLinksMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateLinksMutation.isPending ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Save Profile Links
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
