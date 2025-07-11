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
  const betterAuthSession = authClient.useSession();
  
  const customSession = useQuery({
    queryKey: ['/api/session'],
    queryFn: async () => {
      const response = await fetch('/api/session', {
        credentials: 'include'
      });
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 0, // Always consider stale
  });

  // If Better Auth session works, use it
  if (betterAuthSession.data?.user && !betterAuthSession.isPending) {
    return betterAuthSession;
  }

  // Otherwise, use our custom session endpoint
  return {
    data: customSession.data,
    isPending: customSession.isPending,
    error: customSession.error
  };
}