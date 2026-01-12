'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBreadcrumbs } from '@/lib/hooks/use-breadcrumbs';
import Link from 'next/link';
import { useMediaQuery } from '@/lib/hooks/use-media-query';

interface BreadcrumbsProps {
  projectName?: string;
  taskTitle?: string;
  className?: string;
}

export function Breadcrumbs({ projectName, taskTitle, className }: BreadcrumbsProps) {
  const breadcrumbs = useBreadcrumbs(projectName, taskTitle);
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // For mobile: show only current page and back button
  if (isMobile) {
    const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
    return (
      <nav
        className={cn('flex items-center gap-2', className)}
        aria-label="Breadcrumb"
        data-testid="breadcrumbs-mobile"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => window.history.back()}
          aria-label="Go back to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {currentBreadcrumb.truncated || currentBreadcrumb.label}
        </span>
      </nav>
    );
  }

  // Desktop: show full breadcrumb path
  return (
    <nav
      className={cn('flex items-center gap-1 text-sm', className)}
      aria-label="Breadcrumb"
      data-testid="breadcrumbs-full"
    >
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={index} className="flex items-center gap-1">
          {/* Separator before item (except first) */}
          {index > 0 && (
            <span
              className="text-zinc-400 dark:text-zinc-600 mx-1"
              data-testid="breadcrumb-separator"
              aria-hidden="true"
            >
              /
            </span>
          )}

          {/* Breadcrumb item */}
          {breadcrumb.href ? (
            <Link
              href={breadcrumb.href}
              className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              aria-label={`Navigate to ${breadcrumb.label}`}
            >
              {breadcrumb.truncated || breadcrumb.label}
            </Link>
          ) : (
            <span
              className={cn(
                'text-zinc-900 dark:text-zinc-100',
                breadcrumb.isCurrent && 'font-bold'
              )}
            >
              {breadcrumb.truncated || breadcrumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
