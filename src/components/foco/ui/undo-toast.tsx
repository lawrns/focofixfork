'use client';

import { useEffect } from 'react';
import { useUndoStore } from '@/lib/stores/foco-store';
import { cn } from '@/lib/utils';
import { Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

export function UndoToast() {
  const { actions, undoAction, removeAction, clearExpired } = useUndoStore();

  // Clear expired actions periodically
  useEffect(() => {
    const interval = setInterval(clearExpired, 1000);
    return () => clearInterval(interval);
  }, [clearExpired]);

  const latestAction = actions[actions.length - 1];

  if (!latestAction) return null;

  const timeRemaining = Math.max(0, Math.ceil((latestAction.expiresAt - Date.now()) / 1000));

  return (
    <AnimatePresence>
      {latestAction && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
            'bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900',
            'border border-zinc-800 dark:border-zinc-200'
          )}>
            <span className="text-sm">{latestAction.description}</span>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-zinc-300 dark:text-zinc-600 hover:text-zinc-50 dark:hover:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
              onClick={() => undoAction(latestAction.id)}
            >
              <Undo2 className="h-3.5 w-3.5 mr-1" />
              Undo
              <span className="ml-1 text-xs opacity-60">({timeRemaining}s)</span>
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 dark:text-zinc-500 hover:text-zinc-50 dark:hover:text-zinc-900"
              onClick={() => removeAction(latestAction.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
