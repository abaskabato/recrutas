// Direct database authentication for immediate Vercel deployment
import bcrypt from 'bcryptjs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// User schema matching our database
const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  firstName: text("firstName"),
  lastName: text("lastName"),
  phoneNumber: text("phoneNumber"),
  profileImageUrl: text("profileImageUrl"),
  role: text("role").default("candidate"),
  profileComplete: boolean("profileComplete").default(false),
});

const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
});

const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

// Database connection
let db;
if (process.env.DATABASE_URL) {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  db = drizzle(pool, { schema: { users, sessions, accounts } });
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function createSession(userId, ipAddress, userAgent) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  
  return {
    id: nanoid(),
    userId,
    expiresAt,
    token: nanoid(32),
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress,
    userAgent,
  };
}

export default async function handler(req, res) {
  try {
    // Enable CORS
    const origin = req.headers.origin;
    const allowedOrigins = [
      "https://recrutas.vercel.app",
      "https://recrutas-git-main-abas-kabatos-projects.vercel.app",
      "http://localhost:5000"
    ];
    
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const url = new URL(req.url, `https://${req.headers.host}`);
    const path = url.pathname.replace('/api/auth-direct', '');

    console.log('Direct auth endpoint:', req.method, path);
    console.log('Request body:', JSON.stringify(req.body));

    // Sign up endpoint
    if (path === '/sign-up/email' && req.method === 'POST') {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          message: 'Email, password, and name are required'
        });
      }

      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email));
      if (existingUser.length > 0) {
        return res.status(400).json({ 
          error: 'User already exists',
          message: 'An account with this email already exists'
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user
      const userId = nanoid();
      const newUser = {
        id: userId,
        name,
        email,
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        firstName: null,
        lastName: null,
        phoneNumber: null,
        profileImageUrl: null,
        role: "candidate",
        profileComplete: false,
      };

      await db.insert(users).values(newUser);

      // Store password in accounts table
      await db.insert(accounts).values({
        id: nanoid(),
        accountId: email,
        providerId: "credential",
        userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create session
      const session = createSession(userId, req.headers['x-forwarded-for'], req.headers['user-agent']);
      await db.insert(sessions).values(session);

      // Set session cookie
      res.setHeader('Set-Cookie', `better-auth.session_token=${session.token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7*24*60*60}`);

      return res.status(201).json({
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          emailVerified: newUser.emailVerified,
          image: newUser.image,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
        },
        session: {
          id: session.id,
          userId: session.userId,
          expiresAt: session.expiresAt,
        }
      });
    }

    // Sign in endpoint
    if (path === '/sign-in/email' && req.method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Missing credentials',
          message: 'Email and password are required'
        });
      }

      // Find user
      const userResult = await db.select().from(users).where(eq(users.email, email));
      if (userResult.length === 0) {
        return res.status(401).json({ 
          error: 'Invalid credentials',
          message: 'Invalid email or password'
        });
      }

      const user = userResult[0];

      // Find user's password
      const accountResult = await db.select().from(accounts).where(eq(accounts.userId, user.id));
      if (accountResult.length === 0 || !accountResult[0].password) {
        return res.status(401).json({ 
          error: 'Invalid credentials',
          message: 'Invalid email or password'
        });
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, accountResult[0].password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          error: 'Invalid credentials',
          message: 'Invalid email or password'
        });
      }

      // Create session
      const session = createSession(user.id, req.headers['x-forwarded-for'], req.headers['user-agent']);
      await db.insert(sessions).values(session);

      // Set session cookie
      res.setHeader('Set-Cookie', `better-auth.session_token=${session.token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7*24*60*60}`);

      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        session: {
          id: session.id,
          userId: session.userId,
          expiresAt: session.expiresAt,
        }
      });
    }

    // Get session endpoint
    if (path === '/get-session' && req.method === 'GET') {
      const sessionToken = req.headers.cookie?.match(/better-auth\.session_token=([^;]+)/)?.[1];
      
      if (!sessionToken) {
        return res.status(401).json({ error: 'No session token' });
      }

      // Find session
      const sessionResult = await db.select().from(sessions).where(eq(sessions.token, sessionToken));
      if (sessionResult.length === 0) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      const session = sessionResult[0];

      // Check if session expired
      if (new Date() > session.expiresAt) {
        await db.delete(sessions).where(eq(sessions.token, sessionToken));
        return res.status(401).json({ error: 'Session expired' });
      }

      // Get user
      const userResult = await db.select().from(users).where(eq(users.id, session.userId));
      if (userResult.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const user = userResult[0];

      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        session: {
          id: session.id,
          userId: session.userId,
          expiresAt: session.expiresAt,
        }
      });
    }

    // Sign out endpoint
    if (path === '/sign-out' && req.method === 'POST') {
      const sessionToken = req.headers.cookie?.match(/better-auth\.session_token=([^;]+)/)?.[1];
      
      if (sessionToken) {
        await db.delete(sessions).where(eq(sessions.token, sessionToken));
      }

      // Clear session cookie
      res.setHeader('Set-Cookie', `better-auth.session_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
      
      return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('Direct auth error:', error);
    res.status(500).json({
      error: 'AUTH_ERROR',
      message: error.message,
      details: error.stack
    });
  }
}