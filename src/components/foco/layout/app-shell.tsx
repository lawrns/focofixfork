'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIPreferencesStore, useFocusModeStore } from '@/lib/stores/foco-store';
import { LeftRail } from './left-rail';
import { TopBar } from './top-bar';
import { MobileMenu } from './mobile-menu';
import { CommandPalette } from './command-palette';
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal';
import { ToastContainer } from '../ui/toast-container';
import { UndoToast } from '../ui/undo-toast';

import { Plus } from 'lucide-react';
import { CreateTaskModal } from '@/features/tasks/components/create-task-modal';
import { hapticService } from '@/lib/audio/haptic-service';
import { BossBar } from '@/components/clawfusion/boss-bar';
import { SwarmProvider } from '@/components/clawfusion/swarm-context';

interface AppShellProps {
  children: ReactNode;
}

// Pages that should not show the app chrome (sidebar, topbar, etc.)
const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password']);

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, density } = useUIPreferencesStore();
  const { isActive: focusModeActive } = useFocusModeStore();
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const densityClasses: Record<string, string> = {
    compact: 'text-sm',
    comfortable: 'text-sm',
    spacious: 'text-base',
  };

  // Stable across SSR + client (pathname comes from server)
  const isPublicPage = PUBLIC_PATHS.has(pathname);

  // Gate focus mode on isMounted to avoid reading Zustand persist before hydration
  const focusModeActiveAfterMount = isMounted && focusModeActive;
  const isAppPage = !isPublicPage;
  const isFocusMode = isAppPage && focusModeActiveAfterMount;

  // Gate sidebar collapse on isMounted — Zustand persist reads localStorage
  // synchronously on the client, which would differ from the SSR default (false)
  const sidebarCollapsedAfterMount = isMounted && sidebarCollapsed;

  const mainPaddingLeft = sidebarCollapsedAfterMount ? 'md:pl-[52px]' : 'md:pl-60';

  return (
    <SwarmProvider>
    <div
      suppressHydrationWarning
      className={cn(
        'min-h-screen bg-background text-foreground',
        isMounted && isAppPage && density && densityClasses[density],
      )}
    >
      {/* Command palette + shortcuts always available */}
      <CommandPalette />
      <KeyboardShortcutsModal />

      {/*
        IMPORTANT: Only render chrome components for app pages.
        Do NOT use CSS hide (className="hidden") — that still renders the components
        and causes hydration mismatches from Zustand persist reading localStorage.
      */}
      {isAppPage && (
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

      {/* Main content area */}
      <main
        suppressHydrationWarning
        className={cn(
          'min-h-screen transition-all duration-200',
          isMounted && isAppPage && !isFocusMode && [
            'pt-12 md:pt-14',
            mainPaddingLeft,
          ],
        )}
      >
        <div className={isMounted && isAppPage && !isFocusMode ? 'p-3 md:p-6' : ''}>
          {children}
        </div>
      </main>

      {/* Mobile FAB — only for mounted app pages */}
      {isMounted && isAppPage && !isFocusMode && (
        <div className="fixed bottom-6 right-6 z-40 md:hidden">
          <button
            onClick={() => {
              hapticService.light();
              setIsCreateTaskModalOpen(true);
            }}
            className="w-14 h-14 bg-[color:var(--foco-teal)] text-white rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95 active:shadow-inner hover:opacity-90"
            aria-label="Create new task"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Global modals */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
      />

      <ToastContainer />
      <UndoToast />

      {/* BossBar — fleet status strip for app pages only */}
      {isMounted && isAppPage && <BossBar />}
    </div>
    </SwarmProvider>
  );
}
