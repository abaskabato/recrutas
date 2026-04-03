
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { apiRequest } from '@/lib/queryClient';
import { setCachedProfile } from '@/utils/storage.utils';
import { useEffect, useRef } from 'react';

export function useAuth() {
  const { session, isLoading: isSessionLoading } = useSessionContext();
  const supabaseUser = session?.user;
  const queryClient = useQueryClient();
  const seededRef = useRef(false);

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/auth/user');
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!supabaseUser,
    retry: false,
  });

  // Pre-seed /api/candidate/profile cache from the bundled response
  useEffect(() => {
    if (!profile?.candidateProfile || seededRef.current) return;
    seededRef.current = true;
    const safeProfile = { ...profile.candidateProfile, skills: profile.candidateProfile.skills || [] };
    queryClient.setQueryData(['/api/candidate/profile'], safeProfile);
    setCachedProfile(safeProfile);
  }, [profile, queryClient]);

  const user = profile ? { ...supabaseUser, ...profile } : supabaseUser;

  // Return combined loading state - wait for both session AND profile
  const isLoading = isSessionLoading || isProfileLoading;

  return {
    session,
    user,
    isAuthenticated: !!supabaseUser,
    isLoading,
  };
}
