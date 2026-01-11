'use client';

import { useEffect, ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { I18nProvider } from '@/lib/i18n/context';
import { ThemeProvider } from '@/components/providers/theme-provider';
import ErrorBoundary from '@/components/error/error-boundary';
import { Toaster } from 'sonner';
import { ToastProvider } from '@/components/ui/toast';
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav';

interface ProvidersProps {
  children: React.ReactNode;
}

function ConditionalMobileNav() {
  const pathname = usePathname();

  if (!pathname || ['/login', '/register', '/organization-setup'].includes(pathname)) {
    return null;
  }

  return <MobileBottomNav showFab={false} />;
}

export function Providers({ children }: ProvidersProps) {
  // Create QueryClient instance in state to ensure it's stable across renders
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Initialize PWA
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      import('@/lib/services/pwa').then(({ PWAService }) => {
        PWAService.initialize();
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <ErrorBoundary>
          <I18nProvider>
            <ToastProvider>
              <AuthProvider>
                {children}
                {typeof window !== 'undefined' && <ConditionalMobileNav />}
              </AuthProvider>
            </ToastProvider>
          </I18nProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
