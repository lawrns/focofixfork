'use client';

import { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUIPreferencesStore } from '@/lib/stores/foco-store';

interface PageShellProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
}

const FULL_WIDTH_CLASS = 'max-w-full'

const maxWidthClasses = {
  sm: FULL_WIDTH_CLASS,
  md: FULL_WIDTH_CLASS,
  lg: FULL_WIDTH_CLASS,
  xl: FULL_WIDTH_CLASS,
  '2xl': FULL_WIDTH_CLASS,
  '4xl': FULL_WIDTH_CLASS,
  '6xl': FULL_WIDTH_CLASS,
  '7xl': FULL_WIDTH_CLASS,
  full: FULL_WIDTH_CLASS,
};

export function PageShell({
  children,
  className,
  maxWidth = 'full',
}: PageShellProps) {
  const { density } = useUIPreferencesStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const effectiveDensity = isMounted ? density : 'comfortable';

  const densityPadding = {
    compact: 'space-y-4',
    comfortable: 'space-y-6',
    spacious: 'space-y-8',
  };

  return (
    <div className="relative w-full">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 sm:h-28 bg-[radial-gradient(80%_120%_at_50%_0%,rgba(var(--foco-teal-rgb),0.16),transparent)]"
      />
      <div
        className={cn(
          'mx-auto w-full animate-fade-in',
          maxWidthClasses[maxWidth],
          densityPadding[effectiveDensity],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
