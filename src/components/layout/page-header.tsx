'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MoreHorizontal, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SecondaryAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  destructive?: boolean;
  separator?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string | ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: SecondaryAction[];
  backHref?: string;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  primaryAction,
  secondaryActions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 truncate">
          {title}
        </h1>
        {subtitle && (
          <div className="text-sm text-zinc-500 mt-1">
            {subtitle}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {primaryAction}
        
        {secondaryActions && secondaryActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {secondaryActions.map((action, index) => (
                action.separator ? (
                  <DropdownMenuSeparator key={`sep-${index}`} />
                ) : (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={action.onClick}
                    className={cn(action.destructive && 'text-red-600 dark:text-red-400')}
                  >
                    {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                    {action.label}
                  </DropdownMenuItem>
                )
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
