'use client';

import { Zap, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TaskActionType } from '@/lib/services/task-action-service';

interface AIPanelProps {
  taskId: string;
  workspaceId: string;
  aiLoading: TaskActionType | null;
  onAction: (action: TaskActionType) => void;
}

export function AIPanel({ taskId, workspaceId, aiLoading, onAction }: AIPanelProps) {
  const actions: { action: TaskActionType; label: string }[] = [
    { action: 'suggest_subtasks', label: 'Suggest subtasks' },
    { action: 'draft_acceptance', label: 'Draft acceptance criteria' },
    { action: 'summarize_thread', label: 'Summarize thread' },
    { action: 'propose_next_step', label: 'Propose next step' },
    { action: 'detect_blockers', label: 'Detect blockers' },
  ];

  return (
    <div className="p-4 bg-gradient-to-br from-secondary to-secondary dark:from-secondary/30 dark:to-secondary/30 rounded-lg border dark:border-secondary dark:border-secondary/50">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-[color:var(--foco-teal)]" />
        <span className="font-medium text-sm">AI Actions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ action, label }) => (
          <Button
            key={action}
            variant="outline"
            size="sm"
            disabled={aiLoading !== null}
            onClick={() => onAction(action)}
          >
            {aiLoading === action ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1.5" />
            )}
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
