'use client';

import { cn } from '@/lib/utils';
import { useMobile } from '@/lib/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorkItem, WorkItemStatus } from '@/types/foco';
import { BoardColumn } from './BoardColumn';
import { columns } from './constants';

interface BoardViewProps {
  tasks: WorkItem[];
  currentColumnIndex: number;
  setCurrentColumnIndex: (index: number) => void;
  onDrop: (taskId: string, newStatus: WorkItemStatus) => void;
  onAddTask: (status: WorkItemStatus) => void;
  onComplete: (item: WorkItem) => void;
  onArchive: (item: WorkItem) => void;
  onQueueToAI: (taskId: string) => void;
}

export function BoardView({
  tasks,
  currentColumnIndex,
  setCurrentColumnIndex,
  onDrop,
  onAddTask,
  onComplete,
  onArchive,
  onQueueToAI,
}: BoardViewProps) {
  const isMobile = useMobile();

  const getItemsByStatus = (status: WorkItemStatus) =>
    tasks.filter(item => item.status === status);

  if (isMobile) {
    return (
      <div className="relative">
        <div className="overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentColumnIndex}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.3 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset }) => {
                if (offset.x < -50 && currentColumnIndex < columns.length - 1) {
                  setCurrentColumnIndex(currentColumnIndex + 1);
                } else if (offset.x > 50 && currentColumnIndex > 0) {
                  setCurrentColumnIndex(currentColumnIndex - 1);
                }
              }}
            >
              <BoardColumn
                status={columns[currentColumnIndex].status}
                label={columns[currentColumnIndex].label}
                color={columns[currentColumnIndex].color}
                items={getItemsByStatus(columns[currentColumnIndex].status)}
                onDrop={onDrop}
                onAddTask={onAddTask}
                onComplete={onComplete}
                onArchive={onArchive}
                onQueueToAI={onQueueToAI}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-2 mt-4">
          {columns.map((column, index) => (
            <button
              key={column.status}
              onClick={() => setCurrentColumnIndex(index)}
              className={cn(
                'h-2 w-2 rounded-full transition-all',
                index === currentColumnIndex
                  ? 'bg-[color:var(--foco-teal)] w-6'
                  : 'bg-zinc-300 dark:bg-zinc-700'
              )}
              aria-label={`Go to ${column.label}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 md:gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {columns.map((column) => (
        <BoardColumn
          key={column.status}
          status={column.status}
          label={column.label}
          color={column.color}
          items={getItemsByStatus(column.status)}
          onDrop={onDrop}
          onAddTask={onAddTask}
          onComplete={onComplete}
          onArchive={onArchive}
          onQueueToAI={onQueueToAI}
        />
      ))}
    </div>
  );
}
