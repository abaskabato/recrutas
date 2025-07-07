import { createAuthClient } from "better-auth/react"

// Create auth client with fallback handling
const isProduction = window.location.hostname !== 'localhost';

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth"
});

// Fallback authentication methods for production when Better Auth fails
export const fallbackAuth = {
  async signUp(email: string, password: string, name: string) {
    const response = await fetch('/api/auth-direct/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Sign up failed');
    }
    
    return response.json();
  },

  async signIn(email: string, password: string) {
    const response = await fetch('/api/auth-direct/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Sign in failed');
    }
    
    return response.json();
  },

  async signOut() {
    const response = await fetch('/api/auth-direct/sign-out', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Sign out failed');
    }
    
    return response.json();
  },

  async getSession() {
    const response = await fetch('/api/auth-direct/get-session', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      return null;
    }
    
    return response.json();
  }
};

// Enhanced auth methods that try Better Auth first, then fallback
export const enhancedAuth = {
  async signUp(email: string, password: string, name: string) {
    if (isProduction) {
      // Use fallback directly in production
      return fallbackAuth.signUp(email, password, name);
    }
    
    // Try Better Auth in development
    try {
      return await authClient.signUp.email({ email, password, name });
    } catch (error) {
      console.warn('Better Auth failed, using fallback:', error);
      return fallbackAuth.signUp(email, password, name);
    }
  },

  async signIn(email: string, password: string) {
    if (isProduction) {
      return fallbackAuth.signIn(email, password);
    }
    
    try {
      return await authClient.signIn.email({ email, password });
    } catch (error) {
      console.warn('Better Auth failed, using fallback:', error);
      return fallbackAuth.signIn(email, password);
    }
  },

  async signOut() {
    if (isProduction) {
      return fallbackAuth.signOut();
    }
    
    try {
      return await authClient.signOut();
    } catch (error) {
      console.warn('Better Auth failed, using fallback:', error);
      return fallbackAuth.signOut();
    }
  }
};

// Export enhanced authentication methods with fallback support
export const {
  useSession,
} = authClient;

// Use enhanced methods instead of direct Better Auth methods
export const { signIn, signUp, signOut } = enhancedAuth;