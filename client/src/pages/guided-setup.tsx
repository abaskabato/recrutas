import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { GuidedSetupProvider, useGuidedSetup } from '@/contexts/GuidedSetupContext';
import RoleSelectionStep from '@/components/guided-setup/RoleSelectionStep';
import ResumeUploadStep from '@/components/guided-setup/ResumeUploadStep';
import BasicInfoStep from '@/components/guided-setup/BasicInfoStep';
import SkillsStep from '@/components/guided-setup/SkillsStep';
import CompanyProfileStep from '@/components/guided-setup/CompanyProfileStep';

import { ChevronLeft } from 'lucide-react';
import { SignOutButton } from '@/components/SignOutButton';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

function GuidedSetupContent() {
  const { step, role, setRole, setStep } = useGuidedSetup();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const setRoleMutation = useMutation({
    mutationFn: async (role: 'candidate' | 'talent_owner') => {
      await apiRequest('POST', '/api/auth/role', { role });
    },
    onSuccess: () => {
      console.log('✅ Mutation Success: Role set, advancing step...');
      toast({
        title: 'Role selected!',
        description: 'Your profile has been updated.',
      });
      setStep(2);
    },
    onError: (error) => {
      console.error('❌ Mutation Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your role. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleRoleSelect = (selectedRole: 'candidate' | 'talent_owner') => {
    console.log('👉 handleRoleSelect called with:', selectedRole);
    setRole(selectedRole);
    setRoleMutation.mutate(selectedRole);
  };

  const candidateSteps = [
    { name: 'Role', component: <RoleSelectionStep setRoleMutation={handleRoleSelect} /> },
    { name: 'Resume', component: <ResumeUploadStep /> },
    { name: 'Info', component: <BasicInfoStep /> },
    { name: 'Skills', component: <SkillsStep /> },
  ];

  const talentOwnerSteps = [
    { name: 'Role', component: <RoleSelectionStep setRoleMutation={handleRoleSelect} /> },
    { name: 'Company', component: <CompanyProfileStep /> },
  ];

  const steps = role === 'candidate' ? candidateSteps : role === 'talent_owner' ? talentOwnerSteps : [{ name: 'Role', component: <RoleSelectionStep setRoleMutation={handleRoleSelect} /> }];
  const currentStep = steps[step - 1];
  const progress = (step / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
      {/* Header Bar */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-8 pt-4">
        <Button
          variant="ghost"
          onClick={() => setStep(step - 1)}
          disabled={step <= 1}
          className={step <= 1 ? 'invisible' : ''}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <ThemeToggleButton />
          <SignOutButton />
        </div>
      </div>

      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground">
            {step === 1 ? 'Welcome to Recrutas' : 'Complete Your Profile'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {step === 1 ? "Let's get your profile set up." : "Tell us about your company to get started."}
          </p>
        </div>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center mb-6">
              {steps.map((s, idx) => {
                const stepNum = idx + 1;
                const isActive = stepNum === step;
                const isCompleted = stepNum < step;

                return (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setStep(stepNum)}
                    className={`flex items-center gap-2 group cursor-pointer ${isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}
                  >
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                      ${isActive ? 'border-primary bg-primary text-primary-foreground' :
                        isCompleted ? 'border-green-600 bg-green-600 text-white' :
                          'border-muted-foreground/30 bg-background'}
                    `}>
                      {isCompleted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <span>{stepNum}</span>
                      )}
                    </div>
                    <span className="font-medium hidden sm:block">{s.name}</span>
                  </button>
                );
              })}
            </div>
            <Progress value={progress} className="w-full" />
          </CardHeader>
          <CardContent>
            {currentStep.component}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function GuidedSetup() {
  return (
    <GuidedSetupProvider>
      <GuidedSetupContent />
    </GuidedSetupProvider>
  );
}
