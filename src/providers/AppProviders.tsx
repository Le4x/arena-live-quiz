/**
 * Providers centralisés pour l'application
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { ReactNode } from 'react';
import { ErrorBoundary } from '@/lib/error/ErrorBoundary';
import * as Sentry from '@sentry/react';

// Configuration React Query avec gestion d'erreurs améliorée
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000, // 5 secondes par défaut
      gcTime: 1000 * 60 * 5, // 5 minutes (anciennement cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Géré par RealtimeManager
      refetchOnReconnect: true,
      // Gestion d'erreurs globale
      onError: (error) => {
        if (import.meta.env.PROD) {
          Sentry.captureException(error, {
            contexts: {
              react_query: {
                type: 'query_error',
              },
            },
          });
        }
      },
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      // Gestion d'erreurs globale
      onError: (error) => {
        if (import.meta.env.PROD) {
          Sentry.captureException(error, {
            contexts: {
              react_query: {
                type: 'mutation_error',
              },
            },
          });
        }
      },
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
