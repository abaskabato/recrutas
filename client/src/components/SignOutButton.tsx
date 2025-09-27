import React from 'react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth-client';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleSignOut}>
      <LogOut className="h-5 w-5" />
    </Button>
  );
}
