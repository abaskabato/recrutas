import { createAuthClient } from "better-auth/react"

// Create auth client according to Better Auth docs
export const authClient = createAuthClient({
  baseURL: window.location.origin + "/api/auth"
})

// Export methods and hooks directly from Better Auth client
export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient