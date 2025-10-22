'use client';

import { useEffect, ReactNode } from 'react';
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

function ConditionalMobileNav() {
  const pathname = usePathnameClient();
  
  if (!pathname || ['/login', '/register', '/organization-setup'].includes(pathname)) {
    return null;
  }
  
  return <MobileBottomNav showFab={false} />;
}

function usePathnameClient() {
  try {
    const { usePathname } = require('next/navigation');
    return usePathname();
  } catch {
    return null;
  }
}

export function Providers({ children }: ProvidersProps) {
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
              <ConditionalMobileNav />
              <ToastViewport />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
