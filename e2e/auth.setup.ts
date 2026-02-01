import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fgdxsvlamtinkepfodfj.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnZHhzdmxhbXRpbmtlcGZvZGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDgzMjIsImV4cCI6MjA2OTE4NDMyMn0.sLcHFfkGvcJTIF85toGvZhrtbAWvsKLfyxlWR3D_vyM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test user credentials
export const TEST_USERS = {
  candidate: {
    email: 'abaskabato@gmail.com',
    password: '123456',
  },
  talentOwner: {
    email: 'rainierit@proton.me',
    password: 'rainierit08',
  },
};
