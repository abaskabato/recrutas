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
  baseURL: window.location.origin, // Use current origin for proper environment support
})

export const {
  signIn,
  signUp,
  signOut,
  useSession: useSessionRaw,
} = authClient

// Create a wrapper for useSession that provides compatibility with existing components
export function useSession() {
  const session = useSessionRaw();
  
  // Better Auth returns session data in a different format
  if (session.data?.user) {
    const user = session.data.user as any;
    return {
      data: {
        user: {
          ...user,
          // Ensure all properties are available for backward compatibility
          firstName: user.firstName || user.name?.split(' ')[0] || '',
          lastName: user.lastName || user.name?.split(' ')[1] || '',
          phoneNumber: user.phoneNumber || null,
          role: user.role || 'candidate',
          profileComplete: user.profileComplete || false,
        } as ExtendedUser
      },
      isPending: session.isPending,
      error: session.error
    };
  }
  
  return {
    data: null,
    isPending: session.isPending,
    error: session.error
  };
}