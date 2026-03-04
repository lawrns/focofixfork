'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Loader2, CheckCheck, MoveRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SectionType = 'now' | 'next' | 'later' | 'waiting' | 'done';

const sectionConfig: Record<SectionType, { label: string; badgeColor: string; borderColor: string }> = {
  now: { label: 'Now', badgeColor: 'bg-rose-500', borderColor: 'border-rose-300 dark:border-rose-900' },
  next: { label: 'Next', badgeColor: 'bg-amber-400', borderColor: 'border-amber-300 dark:border-amber-900' },
  later: { label: 'Later', badgeColor: 'bg-blue-500', borderColor: 'border-blue-300 dark:border-blue-900' },
  waiting: { label: 'Waiting', badgeColor: 'bg-slate-400', borderColor: 'border-slate-300 dark:border-slate-900' },
  done: { label: 'Done', badgeColor: 'bg-emerald-500', borderColor: 'border-emerald-300 dark:border-emerald-900' },
};

export function BatchToolbar({
  selectedIds,
  onClear,
  onBatchComplete,
  onBatchMove,
}: {
  selectedIds: Set<string>;
  onClear: () => void;
  onBatchComplete: () => Promise<void>;
  onBatchMove: (section: SectionType) => Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handle = async (action: string, fn: () => Promise<void>) => {
    setIsLoading(action);
    try {
      await fn();
    } finally {
      setIsLoading(null);
    }
  };

  if (selectedIds.size === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-800 text-white rounded-xl shadow-2xl border border-zinc-700">
      <span className="text-sm font-medium mr-1">
        {selectedIds.size} selected
      </span>
      <div className="w-px h-4 bg-zinc-600" />

      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:bg-zinc-700 h-7 text-xs"
        disabled={isLoading !== null}
        onClick={() => handle('complete', onBatchComplete)}
      >
        {isLoading === 'complete' ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <CheckCheck className="h-3 w-3 mr-1" />
        )}
        Complete
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-zinc-700 h-7 text-xs"
            disabled={isLoading !== null}
          >
            <MoveRight className="h-3 w-3 mr-1" />
            Move to
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          {(['now', 'next', 'later', 'waiting'] as const).map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => handle(`move-${s}`, () => onBatchMove(s))}
            >
              <div className={cn('h-2 w-2 rounded-full mr-2', sectionConfig[s].badgeColor)} />
              {sectionConfig[s].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-4 bg-zinc-600" />
      <Button
        variant="ghost"
        size="sm"
        className="text-zinc-400 hover:bg-zinc-700 hover:text-white h-7 text-xs"
        onClick={onClear}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
