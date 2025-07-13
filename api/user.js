import { auth } from '../server/auth.js';
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
    // Get session from Better Auth
    const url = new URL('/api/auth/get-session', `https://${req.headers.host}`);
    const authRequest = new Request(url, {
      method: 'GET',
      headers: req.headers,
    });

    const authResponse = await auth.handler(authRequest);
    
    if (!authResponse.ok) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sessionData = await authResponse.json();
    
    if (!sessionData?.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { action } = req.query;

    if (action === 'select-role' && req.method === 'POST') {
      const { role } = req.body;

      if (!role || !['candidate', 'talent_owner'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Map frontend role to database role
      const dbRole = role === 'talent_owner' ? 'recruiter' : 'candidate';

      // Update user role in database
      await db
        .update(users)
        .set({ role: dbRole })
        .where(eq(users.id, sessionData.user.id));

      return res.status(200).json({ 
        success: true, 
        role: dbRole,
        message: 'Role updated successfully' 
      });
    }

    if (action === 'profile' && req.method === 'PUT') {
      // Update user profile
      const profileData = req.body;
      
      const [updatedUser] = await db
        .update(users)
        .set({
          ...profileData,
          profileComplete: true,
        })
        .where(eq(users.id, sessionData.user.id))
        .returning();

      return res.status(200).json(updatedUser);
    }

    return res.status(400).json({ error: 'Invalid action or method' });

  } catch (error) {
    console.error('User API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}