'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useUIPreferencesStore } from '@/lib/stores/foco-store';

interface PageShellProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function PageShell({ 
  children, 
  className,
  maxWidth = '7xl',
}: PageShellProps) {
  const { density } = useUIPreferencesStore();

  const densityPadding = {
    compact: 'space-y-4',
    comfortable: 'space-y-6',
    spacious: 'space-y-8',
  };

  return (
    <div 
      className={cn(
        'mx-auto w-full',
        maxWidthClasses[maxWidth],
        densityPadding[density],
        className
      )}
    >
      {children}
    </div>
  );
}
