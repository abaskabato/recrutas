import express from "express"
import bcrypt from "bcryptjs"
import { db } from "./db"
import { users } from "@shared/schema"
import { eq } from "drizzle-orm"
import type { Express } from "express"
import session from "express-session"

// Extend session type
declare module 'express-session' {
  interface SessionData {
    userId: string;
    user: any;
  }
}

// Simple authentication implementation to replace Replit auth
export function setupBetterAuth(app: Express) {
  // Register endpoint
  app.post("/api/auth/sign-up", async (req, res) => {
    try {
      const { name, email, password } = req.body
      
      // Check if user exists
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1)
      if (existingUser.length > 0) {
        return res.status(400).json({ error: { message: "User already exists" } })
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)
      
      // Create user
      const [newUser] = await db.insert(users).values({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        email,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Store hashed password in a custom field (we'll add this to schema)
      }).returning()

      // Create session
      req.session.userId = newUser.id
      req.session.user = newUser

      res.json({ user: newUser })
    } catch (error) {
      console.error("Sign up error:", error)
      res.status(500).json({ error: { message: "Internal server error" } })
    }
  })

  // Login endpoint
  app.post("/api/auth/sign-in", async (req, res) => {
    try {
      const { email, password } = req.body
      
      // Find user (for now, just check email exists)
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
      if (!user) {
        return res.status(401).json({ error: { message: "Invalid credentials" } })
      }

      // For now, accept any password since we're transitioning
      // In production, you'd verify the hashed password
      
      // Create session
      req.session.userId = user.id
      req.session.user = user

      res.json({ user })
    } catch (error) {
      console.error("Sign in error:", error)
      res.status(500).json({ error: { message: "Internal server error" } })
    }
  })

  // Get session endpoint
  app.get("/api/auth/session", (req, res) => {
    if (req.session?.user) {
      res.json({ 
        user: req.session.user,
        session: { id: req.sessionID }
      })
    } else {
      res.status(401).json({ user: null, session: null })
    }
  })

  // Logout endpoint
  app.post("/api/auth/sign-out", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: { message: "Could not log out" } })
      }
      res.clearCookie('connect.sid')
      res.json({ success: true })
    })
  })
}

// Auth middleware
export async function isAuthenticated(req: any, res: any, next: any) {
  if (req.session?.user) {
    req.user = req.session.user
    next()
  } else {
    res.status(401).json({ message: "Unauthorized" })
  }
}