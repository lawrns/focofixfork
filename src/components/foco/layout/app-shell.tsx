'use client';

import { ReactNode } from 'react';
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

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, density } = useUIPreferencesStore();
  const { isActive: focusModeActive } = useFocusModeStore();

  // Density-based spacing
  const densityClasses = {
    compact: 'text-sm',
    comfortable: 'text-sm',
    spacious: 'text-base',
  };

  // Landing page and auth pages should not have AppShell chrome
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password';

  if (isPublicPage) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <CommandPalette />
        <KeyboardShortcutsModal />
        <main className="min-h-screen">
          {children}
        </main>
        <ToastContainer />
        <UndoToast />
      </div>
    );
  }

  // Focus mode: show minimal UI with exit button
  if (focusModeActive) {
    const { deactivate } = useFocusModeStore.getState();
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <CommandPalette />
        <KeyboardShortcutsModal />
        {/* Exit Focus Mode Button - Always visible */}
        <button
          onClick={() => deactivate()}
          className="fixed top-4 right-4 z-50 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg shadow-lg hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <span>✕</span>
          Exit Focus Mode
        </button>
        <main className="min-h-screen">
          {children}
        </main>
        <ToastContainer />
        <UndoToast />
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-zinc-50 dark:bg-zinc-950', densityClasses[density])}>
      <CommandPalette />
      <KeyboardShortcutsModal />
      <MobileMenu />
      <LeftRail />
      <TopBar />

      <main
        className={cn(
          'pt-12 md:pt-14 min-h-screen transition-all duration-200',
          'md:pl-64',
          sidebarCollapsed && 'md:pl-16'
        )}
      >
        <div className="p-3 md:p-6">
          {children}
        </div>
      </main>

      <ToastContainer />
      <UndoToast />
    </div>
  );
}
