import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useAuth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/session"],
    retry: false,
  });

  // Handle both empty object {} and user data structure
  const user = (data as any)?.user || null;
  const isEmptySession = data && typeof data === 'object' && Object.keys(data).length === 0;

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isEmptySession,
    error
  };
}

export function signIn(email: string, password: string) {
  return apiRequest("POST", "/api/auth/login", { email, password });
}

export function signOut() {
  return apiRequest("POST", "/api/auth/logout");
}

export function signUp(userData: any) {
  return apiRequest("POST", "/api/auth/register", userData);
}

export function useSession() {
  return useAuth();
}
