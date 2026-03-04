'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import type { WorkItem } from '@/types/foco';
import { WorkItemCard } from './work-item-card';

type SectionType = 'now' | 'next' | 'later' | 'waiting' | 'done';

export function DoneColumn({
  items,
  onStartFocus,
  onMoveToSection,
  onRemoveFromMyWork,
  selectedIds,
  onToggleSelect,
}: {
  items: (WorkItem & { section: string })[];
  onStartFocus: (item: WorkItem) => void;
  onMoveToSection: (itemId: string, section: SectionType) => Promise<void>;
  onRemoveFromMyWork: (itemId: string) => Promise<void>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col min-w-[260px] md:min-w-[280px] flex-1 max-w-[320px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">Done</h3>
        <Badge variant="secondary" className="text-xs ml-auto">
          {items.length}
        </Badge>
      </div>

      <Droppable droppableId="done" isDropDisabled={true}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 rounded-lg border-2 border-dashed p-2 space-y-2 transition-colors',
              'border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/20'
            )}
          >
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-6 w-6 text-zinc-200 dark:text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-400">Nothing completed yet</p>
              </div>
            ) : (
              <>
                {items.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={cn(snapshot.isDragging && 'opacity-50')}
                      >
                        <WorkItemCard
                          item={item}
                          onStartFocus={onStartFocus}
                          onMoveToSection={onMoveToSection}
                          onRemoveFromMyWork={onRemoveFromMyWork}
                          isReadOnly
                          isSelected={selectedIds.has(item.id)}
                          onToggleSelect={onToggleSelect}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
