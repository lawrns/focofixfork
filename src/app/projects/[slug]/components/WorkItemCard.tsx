'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useMobile } from '@/lib/hooks/use-mobile';
import { SwipeableTaskCard } from '@/components/ui/swipeable-task-card';
import {
  AlertTriangle,
  Clock,
  GripVertical,
  CheckCircle2,
  Bot,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { WorkItem } from '@/types/foco';
import { priorityColors } from './constants';
import { DelegationBadge } from './DelegationBadge';

export function WorkItemCard({ item, onDragStart, onDragEnd, onComplete, onArchive }: {
  item: WorkItem;
  onDragStart?: (item: WorkItem) => void;
  onDragEnd?: () => void;
  onComplete?: (item: WorkItem) => void;
  onArchive?: (item: WorkItem) => void;
}) {
  const router = useRouter();
  const isMobile = useMobile();
  const [isDragging, setIsDragging] = useState(false);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/tasks/${item.id}`);
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(item);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  const handleComplete = () => {
    onComplete?.(item);
  };

  const handleArchive = () => {
    onArchive?.(item);
  };

  const metadata = typeof item.metadata === 'object' && item.metadata !== null
    ? item.metadata as Record<string, unknown>
    : {};
  const executionState = metadata.execution_state as Record<string, unknown> | undefined;
  const verificationSummary = metadata.verification_summary as Record<string, unknown> | undefined;
  const latestExecutionSummary = typeof executionState?.summary === 'string' ? executionState.summary : null;
  const latestVerificationStatus = typeof verificationSummary?.latest_status === 'string' ? verificationSummary.latest_status : null;
  const recommendedAgent = typeof item.assigned_agent === 'string'
    ? item.assigned_agent
    : typeof metadata.recommended_agent === 'string'
      ? metadata.recommended_agent
      : null;

  const cardContent = (
    <div
      draggable={!isMobile}
      onDragStart={!isMobile ? handleDragStart : undefined}
      onDragEnd={!isMobile ? handleDragEnd : undefined}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'p-2 md:p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800',
        'hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all',
        'group min-h-[44px]',
        !isMobile && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 border-[color:var(--foco-teal)] shadow-lg'
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <div className={cn('h-1.5 w-1.5 md:h-2 md:w-2 rounded-full mt-1.5 shrink-0', priorityColors[item.priority])} />
            <span className="font-medium text-xs md:text-sm text-zinc-900 dark:text-zinc-50 line-clamp-2">
              {item.title}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {item.delegation_status && item.delegation_status !== 'none' && (
              <DelegationBadge status={item.delegation_status} />
            )}
            {item.type === 'bug' && (
              <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                Bug
              </Badge>
            )}
            {item.type === 'feature' && (
              <Badge variant="outline" className="h-4 md:h-5 text-[9px] md:text-[10px] text-purple-600 border-purple-200 bg-purple-50">
                Feature
              </Badge>
            )}
            {item.status === 'blocked' && item.blocked_reason && (
              <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Blocked
              </Badge>
            )}
            {recommendedAgent && (
              <Badge variant="outline" className="text-xs text-blue-700 border-blue-200 bg-blue-50">
                <Bot className="mr-1 h-3 w-3" />
                {recommendedAgent}
              </Badge>
            )}
            {latestVerificationStatus && (
              <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {latestVerificationStatus}
              </Badge>
            )}
          </div>

          {latestExecutionSummary && (
            <p className="mb-2 line-clamp-2 text-[11px] text-zinc-500">
              {latestExecutionSummary}
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {item.due_date && (
                <span className={cn(
                  'flex items-center gap-1 text-xs',
                  new Date(item.due_date) < new Date()
                    ? 'text-red-500'
                    : 'text-zinc-500'
                )}>
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="truncate">{new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </span>
              )}
            </div>
            {item.assignee && (
              <Avatar className="h-4 w-4 md:h-5 md:w-5 shrink-0">
                <AvatarFallback className="text-[7px] md:text-[8px]">
                  {item.assignee.full_name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-zinc-400 mt-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
        Double-click to open
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <SwipeableTaskCard
        onComplete={handleComplete}
        onArchive={handleArchive}
      >
        {cardContent}
      </SwipeableTaskCard>
    );
  }

  return cardContent;
}
