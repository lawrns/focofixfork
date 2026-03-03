'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Trash2, 
  Play, 
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  GitBranch,
  Coins,
} from 'lucide-react';
import { OrchestrationWorkflow, PHASE_ORDER } from '../types';

interface WorkflowListProps {
  workflows: OrchestrationWorkflow[];
  selectedId?: string | null;
  onSelect?: (workflow: OrchestrationWorkflow) => void;
  onDelete?: (workflowId: string) => void;
}

const statusConfig = {
  draft: { label: 'Draft', icon: Clock, variant: 'secondary' as const },
  running: { label: 'Running', icon: Loader2, variant: 'default' as const },
  paused: { label: 'Paused', icon: Pause, variant: 'outline' as const },
  complete: { label: 'Complete', icon: CheckCircle2, variant: 'default' as const },
  failed: { label: 'Failed', icon: XCircle, variant: 'destructive' as const },
};

export function WorkflowList({ 
  workflows, 
  selectedId, 
  onSelect,
  onDelete,
}: WorkflowListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (workflowId: string) => {
    setDeletingId(workflowId);
    await onDelete?.(workflowId);
    setDeletingId(null);
  };

  if (workflows.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/50">
        <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No workflows yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first orchestration workflow to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Workflow</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workflows.map((workflow) => {
            const status = statusConfig[workflow.status];
            const StatusIcon = status.icon;
            const progress = Math.round((workflow.current_phase_idx / PHASE_ORDER.length) * 100);
            const isSelected = selectedId === workflow.id;

            return (
              <TableRow
                key={workflow.id}
                className={cn(
                  'cursor-pointer transition-colors',
                  isSelected && 'bg-[color:var(--foco-teal-dim)]',
                  !isSelected && 'hover:bg-muted/50'
                )}
                onClick={() => onSelect?.(workflow)}
              >
                <TableCell>
                  <div>
                    <div className="font-medium">{workflow.title}</div>
                    {workflow.project && (
                      <div className="text-xs text-muted-foreground">
                        {workflow.project.name}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant} className="gap-1">
                    <StatusIcon className={cn('h-3 w-3', workflow.status === 'running' && 'animate-spin')} />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          'h-full transition-all',
                          workflow.status === 'complete' && 'bg-green-500',
                          workflow.status === 'running' && 'bg-blue-500',
                          workflow.status === 'failed' && 'bg-red-500',
                          workflow.status === 'draft' && 'bg-gray-400',
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {workflow.current_phase_idx}/{PHASE_ORDER.length}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>${workflow.total_cost_usd.toFixed(4)}</span>
                  </div>
                  {(workflow.total_tokens_in > 0 || workflow.total_tokens_out > 0) && (
                    <div className="text-xs text-muted-foreground">
                      {(workflow.total_tokens_in + workflow.total_tokens_out).toLocaleString()} tokens
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {deletingId === workflow.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect?.(workflow);
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 dark:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(workflow.id);
                        }}
                        disabled={deletingId === workflow.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
