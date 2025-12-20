
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.error(`[supabase-admin] Initializing with supabaseUrl: ${supabaseUrl ? 'YES' : 'NO'}`);
console.error(`[supabase-admin] Initializing with serviceKey: ${serviceKey ? 'YES' : 'NO'}`);

if (!supabaseUrl || !serviceKey) {
  throw new Error('Supabase URL and service role key are required for admin operations.');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
