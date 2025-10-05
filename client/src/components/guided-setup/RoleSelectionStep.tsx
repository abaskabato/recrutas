
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building } from 'lucide-react';
import { useGuidedSetup } from '@/contexts/GuidedSetupContext';

interface RoleSelectionStepProps {
  setRoleMutation: (role: 'candidate' | 'talent_owner') => void;
}

export default function RoleSelectionStep({ setRoleMutation }: RoleSelectionStepProps) {
  const { setRole, setStep } = useGuidedSetup();

  const handleSelectRole = (role: 'candidate' | 'talent_owner') => {
    setRole(role);
    setRoleMutation(role);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">Choose Your Role</h2>
      <div className="grid md:grid-cols-2 gap-8">
        <Card
          className="cursor-pointer transition-all duration-200 hover:shadow-xl bg-card border border-border hover:ring-2 hover:ring-primary"
          onClick={() => handleSelectRole('candidate')}
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
