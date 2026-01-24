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
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { hapticService } from '@/lib/audio/haptic-service';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, density } = useUIPreferencesStore();
  const { isActive: focusModeActive } = useFocusModeStore();
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only rendering conditional UI after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Density-based spacing
  const densityClasses = {
    compact: 'text-sm',
    comfortable: 'text-sm',
    spacious: 'text-base',
  };

  // Landing page and auth pages should not have AppShell chrome
  const isPublicPage = isMounted && (pathname === '/' || pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password');

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
  if (isMounted && focusModeActive) {
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

      {/* Mobile Floating Action Button (FAB) - World Class UX */}
      {isMounted && !isPublicPage && !focusModeActive && (
        <div className="fixed bottom-6 right-6 z-40 md:hidden">
          <button
            onClick={() => {
              hapticService.light();
              setIsCreateTaskModalOpen(true);
            }}
            className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95 active:shadow-inner"
            aria-label="Create new task"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Global Modals */}
      <CreateTaskModal 
        isOpen={isCreateTaskModalOpen} 
        onClose={() => setIsCreateTaskModalOpen(false)} 
      />

      <InstallPrompt />

      <ToastContainer />
      <UndoToast />
    </div>
  );
}
