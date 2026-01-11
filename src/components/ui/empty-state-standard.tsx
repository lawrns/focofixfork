'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'h-8 w-8',
      title: 'text-sm font-medium',
      description: 'text-xs',
    },
    md: {
      container: 'py-12',
      icon: 'h-12 w-12',
      title: 'text-base font-medium',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'h-16 w-16',
      title: 'text-lg font-semibold',
      description: 'text-sm',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn('flex flex-col items-center text-center', sizes.container, className)}>
      {illustration ? (
        <div className="mb-4">{illustration}</div>
      ) : Icon ? (
        <div className="mb-4">
          <Icon className={cn('text-zinc-300 dark:text-zinc-600', sizes.icon)} strokeWidth={1.5} />
        </div>
      ) : null}

      <h3 className={cn('text-zinc-900 dark:text-zinc-50 mb-1', sizes.title)}>
        {title}
      </h3>
      
      <p className={cn('text-zinc-500 max-w-sm', sizes.description)}>
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3 mt-4">
          {primaryAction && (
            <Button onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states using copy library
export { EmptyState as default };
