'use client';

import { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal';

interface ShortcutHintProps {
  children: ReactNode;
  shortcut?: string;
  ariaLabel?: string;
}

function ShortcutBadge({ shortcut, visible }: { shortcut: string; visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      role="tooltip"
      className={cn(
        'absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded',
        'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900',
        'text-xs font-mono font-semibold whitespace-nowrap',
        'pointer-events-none z-50 animation-fade-in',
        !visible && 'opacity-0'
      )}
    >
      <kbd
        className="text-inherit"
        aria-label={`Shortcut: ${shortcut}`}
      >
        {shortcut}
      </kbd>
    </div>
  );
}

export function ShortcutHint({ children, shortcut, ariaLabel }: ShortcutHintProps) {
  const [showBadge, setShowBadge] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => shortcut && setShowBadge(true)}
      onMouseLeave={() => setShowBadge(false)}
    >
      {children}
      {shortcut && (
        <ShortcutBadge shortcut={shortcut} visible={showBadge} />
      )}
    </div>
  );
}

export function KeyboardShortcutHints() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <KeyboardShortcutsModal />
    </>
  );
}

// Hook to add shortcut hints to buttons
export function useShortcutHint(shortcut?: string) {
  return {
    'data-shortcut': shortcut,
  };
}
