import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useGuidedSetup } from '@/contexts/GuidedSetupContext';

export default function ResumeUploadStep() {
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { setStep } = useGuidedSetup();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest('POST', '/api/candidate/resume', formData, { 'Content-Type': 'multipart/form-data' });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Resume upload successful:', data);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: 'Resume Uploaded',
        description: 'Your resume has been successfully uploaded and parsed.',
      });
      setStep((prev) => prev + 1);
    },
    onError: (error) => {
      console.error('Resume upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload your resume. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (file) {
      const formData = new FormData();
      formData.append('resume', file);
      uploadMutation.mutate(formData);
    }
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-4">Upload Your Resume</h2>
      <p className="text-muted-foreground mb-6">Upload your resume to get started. We'll parse it to pre-fill your profile.</p>
      <div className="flex flex-col items-center gap-4">
        <Input type="file" onChange={handleFileChange} className="max-w-sm" />
        <Button onClick={handleUpload} disabled={!file || uploadMutation.isPending}>
          {uploadMutation.isPending ? 'Uploading...' : 'Upload and Continue'}
        </Button>
      </div>
    </div>
  );
}