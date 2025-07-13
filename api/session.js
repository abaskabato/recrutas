import { auth } from '../server/betterAuth.js';
import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Create request object for Better Auth
    const url = new URL('/api/auth/get-session', `https://${req.headers.host}`);
    const authRequest = new Request(url, {
      method: 'GET',
      headers: req.headers,
    });

    // Get session from Better Auth
    const authResponse = await auth.handler(authRequest);
    
    if (!authResponse.ok) {
      return res.status(200).json({ session: null, user: null });
    }

    const sessionData = await authResponse.json();
    
    if (!sessionData?.user?.id) {
      return res.status(200).json({ session: null, user: null });
    }

    // Fetch fresh user data from database
    const [freshUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionData.user.id))
      .limit(1);

    if (!freshUser) {
      return res.status(200).json({ session: null, user: null });
    }

    // Return session with fresh user data
    return res.status(200).json({
      user: freshUser,
      session: sessionData.session
    });

  } catch (error) {
    console.error('Session endpoint error:', error);
    return res.status(200).json({ session: null, user: null });
  }
}