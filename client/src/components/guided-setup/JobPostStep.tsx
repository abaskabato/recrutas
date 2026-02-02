import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useGuidedSetup } from '@/contexts/GuidedSetupContext';
import { useLocation } from 'wouter';
import { Loader2, Briefcase, Building2, MapPin, DollarSign, Wrench } from 'lucide-react';

export default function JobPostStep() {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    description: '',
    skills: '',
    workType: 'remote' as 'remote' | 'hybrid' | 'onsite',
    salaryMin: '',
    salaryMax: '',
  });
  const { toast } = useToast();
  const { setStep } = useGuidedSetup();
  const [, setLocation] = useLocation();

  // Fetch talent owner profile to auto-populate company name
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const { data: talentProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/talent-owner/profile'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/talent-owner/profile');
      return response.json();
    },
    enabled: !!user,
    retry: false,
  });

  // Auto-populate company name from profile
  useEffect(() => {
    if (talentProfile?.companyName && !formData.company) {
      setFormData((prev) => ({ ...prev, company: talentProfile.companyName }));
    }
  }, [talentProfile]);

  const mutation = useMutation({
    mutationFn: async () => {
      // Parse skills from comma-separated string to array
      const skillsArray = formData.skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Prepare job data
      const jobData = {
        title: formData.title,
        company: formData.company,
        location: formData.location,
        description: formData.description,
        skills: skillsArray,
        workType: formData.workType,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
      };

      const response = await apiRequest('POST', '/api/jobs', jobData);
      return response.json();
    },
    onSuccess: () => {
      console.log('Job post successful');
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/talent-owner/jobs'] });
      toast({
        title: 'Job Posted Successfully',
        description: 'Your first job has been posted and is now active.',
      });
      setLocation('/talent-dashboard');
    },
    onError: async (error: any) => {
      console.error('Job post failed:', error);

      // Try to extract detailed validation errors
      let errorDescription = 'Please check all required fields and try again.';
      try {
        if (error?.response) {
          const errorData = await error.response.json();
          if (errorData.errors) {
            const fieldErrors = Object.entries(errorData.errors)
              .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
              .join('; ');
            errorDescription = fieldErrors || errorData.message || errorDescription;
          } else if (errorData.message) {
            errorDescription = errorData.message;
          }
        } else if (error?.message) {
          errorDescription = error.message;
        }
      } catch (e) {
        // Ignore parsing errors
      }

      toast({
        title: 'Failed to Post Job',
        description: errorDescription,
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

    // Validate required fields
    const errors: string[] = [];
    if (!formData.title.trim()) errors.push('Job Title');
    if (!formData.company.trim()) errors.push('Company Name');
    if (!formData.description.trim()) errors.push('Job Description');

    if (errors.length > 0) {
      toast({
        title: 'Required Fields Missing',
        description: `Please fill in: ${errors.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    // Additional validation
    if (formData.salaryMin && formData.salaryMax) {
      const min = parseInt(formData.salaryMin);
      const max = parseInt(formData.salaryMax);
      if (min > max) {
        toast({
          title: 'Invalid Salary Range',
          description: 'Minimum salary cannot be greater than maximum salary.',
          variant: 'destructive',
        });
        return;
      }
    }

    mutation.mutate();
  };

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Briefcase className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Post Your First Job</h2>
        <p className="text-muted-foreground">Create a job posting to start finding great candidates</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">
            Job Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            placeholder="e.g., Senior Software Engineer"
            value={formData.title}
            onChange={handleChange}
            required
            disabled={mutation.isPending}
          />
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="company" className="text-sm font-medium">
            Company Name <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="company"
              name="company"
              placeholder="Your company name"
              value={formData.company}
              onChange={handleChange}
              className="pl-10"
              required
              disabled={mutation.isPending}
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium">
            Location
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              name="location"
              placeholder="e.g., Remote, San Francisco, CA"
              value={formData.location}
              onChange={handleChange}
              className="pl-10"
              disabled={mutation.isPending}
            />
          </div>
        </div>

        {/* Work Type */}
        <div className="space-y-2">
          <Label htmlFor="workType" className="text-sm font-medium">
            Work Type
          </Label>
          <Select
            value={formData.workType}
            onValueChange={(value: 'remote' | 'hybrid' | 'onsite') =>
              setFormData((prev) => ({ ...prev, workType: value }))
            }
            disabled={mutation.isPending}
          >
            <SelectTrigger id="workType">
              <SelectValue placeholder="Select work type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="onsite">Onsite</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <Label htmlFor="skills" className="text-sm font-medium">
            Required Skills
          </Label>
          <div className="relative">
            <Wrench className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="skills"
              name="skills"
              placeholder="e.g., React, TypeScript, Node.js (comma-separated)"
              value={formData.skills}
              onChange={handleChange}
              className="pl-10"
              disabled={mutation.isPending}
            />
          </div>
          <p className="text-xs text-muted-foreground">Separate multiple skills with commas</p>
        </div>

        {/* Salary Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Salary Range (Optional)</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="salaryMin"
                type="number"
                placeholder="Min"
                value={formData.salaryMin}
                onChange={handleChange}
                className="pl-10"
                disabled={mutation.isPending}
              />
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="salaryMax"
                type="number"
                placeholder="Max"
                value={formData.salaryMax}
                onChange={handleChange}
                className="pl-10"
                disabled={mutation.isPending}
              />
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Job Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Describe the role, responsibilities, and what you're looking for in a candidate..."
            value={formData.description}
            onChange={handleChange}
            className="min-h-[120px]"
            disabled={mutation.isPending}
            required
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-4">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="min-w-[200px]"
            size="lg"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Posting Job...
              </>
            ) : (
              'Post Job and Continue'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}