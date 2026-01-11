'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useUIPreferencesStore, useFocusModeStore } from '@/lib/stores/foco-store';
import { LeftRail } from './left-rail';
import { TopBar } from './top-bar';
import { CommandPalette } from './command-palette';
import { ToastContainer } from '../ui/toast-container';
import { UndoToast } from '../ui/undo-toast';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { sidebarCollapsed, density } = useUIPreferencesStore();
  const { isActive: focusModeActive } = useFocusModeStore();

  // Density-based spacing
  const densityClasses = {
    compact: 'text-sm',
    comfortable: 'text-sm',
    spacious: 'text-base',
  };

  if (focusModeActive) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <CommandPalette />
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
      <LeftRail />
      <TopBar />
      
      <main
        className={cn(
          'pt-14 min-h-screen transition-all duration-200',
          sidebarCollapsed ? 'pl-16' : 'pl-64'
        )}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
      
      <ToastContainer />
      <UndoToast />
    </div>
  );
}
