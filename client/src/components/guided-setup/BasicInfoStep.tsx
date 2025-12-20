
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useGuidedSetup } from '@/contexts/GuidedSetupContext';

export default function BasicInfoStep() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    summary: '',
  });
  const { toast } = useToast();
  const { setStep } = useGuidedSetup();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/candidate/profile', formData);
      return response.json();
    },
    onSuccess: () => {
      console.log('Basic info update successful');
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: 'Profile Updated',
        description: 'Your basic information has been saved.',
      });
      setStep((prev) => prev + 1);
    },
    onError: (error) => {
      console.error('Basic info update failed:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to save your information. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-4">Tell us about yourself</h2>
      <p className="text-muted-foreground mb-6">This information will be visible to recruiters.</p>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <Input
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
          className="max-w-sm"
          required
        />
        <Input
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
          className="max-w-sm"
          required
        />
        <Input
          name="summary"
          placeholder="Headline (e.g., Senior Frontend Developer)"
          value={formData.summary}
          onChange={handleChange}
          className="max-w-sm"
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Continue'}
        </Button>
      </form>
    </div>
  );
}