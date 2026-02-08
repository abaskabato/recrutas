import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useGuidedSetup } from '@/contexts/GuidedSetupContext';

export default function CompanyProfileStep() {
  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    companySize: '',
  });
  const { toast } = useToast();
  const { setStep } = useGuidedSetup();
  const [, setLocation] = useLocation();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/talent-owner/profile/complete', formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      // Invalidate session/auth explicitly
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      toast({
        title: 'Profile Updated',
        description: 'Your company profile has been saved. Redirecting to dashboard...',
      });
      // Redirect to dashboard as requested, skipping Job Post step in setup
      setLocation('/talent-dashboard');
    },
    onError: (error) => {
      console.error('Company profile update failed:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to save your profile. Please try again.',
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
    if (!formData.companyName.trim()) {
      toast({
        title: "Validation Error",
        description: "Company name is required.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-4">Tell us about your company</h2>
      <p className="text-muted-foreground mb-6">This information will be displayed on your job postings.</p>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <Input
          name="companyName"
          placeholder="Company Name"
          value={formData.companyName}
          onChange={handleChange}
          className="max-w-sm"
          required
        />
        <Input
          name="website"
          placeholder="Website"
          value={formData.website}
          onChange={handleChange}
          className="max-w-sm"
        />
        <Input
          name="companySize"
          placeholder="Company Size (e.g., 1-10 employees)"
          value={formData.companySize}
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