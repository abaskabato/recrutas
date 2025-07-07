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
  },
})

// Debug wrapper to log authentication calls
const originalSignUp = authClient.signUp;
authClient.signUp = {
  ...originalSignUp,
  email: async (data: any) => {
    console.log('🔐 Sign Up called with:', { email: data.email, name: data.name });
    try {
      const result = await originalSignUp.email(data);
      console.log('🔐 Sign Up result:', result);
      return result;
    } catch (error) {
      console.error('🔐 Sign Up error caught:', error);
      throw error;
    }
  }
};

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

// Use Better Auth's built-in session hook
function useCustomSession() {
  const betterAuthSession = useSessionRaw();
  
  return {
    data: betterAuthSession.data,
    isLoading: betterAuthSession.isPending,
    error: betterAuthSession.error,
  };
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