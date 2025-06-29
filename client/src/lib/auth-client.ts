// Simple auth client using direct API calls
// Better Auth endpoints are available at /api/auth/*

interface AuthResponse {
  data?: any;
  error?: { message: string };
}

export const authClient = {
  signIn: {
    email: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
      try {
        const response = await fetch('/api/auth/sign-in/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          return { error: { message: result.message || 'Sign in failed' } };
        }
        
        return { data: result };
      } catch (error) {
        return { error: { message: 'Network error during sign in' } };
      }
    }
  },
  signUp: {
    email: async (userData: { email: string; password: string; name: string }): Promise<AuthResponse> => {
      try {
        const response = await fetch('/api/auth/sign-up/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          return { error: { message: result.message || 'Sign up failed' } };
        }
        
        return { data: result };
      } catch (error) {
        return { error: { message: 'Network error during sign up' } };
      }
    }
  },
  signOut: async (): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return { data: { success: true } };
    } catch (error) {
      return { error: { message: 'Network error during sign out' } };
    }
  }
};

export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;

// Simple session hook that returns compatible structure
export function useSession() {
  return {
    data: null, // Will be handled by the existing useAuth hook
    isPending: false,
    error: null
  };
}