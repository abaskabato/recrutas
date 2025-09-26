import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { X } from 'lucide-react';
import { useGuidedSetup } from '@/contexts/GuidedSetupContext';
import { useLocation } from 'wouter';

export default function SkillsStep() {
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const { toast } = useToast();
  const { setStep } = useGuidedSetup();
  const [, setLocation] = useLocation();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', '/api/candidate/profile', { skills });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: 'Profile Updated',
        description: 'Your skills have been saved.',
      });
      setLocation('/candidate-dashboard');
    },
    onError: () => {
      toast({
        title: 'Update Failed',
        description: 'Failed to save your skills. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleAddSkill = () => {
    if (skillInput && !skills.includes(skillInput)) {
      setSkills([...skills, skillInput]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleSubmit = () => {
    mutation.mutate();
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-4">What are your skills?</h2>
      <p className="text-muted-foreground mb-6">Add up to 10 of your top skills.</p>
      <div className="flex flex-col items-center gap-4">
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            placeholder="e.g., React, Node.js, Python"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
          />
          <Button type="button" onClick={handleAddSkill}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2 max-w-sm">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
              <X className="ml-2 h-4 w-4 cursor-pointer" onClick={() => handleRemoveSkill(skill)} />
            </Badge>
          ))}
        </div>
        <Button onClick={handleSubmit} disabled={mutation.isPending || skills.length === 0}>
          {mutation.isPending ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}