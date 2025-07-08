import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: import.meta.env.DEV 
    ? "http://localhost:5000" 
    : window.location.origin,
  basePath: "/api/auth"
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient