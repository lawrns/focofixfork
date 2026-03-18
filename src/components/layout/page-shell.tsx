'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
}

export function PageShell({
  children,
  className,
  maxWidth = 'full',
}: PageShellProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col w-full">
      <div
        className={cn(
          'mx-auto w-full max-w-full px-4 py-3 space-y-4 flex-1 min-h-0',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
