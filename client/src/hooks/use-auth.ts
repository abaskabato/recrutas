
import { useQuery } from '@tanstack/react-query';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { apiRequest } from '@/lib/queryClient';

export function useAuth() {
  const { session, isLoading: isSessionLoading } = useSessionContext();
  const supabaseUser = session?.user;

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: () => apiRequest('GET', '/api/auth/user'),
    enabled: !!supabaseUser,
    retry: false,
  });

  const user = profile ? { ...supabaseUser, ...profile } : supabaseUser;

  return {
    session,
    user,
    isAuthenticated: !!supabaseUser,
    isLoading: isSessionLoading || (!!supabaseUser && isProfileLoading),
  };
}
