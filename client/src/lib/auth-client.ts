import { createAuthClient } from "better-auth/react"

// Define the extended user type with our custom fields
export interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  role?: string | null;
  profileComplete?: boolean | null;
}

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  fetchOptions: {
    credentials: 'include',
    onError(context) {
      // Silently handle expected authentication errors
      if (context.response?.status === 401 || context.response?.status === 403) {
        return;
      }
      // Only log actual errors, not network timeouts or connection issues
      if (context.error && !context.error.message?.includes('fetch')) {
        console.warn("Authentication error:", context.error);
      }
    }
  },
})

export const {
  signIn,
  signUp,
  useSession: useSessionRaw,
} = authClient

// Custom signOut function that uses our logout endpoint
export const signOut = async () => {
  try {
    // Call our custom logout endpoint
    const response = await fetch('/api/logout', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      // Force reload the page to clear all client-side state
      window.location.href = '/';
    } else {
      console.error('Logout failed:', response.status);
      // Fallback: still reload the page
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Fallback: reload the page anyway
    window.location.href = '/';
  }
}

// Use Better Auth's native session hook
export function useSession() {
  const betterAuthSession = useSessionRaw();
  
  // Return format compatible with existing components
  return {
    data: betterAuthSession.data,
    user: betterAuthSession.data?.user || null,
    isLoading: betterAuthSession.isPending,
    isAuthenticated: !!betterAuthSession.data?.user,
    isPending: betterAuthSession.isPending,
    error: betterAuthSession.error
  };
}