import { useState, useEffect } from 'react';
import { apiRequest } from './queryClient';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  firstName?: string;
  lastName?: string;
  profileComplete?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Simple session management that works reliably
export function useSimpleAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/get-session', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.user) {
          setAuthState({
            user: data.user,
            isLoading: false,
            isAuthenticated: true,
          });
          return;
        }
      }

      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return authState;
}

export async function signIn(email: string, password: string): Promise<boolean> {
  try {
    const response = await apiRequest('POST', '/api/auth/sign-in/email', {
      email,
      password,
    });

    if (response.ok) {
      // Force page reload to refresh auth state
      window.location.href = '/';
      return true;
    }
    return false;
  } catch (error) {
    console.error('Sign in failed:', error);
    return false;
  }
}

export async function signUp(email: string, password: string, name: string): Promise<boolean> {
  try {
    const response = await apiRequest('POST', '/api/auth/sign-up/email', {
      email,
      password,
      name,
    });

    if (response.ok) {
      // Force page reload to refresh auth state
      window.location.href = '/';
      return true;
    }
    return false;
  } catch (error) {
    console.error('Sign up failed:', error);
    return false;
  }
}

export async function signOut(): Promise<void> {
  try {
    const response = await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    // Always redirect to home after sign out attempt
    window.location.href = '/';
  } catch (error) {
    console.error('Sign out failed:', error);
    window.location.href = '/';
  }
}