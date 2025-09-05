import { supabase } from './supabase-client';
import { useSession } from '@supabase/auth-helpers-react';

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
  }
}

export { useSession };
