import { auth } from '../server/auth.js';
import { db } from '../server/db.js';
import { jobs } from '../shared/schema.js';
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

    if (req.method === 'GET') {
      // Fetch jobs
      const allJobs = await db.select().from(jobs);
      return res.status(200).json(allJobs);
    }

    if (req.method === 'POST') {
      // Create new job
      const jobData = req.body;
      
      const [newJob] = await db
        .insert(jobs)
        .values({
          ...jobData,
          createdBy: sessionData.user.id,
        })
        .returning();

      return res.status(201).json(newJob);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Jobs API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}