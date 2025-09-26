"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0, // Force fresh data for debugging
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            retry: (failureCount, error: any) => {
              console.log('🔄 QueryProvider: Retry attempt', failureCount, 'for error:', error);
              // Don't retry on 4xx errors
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              return failureCount < 3;
            },
            // Add debugging for all queries
            onError: (error) => {
              console.error('❌ QueryProvider: Global query error:', error);
            },
            onSuccess: (data) => {
              console.log('✅ QueryProvider: Global query success');
            },
          },
          mutations: {
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      })
  );

  console.log('🏗️ QueryProvider: Initializing with client:', queryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}