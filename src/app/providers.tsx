'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { I18nProvider } from '@/lib/i18n/context';
import { ThemeProvider } from '@/components/providers/theme-provider';
import ErrorBoundary from '@/components/error/error-boundary';
import { Toaster } from 'sonner';
import { ToastProvider, ToastViewport } from '@/components/toast/toast';
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const pathname = usePathname();

  // Initialize PWA
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      import('@/lib/services/pwa').then(({ PWAService }) => {
        PWAService.initialize();
      });
    }
  }, []);

  return (
    <ThemeProvider defaultTheme="light">
      <ErrorBoundary>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
              {/* <MobilePerformanceMonitor /> */}
              {pathname !== '/login' && pathname !== '/register' && pathname !== '/organization-setup' && <MobileBottomNav showFab={false} />}
              <Toaster />
              <ToastViewport />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
