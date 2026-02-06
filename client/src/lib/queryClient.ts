import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from './supabase-client';
import { getCachedProfile, setCachedProfile } from '@/utils/storage.utils';

export async function fetchProfileWithCache(): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch('/api/candidate/profile', {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (res.status === 503) {
    // On timeout, use cached profile if available
    const cached = getCachedProfile();
    if (cached) {
      return { ...cached, _fromCache: true };
    }
    throw new Error('Profile temporarily unavailable. Please retry.');
  }

  if (!res.ok) {
    throw new Error(`Profile fetch failed: ${res.status}`);
  }

  const profile = await res.json();
  setCachedProfile(profile);
  return profile;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry 401 errors
        if (error.message.includes('401')) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});