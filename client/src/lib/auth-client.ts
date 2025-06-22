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
  signOut,
  useSession: useSessionRaw,
} = authClient

// Create a wrapper for useSession that provides compatibility with existing components
export function useSession() {
  try {
    const session = useSessionRaw();
    
    // Handle loading states properly to prevent unhandled rejections
    if (session.isPending) {
      return {
        data: null,
        user: null,
        isLoading: true,
        isAuthenticated: false,
        isPending: true,
        error: null
      };
    }
    
    // Better Auth returns session data directly
    if (session.data?.user) {
      const user = session.data.user as any;
      
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
        error: session.error
      };
    }
    
    return {
      data: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isPending: false,
      error: session.error
    };
  } catch (error) {
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