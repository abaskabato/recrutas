import { db } from '../../server/db.js';
import { jobs, users } from '../../shared/schema.js';
import { count, eq } from 'drizzle-orm';

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
      totalConnections: 0, // This would be calculated from matches/applications
    };

    return res.status(200).json(stats);

  } catch (error) {
    console.error('Platform stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}