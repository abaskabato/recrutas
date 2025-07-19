import { createAuthClient } from "better-auth/react"
import { useQuery } from "@tanstack/react-query"

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient