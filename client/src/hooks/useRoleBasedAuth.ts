import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useSession } from '@/lib/auth-client';

export function useRoleBasedAuth() {
  const { user, isAuthenticated, isLoading } = useSession();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    // If not authenticated, redirect to landing page unless on auth pages
    if (!isAuthenticated && !['/auth', '/forgot-password'].includes(location)) {
      setLocation('/');
      return;
    }

    // If authenticated but no role, redirect to role selection
    if (isAuthenticated && (!user?.role || user.role === null)) {
      if (location !== '/role-selection') {
        setLocation('/role-selection');
      }
      return;
    }

    // If authenticated with role, redirect to appropriate dashboard from root
    if (isAuthenticated && user?.role && location === '/') {
      if (user.role === 'candidate') {
        setLocation('/candidate-dashboard');
      } else if (user.role === 'talent_owner') {
        setLocation('/talent-dashboard');
      }
      return;
    }

    // Prevent wrong role from accessing wrong dashboard
    if (isAuthenticated && user?.role) {
      if (user.role === 'candidate' && location === '/talent-dashboard') {
        setLocation('/candidate-dashboard');
      } else if (user.role === 'talent_owner' && location === '/candidate-dashboard') {
        setLocation('/talent-dashboard');
      }
    }
  }, [isAuthenticated, user?.role, location, setLocation, isLoading]);

  return {
    user,
    isAuthenticated,
    isLoading,
    shouldShowRoleSelection: isAuthenticated && (!user?.role || user.role === null),
    shouldRedirectToAuth: !isAuthenticated && !['/auth', '/forgot-password', '/'].includes(location),
    currentRole: user?.role
  };
}