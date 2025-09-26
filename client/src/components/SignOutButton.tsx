import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase-client';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleSignOut}>
      <LogOut className="h-5 w-5" />
    </Button>
  );
}
