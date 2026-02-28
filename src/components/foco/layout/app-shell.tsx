'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIPreferencesStore, useFocusModeStore } from '@/lib/stores/foco-store';
import { LeftRail } from './left-rail';
import { TopBar } from './top-bar';
import { MobileMenu } from './mobile-menu';
import { CommandPalette } from './command-palette';
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal';
import { ToastContainer } from '../ui/toast-container';
import { UndoToast } from '../ui/undo-toast';

import { Send } from 'lucide-react';
import { BossBar } from '@/components/critter/boss-bar';
import { SwarmProvider } from '@/components/critter/swarm-context';

interface AppShellProps {
  children: ReactNode;
}

// Pages that should not show the app chrome (sidebar, topbar, etc.)
const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password']);

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, density } = useUIPreferencesStore();
  const { isActive: focusModeActive } = useFocusModeStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const densityClasses: Record<string, string> = {
    compact: 'text-sm',
    comfortable: 'text-sm',
    spacious: 'text-base',
  };

  // ⚠️ HYDRATION FIX: pathname from usePathname() is undefined on server (SSR).
  const isPublicPage = pathname ? PUBLIC_PATHS.has(pathname) : false;

  // Gate focus mode on isMounted to avoid reading Zustand persist before hydration
  const focusModeActiveAfterMount = isMounted && focusModeActive;
  const isAppPage = !isPublicPage;
  const isFocusMode = isAppPage && focusModeActiveAfterMount;

  // Gate sidebar collapse on isMounted
  const sidebarCollapsedAfterMount = isMounted && sidebarCollapsed;

  const mainPaddingLeft = sidebarCollapsedAfterMount ? 'md:pl-[52px]' : 'md:pl-60';

  return (
    <SwarmProvider>
    <div
      suppressHydrationWarning
      className="min-h-screen bg-background text-foreground"
    >
      {/* Command palette + shortcuts always available */}
      <CommandPalette />
      <KeyboardShortcutsModal />

      {/*
        IMPORTANT: Gate chrome on isMounted *and* isAppPage.
      */}
      {isMounted && isAppPage && (
        <>
          <MobileMenu />
          <LeftRail />
          <TopBar />
        </>
      )}

      {/* Focus mode exit button — only after mount to avoid SSR mismatch */}
      {isFocusMode && (
        <button
          onClick={() => useFocusModeStore.getState().deactivate()}
          className="fixed top-4 right-4 z-50 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg shadow-lg hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <span>✕</span>
          Exit Focus Mode
        </button>
      )}

      {/* Main content area - stable structure for hydration */}
      <main
        suppressHydrationWarning
        className={cn(
          'min-h-screen transition-all duration-200',
          'pt-12 md:pt-14',
          mainPaddingLeft,
        )}
      >
        <div className="p-3 md:p-6">
          {children}
        </div>
      </main>

      {/* Mobile FAB — Dispatch */}
      {isMounted && isAppPage && !isFocusMode && (
        <div className="fixed bottom-6 right-6 z-40 md:hidden">
          <button
            onClick={() => router.push('/openclaw')}
            className="w-14 h-14 bg-[color:var(--foco-teal)] text-white rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95 active:shadow-inner hover:opacity-90"
            aria-label="Dispatch agent"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      )}

      <ToastContainer />
      <UndoToast />

      {/* BossBar — fleet status strip for app pages only */}
      {isMounted && isAppPage && <BossBar />}
    </div>
    </SwarmProvider>
  );
}
