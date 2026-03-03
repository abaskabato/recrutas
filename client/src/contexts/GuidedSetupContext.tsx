
import { createContext, useContext, useState, useEffect } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { apiRequest } from '@/lib/queryClient';

interface GuidedSetupContextType {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  role: 'candidate' | 'talent_owner' | null;
  setRole: React.Dispatch<React.SetStateAction<'candidate' | 'talent_owner' | null>>;
  isLoading: boolean;
}

const GuidedSetupContext = createContext<GuidedSetupContextType | undefined>(undefined);

export function GuidedSetupProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'candidate' | 'talent_owner' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useSessionContext();

  useEffect(() => {
    async function initGuidedSetup() {
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get role from auth metadata
        const userRole = session.user.user_metadata?.role;
        if (userRole === 'candidate' || userRole === 'talent_owner') {
          setRole(userRole);
        }

        // Fetch profile to determine completed steps
        const response = await apiRequest('GET', '/api/candidate/profile');
        if (response.ok) {
          const profile = await response.json();
          const profileData = profile.profile || profile;
          
          // Determine starting step based on what's completed
          if (profileData?.resumeUrl || profileData?.skills?.length > 0) {
            setStep(2); // Resume done, go to info
          }
          if (profileData?.firstName || profileData?.lastName) {
            setStep(3); // Info done, go to skills
          }
        }
      } catch (error) {
        console.error('Error initializing guided setup:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initGuidedSetup();
  }, [session]);

  return (
    <GuidedSetupContext.Provider value={{ step, setStep, role, setRole, isLoading }}>
      {children}
    </GuidedSetupContext.Provider>
  );
}

export function useGuidedSetup() {
  const context = useContext(GuidedSetupContext);
  if (!context) {
    throw new Error('useGuidedSetup must be used within a GuidedSetupProvider');
  }
  return context;
}
