import React from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { SignOutButton } from './SignOutButton';
import { ThemeToggleButton } from './theme-toggle-button';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export function TopRightButtons() {
  const session = useSession();

  return (
    <div className="absolute top-4 right-4 flex items-center">
      <Button variant="ghost" size="icon" onClick={() => history.back()}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => history.forward()}>
        <ArrowRight className="h-5 w-5" />
      </Button>
      {session && <SignOutButton />}
      <ThemeToggleButton />
    </div>
  );
}
