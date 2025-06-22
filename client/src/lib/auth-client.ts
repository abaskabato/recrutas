import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: window.location.origin, // Use current origin for proper environment support
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient