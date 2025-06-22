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
    onError(e) {
      // Handle authentication errors gracefully
      console.warn("Authentication error handled:", e);
    },
    onRequest() {
      // Ensure requests are properly configured
    },
  },
})

export const {
  signIn,
  signUp,
  signOut,
  useSession: useSessionRaw,
} = authClient

// Create a wrapper for useSession that provides compatibility with existing components
export function useSession() {
  try {
    const session = useSessionRaw();
    
    // Better Auth returns session data directly
    if (session.data?.user) {
      const user = session.data.user as any;
      const extendedUser = {
        ...user,
        // Ensure all properties are available for backward compatibility
        firstName: user.firstName || user.name?.split(' ')[0] || '',
        lastName: user.lastName || user.name?.split(' ')[1] || '',
        phoneNumber: user.phoneNumber || null,
        role: user.role || 'candidate',
        profileComplete: user.profileComplete || false,
      } as ExtendedUser;
      
      return {
        data: {
          user: extendedUser
        },
        user: extendedUser,
        isLoading: session.isPending,
        isAuthenticated: true,
        isPending: session.isPending,
        error: session.error
      };
    }
    
    return {
      data: null,
      user: null,
      isLoading: session.isPending || false,
      isAuthenticated: false,
      isPending: session.isPending || false,
      error: session.error
    };
  } catch (error) {
    console.warn("Session wrapper error:", error);
    return {
      data: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isPending: false,
      error: error as any
    };
  }
}