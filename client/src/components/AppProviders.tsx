import React from 'react';
import { QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/error-boundary';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/errors';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  const queryCache = new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError) {
        toast({
          variant: "destructive",
          title: "An API error occurred",
          description: error.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "An error occurred",
          description: (error as Error).message,
        });
      }
    },
  });

  const mutationCache = new MutationCache({
    onError: (error) => {
      if (error instanceof ApiError) {
        toast({
          variant: "destructive",
          title: "An API error occurred",
          description: error.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "An error occurred",
          description: (error as Error).message,
        });
      }
    },
  });

  queryClient.setQueryCache(queryCache);
  queryClient.setMutationCache(mutationCache);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          {children}
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
