import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "./queryClient"

// Custom auth hooks to replace Better Auth
export function useSession() {
  return useQuery({
    queryKey: ['/api/auth/session'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include'
        })
        if (response.ok) {
          return await response.json()
        }
        return { user: null, session: null }
      } catch {
        return { user: null, session: null }
      }
    },
    retry: false,
  })
}

export function useSignIn() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await apiRequest('POST', '/api/auth/sign-in', { email, password })
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] })
    },
  })
}

export function useSignUp() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      const response = await apiRequest('POST', '/api/auth/sign-up', { name, email, password })
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] })
    },
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/sign-out', {})
      return await response.json()
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/session'], { user: null, session: null })
    },
  })
}