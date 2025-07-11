import { createAuthClient } from "better-auth/react"
import { useQuery } from "@tanstack/react-query"

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include"
  }
})

export const {
  signIn,
  signUp,
  signOut,
} = authClient

// Custom session hook that uses our fallback endpoint
export const useSession = () => {
  const customSession = useQuery({
    queryKey: ['/api/session'],
    queryFn: async () => {
      const response = await fetch('/api/session', {
        credentials: 'include'
      });
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
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 0, // Always consider stale
  });

  // Always use our custom session endpoint since Better Auth isn't working
  return {
    data: customSession.data,
    isPending: customSession.isPending,
    error: customSession.error
  };
}