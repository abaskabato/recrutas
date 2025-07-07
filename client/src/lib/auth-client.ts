import { createAuthClient } from "better-auth/react"

// Create auth client - use working endpoint in production
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: window.location.hostname === 'localhost' ? "/api/auth" : "/api/auth-direct"
})

// Export methods and hooks directly from Better Auth client
export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient