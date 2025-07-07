import { createAuthClient } from "better-auth/react"
import { useQuery } from "@tanstack/react-query"

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
  baseURL: window.location.origin + "/api/auth",
  fetchOptions: {
    credentials: 'include',
    onRequest(context) {
      // Debug logging for auth requests
      console.log('🔐 Auth Request:', context.request.method, context.request.url);
    },
    onResponse(context) {
      // Debug logging for auth responses
      console.log('🔐 Auth Response:', context.response.status, context.response.url);
      if (context.response.status >= 400) {
        console.error('🔐 Auth Error Response:', context.response.status, context.response.statusText);
      }
    },
    onError(context) {
      // Enhanced error logging for debugging
      console.error('🔐 Auth Error:', {
        error: context.error,
        status: context.response?.status,
        url: context.request.url,
        method: context.request.method
      });
      
      // Silently handle expected authentication errors
      if (context.response?.status === 401 || context.response?.status === 403) {
        return;
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

// Custom hook to use our session endpoint
function useCustomSession() {
  return useQuery({
    queryKey: ['/api/session'],
    queryFn: async () => {
      const response = await fetch('/api/session', {
        credentials: 'include',
      });
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// Create a wrapper for useSession that provides compatibility with existing components
export function useSession() {
  const customSession = useCustomSession();
  
  // Session data handling
  
  // Handle loading states
  if (customSession.isLoading) {
    return {
      data: null,
      user: null,
      isLoading: true,
      isAuthenticated: false,
      isPending: true,
      error: null
    };
  }
  
  // Check if we have session data with user
  if (customSession.data?.user) {
    const user = customSession.data.user as any;
    
    const extendedUser = {
      ...user,
      // Ensure all properties are available for backward compatibility
      firstName: user.firstName || user.name?.split(' ')[0] || '',
      lastName: user.lastName || user.name?.split(' ')[1] || '',
      phoneNumber: user.phoneNumber || null,
      role: user.role || null,
      profileComplete: user.profileComplete || false,
    } as ExtendedUser;
    
    return {
      data: {
        user: extendedUser
      },
      user: extendedUser,
      isLoading: false,
      isAuthenticated: true,
      isPending: false,
      error: customSession.error
    };
  }
  
  return {
    data: null,
    user: null,
    isLoading: false,
    isAuthenticated: false,
    isPending: false,
    error: customSession.error
  };
}