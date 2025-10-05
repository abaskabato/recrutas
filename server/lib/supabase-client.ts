import { createClient } from '@supabase/supabase-js';

// This file is used by the server, so it needs to load dotenv
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL from env:', supabaseUrl ? 'Loaded' : 'NOT LOADED');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.');
  throw new Error('Supabase URL and anonymous key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);