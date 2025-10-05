
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { GuidedSetupProvider, useGuidedSetup } from '@/contexts/GuidedSetupContext';
import RoleSelectionStep from '@/components/guided-setup/RoleSelectionStep';
import ResumeUploadStep from '@/components/guided-setup/ResumeUploadStep';
import BasicInfoStep from '@/components/guided-setup/BasicInfoStep';
import SkillsStep from '@/components/guided-setup/SkillsStep';
import CompanyProfileStep from '@/components/guided-setup/CompanyProfileStep';
import JobPostStep from '@/components/guided-setup/JobPostStep';

function GuidedSetupContent() {
  const { step, role, setRole, setStep } = useGuidedSetup();
  const [, setLocation] = useLocation();

  const handleRoleSelect = (selectedRole: 'candidate' | 'talent_owner') => {
    setRole(selectedRole);
    setStep(2);
  };

  const candidateSteps = [
    { name: 'Role', component: <RoleSelectionStep /> },
    { name: 'Resume', component: <ResumeUploadStep /> },
    { name: 'Info', component: <BasicInfoStep /> },
    { name: 'Skills', component: <SkillsStep /> },
  ];

  const talentOwnerSteps = [
    { name: 'Role', component: <RoleSelectionStep /> },
    { name: 'Company', component: <CompanyProfileStep /> },
    { name: 'Job Post', component: <JobPostStep /> },
  ];

  const steps = role === 'candidate' ? candidateSteps : role === 'talent_owner' ? talentOwnerSteps : [{ name: 'Role', component: <RoleSelectionStep /> }];
  const currentStep = steps[step - 1];
  const progress = (step / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground">Welcome to Recrutas</h1>
          <p className="text-lg text-muted-foreground">Let's get your profile set up.</p>
        </div>
        <Card>
          <CardHeader>
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
