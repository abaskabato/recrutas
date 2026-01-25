import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useGuidedSetup } from '@/contexts/GuidedSetupContext';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ResumeProcessingResult {
  resumeUrl: string;
  parsed: boolean;
  aiParsing: {
    success: boolean;
    confidence: number;
    processingTime: number;
  };
  extractedInfo: {
    skillsCount: number;
    softSkillsCount: number;
    experience: string;
    workHistoryCount: number;
    educationCount: number;
    certificationsCount: number;
    projectsCount: number;
    hasContactInfo: boolean;
    extractedName: string;
    extractedLocation: string;
    linkedinFound: boolean;
    githubFound: boolean;
  } | null;
  autoMatchingTriggered: boolean;
}

export default function ResumeUploadStep() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'parsing' | 'complete' | 'error'>('idle');
  const { toast } = useToast();
  const { setStep } = useGuidedSetup();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setUploadPhase('uploading');
      setUploadProgress(20);

      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 50));
      }, 300);

      try {
        const response = await apiRequest('POST', '/api/candidate/resume', formData, {
          'Content-Type': 'multipart/form-data'
        });

        clearInterval(progressInterval);
        setUploadPhase('parsing');
        setUploadProgress(70);

        const data = await response.json();

        setUploadProgress(100);
        setUploadPhase('complete');

        return data as ResumeProcessingResult;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Resume upload successful:', data);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/profile'] });

      if (data.parsed && data.extractedInfo) {
        toast({
          title: 'Resume Uploaded & Parsed',
          description: `Extracted ${data.extractedInfo.skillsCount} skills and ${data.extractedInfo.workHistoryCount} work experiences.`,
        });
      } else {
        toast({
          title: 'Resume Uploaded',
          description: 'Your resume was uploaded. You can add your skills manually in the next step.',
        });
      }

      // Short delay to show success state before proceeding
      setTimeout(() => {
        setStep((prev) => prev + 1);
      }, 1000);
    },
    onError: (error: any) => {
      console.error('Resume upload failed:', error);
      setUploadPhase('error');
      setUploadProgress(0);

      const errorMessage = error?.message || 'Failed to upload your resume. Please try again.';
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];

      // Validate file type
      const validTypes = ['.pdf', '.doc', '.docx'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

      if (!validTypes.includes(fileExtension)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a PDF or Word document (.pdf, .doc, .docx)',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (4MB max)
      if (selectedFile.size > 4 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please upload a file smaller than 4MB',
          variant: 'destructive',
        });
        return;
      }

      setFile(selectedFile);
      setUploadPhase('idle');
      setUploadProgress(0);
    }
  };

  const handleUpload = () => {
    if (file) {
      const formData = new FormData();
      formData.append('resume', file);
      uploadMutation.mutate(formData);
    }
  };

  const handleSkip = () => {
    toast({
      title: 'Skipped Resume Upload',
      description: 'You can always upload your resume later from your profile.',
    });
    setStep((prev) => prev + 1);
  };

  const getPhaseMessage = () => {
    switch (uploadPhase) {
      case 'uploading':
        return 'Uploading your resume...';
      case 'parsing':
        return 'Analyzing your resume with AI...';
      case 'complete':
        return 'Resume processed successfully!';
      case 'error':
        return 'Upload failed. Please try again.';
      default:
        return '';
    }
  };

  return (
    <div className="text-center max-w-md mx-auto">
      <div className="mb-6">
        <FileText className="h-16 w-16 mx-auto text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2">Upload Your Resume</h2>
        <p className="text-muted-foreground">
          Upload your resume and our AI will extract your skills, experience, and work history to help find the best job matches.
        </p>
      </div>

      <div className="space-y-4">
        {/* File Input */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-primary transition-colors">
          <Input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx"
            className="cursor-pointer"
            disabled={uploadMutation.isPending}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Supported: PDF, DOC, DOCX (max 4MB)
          </p>
        </div>

        {/* Selected File Display */}
        {file && uploadPhase === 'idle' && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Display */}
        {uploadMutation.isPending && (
          <div className="space-y-3">
            <Progress value={uploadProgress} className="h-2" />
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {getPhaseMessage()}
            </div>
          </div>
        )}

        {/* Success State */}
        {uploadPhase === 'complete' && (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              {getPhaseMessage()}
            </AlertDescription>
          </Alert>
        )}

        {/* Error State */}
        {uploadPhase === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getPhaseMessage()}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleUpload}
            disabled={!file || uploadMutation.isPending || uploadPhase === 'complete'}
            className="w-full"
            size="lg"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : uploadPhase === 'complete' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Done!
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload and Continue
              </>
            )}
          </Button>

          {!uploadMutation.isPending && uploadPhase !== 'complete' && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
