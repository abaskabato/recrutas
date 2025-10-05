
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building } from 'lucide-react';
import { useGuidedSetup } from '@/contexts/GuidedSetupContext';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function RoleSelectionStep() {
  const { setRole, setStep } = useGuidedSetup();
  const { toast } = useToast();

  const setRoleMutation = useMutation({
    mutationFn: async (role: 'candidate' | 'talent_owner') => {
      await apiRequest('POST', '/api/auth/role', { role });
    },
    onSuccess: () => {
      toast({
        title: 'Role selected!',
        description: 'Your profile has been updated.',
      });
      window.location.reload();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save your role. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSelectRole = (role: 'candidate' | 'talent_owner') => {
    setRole(role);
    setRoleMutation.mutate(role);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">Choose Your Role</h2>
      <div className="grid md:grid-cols-2 gap-8">
        <Card
          className="cursor-pointer transition-all duration-200 hover:shadow-xl bg-card border border-border hover:ring-2 hover:ring-primary"
          onClick={() => handleSelectRole('candidate')}
          disabled={setRoleMutation.isPending}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">I'm a Candidate</CardTitle>
            <p className="text-muted-foreground">Looking for job opportunities</p>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer transition-all duration-200 hover:shadow-xl bg-card border border-border hover:ring-2 hover:ring-primary"
          onClick={() => handleSelectRole('talent_owner')}
          disabled={setRoleMutation.isPending}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Building className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">I'm a Talent Owner</CardTitle>
            <p className="text-muted-foreground">Hiring talent for my company</p>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
