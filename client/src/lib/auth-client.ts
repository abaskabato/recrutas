import { createAuthClient } from "better-auth/react"
import { useQuery } from "@tanstack/react-query"

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include"
  }
})

// Fallback authentication functions for Vercel
export const signIn = {
  email: async ({ email, password, rememberMe = false, callbackURL = "/" }, options = {}) => {
    try {
      options.onRequest?.();
      
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const error = new Error(data.error || 'Sign in failed');
        options.onError?.({ error });
        return { data: null, error };
      }
      
      options.onSuccess?.(data);
      
      // Refresh the page to update auth state
      window.location.href = callbackURL;
      
      return { data, error: null };
    } catch (error) {
      options.onError?.({ error });
      return { data: null, error };
    }
  }
};

export const signUp = {
  email: async ({ name, email, password, callbackURL = "/" }, options = {}) => {
    try {
      options.onRequest?.();
      
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const error = new Error(data.error || 'Sign up failed');
        options.onError?.({ error });
        return { data: null, error };
      }
      
      options.onSuccess?.(data);
      
      // Refresh the page to update auth state
      window.location.href = callbackURL;
      
      return { data, error: null };
    } catch (error) {
      options.onError?.({ error });
      return { data: null, error };
    }
  }
};

export const signOut = async (options = {}) => {
  try {
    const response = await fetch('/api/auth/sign-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Clear local auth state and redirect
      window.location.href = '/';
      return { data, error: null };
    } else {
      return { data: null, error: new Error('Sign out failed') };
    }
  } catch (error) {
    return { data: null, error };
  }
};

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
      const data = await response.json();

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
    retry: 3, // Retry failed requests
  });

  // Always use our custom session endpoint since Better Auth isn't working
  return {
    data: customSession.data,
    isPending: customSession.isPending,
    error: customSession.error
  };
}