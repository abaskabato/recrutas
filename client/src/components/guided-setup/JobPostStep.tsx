import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useGuidedSetup } from '@/contexts/GuidedSetupContext';
import { useLocation } from 'wouter';

export default function JobPostStep() {
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    description: '',
  });
  const { toast } = useToast();
  const { setStep } = useGuidedSetup();
  const [, setLocation] = useLocation();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/jobs', formData);
      return response.json();
    },
    onSuccess: () => {
      console.log('Job post successful');
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: 'Job Posted',
        description: 'Your first job has been posted.',
      });
      setLocation('/talent-dashboard');
    },
    onError: (error) => {
      console.error('Job post failed:', error);
      toast({
        title: 'Post Failed',
        description: 'Failed to post your job. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-4">Post Your First Job</h2>
      <p className="text-muted-foreground mb-6">Get a head start by posting a job now. You can add more details later.</p>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <Input
          name="title"
          placeholder="Job Title"
          value={formData.title}
          onChange={handleChange}
          className="max-w-sm"
          required
        />
        <Input
          name="location"
          placeholder="Location (e.g., Remote, New York)"
          value={formData.location}
          onChange={handleChange}
          className="max-w-sm"
        />
        <Textarea
          name="description"
          placeholder="Job Description"
          value={formData.description}
          onChange={handleChange}
          className="max-w-sm"
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Posting Job...' : 'Post Job and Continue'}
        </Button>
      </form>
    </div>
  );
}