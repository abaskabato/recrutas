import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/session"],
    retry: false,
  });

  return {
    user: user?.user || null,
    isLoading,
    isAuthenticated: !!user?.user,
    error
  };
}
