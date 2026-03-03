import { useLocation } from 'wouter';
import ProfileWizard from '@/components/profile-wizard';

export default function SkillsStep() {
  const [, setLocation] = useLocation();

  const handleComplete = async () => {
    setLocation('/candidate-dashboard');
  };

  return (
    <div>
      <ProfileWizard onComplete={handleComplete} />
    </div>
  );
}
