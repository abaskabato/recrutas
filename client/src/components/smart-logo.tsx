import { useSession } from "@supabase/auth-helpers-react";
import { useLocation } from "wouter";
import RecrutasLogo from "./recrutas-logo";

interface SmartLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export default function SmartLogo({ size = 32, className = "", showText = true }: SmartLogoProps) {
  const session = useSession();
  const [, setLocation] = useLocation();
  const user = session?.user;

  const handleClick = () => {
    if (!user) {
      // Not logged in - go to landing page
      setLocation("/");
    } else {
      // Check user role from user metadata
      const role = (user as any)?.user_metadata?.role || (user as any)?.role;
      
      if (role === 'talent_owner' || role === 'recruiter') {
        setLocation("/talent-dashboard");
      } else {
        setLocation("/candidate-dashboard");
      }
    }
  };

  return (
    <button 
      onClick={handleClick}
      className={`flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer ${className}`}
      title="Go to home"
    >
      <RecrutasLogo size={size} />
      {showText && (
        <span className="text-xl font-bold text-gray-900 dark:text-white font-mono tracking-wider">
          RECRUTAS
        </span>
      )}
    </button>
  );
}

// Header component for pages that need it
export function Header({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <header className={`bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <SmartLogo />
          {children}
        </div>
      </div>
    </header>
  );
}
