import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useSession } from '@/lib/auth-client';
import { useToast } from '@/hooks/use-toast';

interface RoleGuardProps {
  allowedRoles: ('candidate' | 'talent_owner')[];
  children: React.ReactNode;
  fallbackPath?: string;
}

export function RoleGuard({ allowedRoles, children, fallbackPath = '/' }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useSession();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setLocation('/auth');
      return;
    }

    if (!user?.role) {
      setLocation('/role-selection');
      return;
    }

    if (!allowedRoles.includes(user.role as any)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive',
      });
      setLocation(fallbackPath);
      return;
    }
  }, [isAuthenticated, user?.role, allowedRoles, setLocation, toast, isLoading, fallbackPath]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.role || !allowedRoles.includes(user.role as any)) {
    return null;
  }

  return <>{children}</>;
}