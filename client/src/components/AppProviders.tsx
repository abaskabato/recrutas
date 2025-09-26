import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/error-boundary';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/components/theme-provider';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <div className="relative">
              <Toaster />
              {children}
            </div>
          </ThemeProvider>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
