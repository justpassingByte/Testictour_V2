'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5s stale time prevents burst refetches from socket events
            staleTime: 5 * 1000,
            // Keep data for 5 minutes after unmount (tab switching)
            gcTime: 5 * 60 * 1000,
            // Don't refetch on window focus – socket handles freshness
            refetchOnWindowFocus: false,
            // Retry once on failure
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
