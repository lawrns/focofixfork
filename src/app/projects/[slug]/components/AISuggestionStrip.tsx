'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AISuggestionStrip({ onApply, onDismiss }: { onApply: () => void; onDismiss: () => void }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3 mb-4 bg-gradient-to-r from-secondary to-secondary dark:from-secondary/30 dark:to-secondary/30 rounded-lg border dark:border-secondary dark:border-secondary/50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-1.5 bg-secondary dark:bg-secondary/50 rounded shrink-0">
          <Zap className="h-4 w-4 text-[color:var(--foco-teal)] dark:text-[color:var(--foco-teal)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-zinc-900 dark:text-zinc-50">
            <span className="font-medium">Team capacity is 92% next week</span>
            <span className="hidden md:inline">{' — '}</span>
            <span className="block md:inline text-zinc-600 dark:text-zinc-400">
              Consider moving &quot;Checkout flow redesign&quot; by 2 days
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Badge variant="secondary" className="text-[10px] hidden md:inline-flex">
          89% confident
        </Badge>
        <Button
          size="sm"
          variant="default"
          className="h-8 md:h-7 min-h-[44px] md:min-h-0 flex-1 md:flex-none"
          onClick={() => {
            onApply();
            setDismissed(true);
          }}
        >
          Apply
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 md:h-7 min-h-[44px] md:min-h-0 flex-1 md:flex-none"
          onClick={() => {
            onDismiss();
            setDismissed(true);
          }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
