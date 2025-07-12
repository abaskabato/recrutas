import { auth } from '../server/auth.js';
import { db } from '../server/db.js';
import { jobs, users, applications } from '../shared/schema.js';
import { eq, count } from 'drizzle-orm';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type } = req.query;
    
    if (type === 'platform') {
      // Get platform statistics
      const [totalJobs] = await db
        .select({ count: count() })
        .from(jobs);

      const [totalCandidates] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, 'candidate'));

      const [totalRecruiters] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, 'recruiter'));

      const stats = {
        totalJobs: totalJobs?.count || 0,
        totalCandidates: totalCandidates?.count || 0,
        totalCompanies: totalRecruiters?.count || 0,
        totalConnections: 0,
      };

      return res.status(200).json(stats);
    }

    if (type === 'recruiter') {
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

      // Get recruiter stats
      const [jobsCount] = await db
        .select({ count: count() })
        .from(jobs)
        .where(eq(jobs.createdBy, sessionData.user.id));

      const [applicationsCount] = await db
        .select({ count: count() })
        .from(applications);

      const stats = {
        totalJobs: jobsCount?.count || 0,
        totalApplications: applicationsCount?.count || 0,
        activeJobs: jobsCount?.count || 0,
        pendingApplications: applicationsCount?.count || 0,
      };

      return res.status(200).json(stats);
    }

    return res.status(400).json({ error: 'Invalid stats type' });

  } catch (error) {
    console.error('Stats API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}