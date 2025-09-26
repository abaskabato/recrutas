
import { createContext, useContext, useState } from 'react';

interface GuidedSetupContextType {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  role: 'candidate' | 'talent_owner' | null;
  setRole: React.Dispatch<React.SetStateAction<'candidate' | 'talent_owner' | null>>;
}

const GuidedSetupContext = createContext<GuidedSetupContextType | undefined>(undefined);

export function GuidedSetupProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'candidate' | 'talent_owner' | null>(null);

  return (
    <GuidedSetupContext.Provider value={{ step, setStep, role, setRole }}>
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
