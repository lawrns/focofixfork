'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Circle } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WorkItem } from '@/types/foco';
import { WorkItemCard } from './work-item-card';

type SectionType = 'now' | 'next' | 'later' | 'waiting' | 'done';

const sectionConfig: Record<SectionType, { label: string; badgeColor: string; borderColor: string }> = {
  now: { label: 'Now', badgeColor: 'bg-rose-500', borderColor: 'border-rose-300 dark:border-rose-900' },
  next: { label: 'Next', badgeColor: 'bg-amber-400', borderColor: 'border-amber-300 dark:border-amber-900' },
  later: { label: 'Later', badgeColor: 'bg-blue-500', borderColor: 'border-blue-300 dark:border-blue-900' },
  waiting: { label: 'Waiting', badgeColor: 'bg-slate-400', borderColor: 'border-slate-300 dark:border-slate-900' },
  done: { label: 'Done', badgeColor: 'bg-emerald-500', borderColor: 'border-emerald-300 dark:border-emerald-900' },
};

export function KanbanColumn({
  section,
  items,
  onStartFocus,
  onQuickAdd,
  onMoveToSection,
  onRemoveFromMyWork,
  selectedIds,
  onToggleSelect,
}: {
  section: 'now' | 'next' | 'later' | 'waiting';
  items: (WorkItem & { section: string })[];
  onStartFocus: (item: WorkItem) => void;
  onQuickAdd: (title: string, section: SectionType) => Promise<void>;
  onMoveToSection: (itemId: string, section: SectionType) => Promise<void>;
  onRemoveFromMyWork: (itemId: string) => Promise<void>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const config = sectionConfig[section];
  const [showInlineInput, setShowInlineInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInlineInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInlineInput]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onQuickAdd(inputValue.trim(), section);
      setInputValue('');
      setShowInlineInput(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setInputValue('');
      setShowInlineInput(false);
    }
  };

  return (
    <div className="flex flex-col min-w-[260px] md:min-w-[280px] flex-1 max-w-[320px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('h-2.5 w-2.5 rounded-full', config.badgeColor)} />
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
          {config.label}
        </h3>
        <Badge variant="secondary" className="text-xs ml-auto">
          {items.length}
        </Badge>
      </div>

      <Droppable droppableId={section}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 rounded-lg border-2 border-dashed p-2 space-y-2 transition-colors',
              snapshot.isDraggingOver
                ? cn('border-solid', config.borderColor, 'bg-opacity-5')
                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/20'
            )}
          >
            {items.length === 0 && !showInlineInput ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xs text-zinc-400 mb-2">No tasks</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setShowInlineInput(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add task
                </Button>
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
                          isSelected={selectedIds.has(item.id)}
                          onToggleSelect={onToggleSelect}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}

                {showInlineInput ? (
                  <div className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <Circle className="h-4 w-4 text-zinc-300 shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={() => {
                        if (!inputValue.trim()) setShowInlineInput(false);
                      }}
                      placeholder="Task name..."
                      className="flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-400"
                      disabled={isSubmitting}
                    />
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-zinc-500 h-8"
                    onClick={() => setShowInlineInput(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add task
                  </Button>
                )}

                {provided.placeholder}
              </>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
