import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface RoleGuardProps {
  allowedRoles: ('candidate' | 'talent_owner' | 'recruiter')[];
  children: React.ReactNode;
  fallbackPath?: string;
}

export function RoleGuard({ allowedRoles, children, fallbackPath = '/' }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const userRole = user?.user_metadata?.role || user?.app_metadata?.role;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setLocation('/auth');
      return;
    }

    if (!userRole) {
      setLocation('/role-selection');
      return;
    }

    if (!allowedRoles.includes(userRole as any)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive',
      });
      setLocation(fallbackPath);
      return;
    }
  }, [isAuthenticated, userRole, allowedRoles, setLocation, toast, isLoading, fallbackPath]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !userRole || !allowedRoles.includes(userRole as any)) {
    return null;
  }

  return <>{children}</>;
}
