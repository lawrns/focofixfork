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
      container: 'py-8 px-6',
      icon: 'h-10 w-10',
      iconContainer: 'mb-3',
      title: 'text-sm font-semibold',
      description: 'text-xs',
      spacing: 'gap-1.5',
    },
    md: {
      container: 'py-12 px-8',
      icon: 'h-14 w-14',
      iconContainer: 'mb-4',
      title: 'text-base font-semibold',
      description: 'text-sm',
      spacing: 'gap-2',
    },
    lg: {
      container: 'py-16 px-10',
      icon: 'h-20 w-20',
      iconContainer: 'mb-5',
      title: 'text-xl font-semibold',
      description: 'text-base',
      spacing: 'gap-3',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn('flex flex-col items-center text-center', sizes.container, className)}>
      {illustration ? (
        <div className={sizes.iconContainer}>{illustration}</div>
      ) : Icon ? (
        <div className={cn(
          'p-3 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900',
          sizes.iconContainer
        )}>
          <Icon
            className={cn(
              'text-zinc-400 dark:text-zinc-500',
              sizes.icon
            )}
            strokeWidth={1.5}
          />
        </div>
      ) : null}

      <div className={cn('flex flex-col', sizes.spacing)}>
        <h3 className={cn(
          'text-zinc-900 dark:text-zinc-50',
          sizes.title
        )}>
          {title}
        </h3>

        <p className={cn(
          'text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed',
          sizes.description
        )}>
          {description}
        </p>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className={cn('flex items-center gap-3 mt-6', {
          'flex-col sm:flex-row': size === 'lg',
        })}>
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              className="gap-2"
              size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              className="gap-2"
              size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
            >
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
