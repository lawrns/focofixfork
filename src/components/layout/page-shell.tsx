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
    <div className="relative w-full h-full">
      <div
        className={cn(
          'mx-auto w-full max-w-full px-5 py-4 space-y-6',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
