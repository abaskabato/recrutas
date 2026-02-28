import { createClient } from '@supabase/supabase-js';

// This file is used by the server, so it needs to load dotenv
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL from env:', supabaseUrl ? 'Loaded' : 'NOT LOADED');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase environment variables SUPABASE_URL and SUPABASE_ANON_KEY are required.');
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Supabase URL and anon key are required.');
  }
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null as unknown as ReturnType<typeof createClient>;