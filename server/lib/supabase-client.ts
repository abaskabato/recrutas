import { createClient } from '@supabase/supabase-js';

// This file is used by the server, so it needs to load dotenv
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL from env:', supabaseUrl ? 'Loaded' : 'NOT LOADED');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase environment variables VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  throw new Error('Supabase URL and service role key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});