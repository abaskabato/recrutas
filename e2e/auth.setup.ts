import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fgdxsvlamtinkepfodfj.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnZHhzdmxhbXRpbmtlcGZvZGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDgzMjIsImV4cCI6MjA2OTE4NDMyMn0.sLcHFfkGvcJTIF85toGvZhrtbAWvsKLfyxlWR3D_vyM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Credentials MUST be provided via environment variables
// DO NOT hardcode credentials in this file
// Required env vars:
//   - E2E_CANDIDATE_EMAIL / E2E_CANDIDATE_PASSWORD
//   - E2E_TALENT_EMAIL / E2E_TALENT_PASSWORD
// Or use VITE_ prefixed versions for client-side access

export const getTestUsers = () => ({
  candidate: {
    email: process.env.E2E_CANDIDATE_EMAIL || process.env.VITE_E2E_CANDIDATE_EMAIL || '',
    password: process.env.E2E_CANDIDATE_PASSWORD || process.env.VITE_E2E_CANDIDATE_PASSWORD || '',
  },
  talentOwner: {
    email: process.env.E2E_TALENT_EMAIL || process.env.VITE_E2E_TALENT_EMAIL || '',
    password: process.env.E2E_TALENT_PASSWORD || process.env.VITE_E2E_TALENT_PASSWORD || '',
  },
});

// Validate credentials are provided
const users = getTestUsers();
if (!users.candidate.email || !users.candidate.password) {
  console.warn('⚠️  E2E Test Credentials Warning: Candidate credentials not set. Set E2E_CANDIDATE_EMAIL and E2E_CANDIDATE_PASSWORD environment variables.');
}
if (!users.talentOwner.email || !users.talentOwner.password) {
  console.warn('⚠️  E2E Test Credentials Warning: Talent Owner credentials not set. Set E2E_TALENT_EMAIL and E2E_TALENT_PASSWORD environment variables.');
}

// Legacy export for backwards compatibility (deprecated - use getTestUsers())
export const TEST_USERS = users;
