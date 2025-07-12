import { createAuthClient } from "better-auth/react"
import { useQuery } from "@tanstack/react-query"

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include"
  }
})

export const {
  signIn,
  signUp,
  signOut: betterAuthSignOut,
} = authClient

// Enhanced signOut function with proper session cleanup and redirection
export const signOut = async () => {
  try {
    // Call Better Auth signOut
    await betterAuthSignOut();
    
    // Clear any localStorage items
    localStorage.removeItem('continuationJob');
    sessionStorage.removeItem('pendingJobApplication');
    
    // Force reload to clear session state
    window.location.href = '/';
  } catch (error) {
    console.error('Sign out error:', error);
    // Force redirect even if signOut fails
    window.location.href = '/';
  }
}

// Custom session hook that uses our fallback endpoint
export const useSession = () => {
  const customSession = useQuery({
    queryKey: ['/api/session'],
    queryFn: async () => {
      const response = await fetch('/api/session', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }
      
      const data = await response.json();
      console.log('Custom session data:', data);
      
      // Transform the data to match expected Better Auth structure
      if (data && data.user) {
        return {
          user: data.user,
          session: data.session
        };
      }
      return null;
    },
    staleTime: Infinity, // Never consider data stale
    refetchInterval: false, // Disable automatic refetching
    retry: false, // Don't retry failed requests
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  console.log('Session hook state:', {
    data: customSession.data,
    isPending: customSession.isPending,
    isLoading: customSession.isLoading,
    error: customSession.error
  });

  // Always use our custom session endpoint since Better Auth isn't working
  return {
    data: customSession.data,
    isPending: customSession.isPending,
    error: customSession.error
  };
}