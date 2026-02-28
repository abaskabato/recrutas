
import { useQuery } from '@tanstack/react-query';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { apiRequest } from '@/lib/queryClient';

export function useAuth() {
  const { session, isLoading: isSessionLoading } = useSessionContext();
  const supabaseUser = session?.user;

  const { data: profile } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/auth/user');
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!supabaseUser,
    retry: false,
  });

  const user = profile ? { ...supabaseUser, ...profile } : supabaseUser;

  return {
    session,
    user,
    isAuthenticated: !!supabaseUser,
    isLoading: isSessionLoading,
  };
}
