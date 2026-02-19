
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Lazy-initialized Supabase admin client.
 * Only throws when actually accessed, not at import time.
 * This allows scripts that don't need Supabase (e.g. agent-apply worker)
 * to import storage.ts without crashing.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase URL and service role key are required for admin operations.');
    }

    _supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return _supabaseAdmin;
}

// Backward-compatible named export — lazily evaluated via Proxy
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop];
  }
});
