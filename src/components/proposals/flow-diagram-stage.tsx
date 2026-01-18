'use client'

import { memo, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { FlowDiagramTaskCard } from './flow-diagram-task-card'
import { staggerContainerVariants, staggerItemVariants, type AnimationPhase } from './flow-diagram-animations'
import type { ProposalItem, ProposalItemAction } from '@/types/proposals'

// ============================================================================
// TYPES
// ============================================================================

export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done'

export interface TaskWithAction {
  item: ProposalItem
  action: ProposalItemAction | 'existing'
  targetStatus?: TaskStatus
  sourceStatus?: TaskStatus
}

export interface FlowDiagramStageProps {
  status: TaskStatus
  label: string
  tasks: TaskWithAction[]
  animationPhase?: AnimationPhase
  onTaskClick?: (item: ProposalItem) => void
  onTaskRevert?: (item: ProposalItem) => void
  selectedTaskId?: string | null
  className?: string
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

const statusConfig: Record<TaskStatus, { color: string; bgColor: string }> = {
  backlog: {
    color: 'text-zinc-600 dark:text-zinc-400',
    bgColor: 'bg-zinc-50 dark:bg-zinc-900/50',
  },
  in_progress: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50/50 dark:bg-blue-950/20',
  },
  review: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50/50 dark:bg-amber-950/20',
  },
  done: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20',
  },
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FlowDiagramStage = memo(function FlowDiagramStage({
  status,
  label,
  tasks,
  animationPhase = 'idle',
  onTaskClick,
  onTaskRevert,
  selectedTaskId,
  className,
}: FlowDiagramStageProps) {
  const config = statusConfig[status]

  // Separate tasks by their animation state
  const { stayingTasks, arrivingTasks, leavingTasks } = useMemo(() => {
    const staying: TaskWithAction[] = []
    const arriving: TaskWithAction[] = []
    const leaving: TaskWithAction[] = []

    for (const task of tasks) {
      // Tasks being removed leave
      if (task.action === 'remove') {
        leaving.push(task)
        continue
      }

      // New tasks or tasks moving TO this status arrive
      if (task.action === 'add' || (task.action === 'modify' && task.targetStatus === status)) {
        arriving.push(task)
        continue
      }

      // Tasks moving FROM this status leave
      if (task.action === 'modify' && task.sourceStatus === status && task.targetStatus !== status) {
        leaving.push(task)
        continue
      }

      // Everything else stays
      staying.push(task)
    }

    return { stayingTasks: staying, arrivingTasks: arriving, leavingTasks: leaving }
  }, [tasks, status])

  // Count for header badge
  const totalCount = tasks.length
  const addCount = tasks.filter(t => t.action === 'add').length
  const removeCount = tasks.filter(t => t.action === 'remove').length

  return (
    <div className={cn('flex flex-col min-w-[200px] w-[200px]', className)}>
      {/* Stage header */}
      <div className={cn('px-3 py-2 rounded-t-lg border-b', config.bgColor)}>
        <div className="flex items-center justify-between">
          <h3 className={cn('text-sm font-semibold', config.color)}>{label}</h3>
          <div className="flex items-center gap-1.5">
            {addCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                +{addCount}
              </span>
            )}
            {removeCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                -{removeCount}
              </span>
            )}
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
              {totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Task list container */}
      <motion.div
        className={cn(
          'flex-1 p-2 space-y-2 rounded-b-lg border border-t-0',
          'border-zinc-200 dark:border-zinc-800',
          'bg-white/50 dark:bg-zinc-900/30',
          'min-h-[120px] max-h-[400px] overflow-y-auto'
        )}
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {/* Staying tasks (no special animation) */}
          {stayingTasks.map((task) => (
            <motion.div
              key={task.item.id}
              variants={staggerItemVariants}
              layout
            >
              <FlowDiagramTaskCard
                item={task.item}
                action={task.action}
                animationPhase={animationPhase}
                isAnimating={animationPhase !== 'idle' && animationPhase !== 'complete'}
                onClick={() => onTaskClick?.(task.item)}
                onRevert={task.action !== 'existing' ? () => onTaskRevert?.(task.item) : undefined}
                isSelected={selectedTaskId === task.item.id}
              />
            </motion.div>
          ))}

          {/* Arriving tasks (will animate in during 'adding' phase) */}
          {arrivingTasks.map((task) => (
            <motion.div
              key={task.item.id}
              variants={staggerItemVariants}
              layout
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{
                opacity: animationPhase === 'idle' || ['adding', 'settling', 'complete'].includes(animationPhase) ? 1 : 0,
                scale: 1,
                y: 0,
              }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
            >
              <FlowDiagramTaskCard
                item={task.item}
                action={task.action}
                animationPhase={animationPhase}
                isAnimating={animationPhase !== 'idle' && animationPhase !== 'complete'}
                onClick={() => onTaskClick?.(task.item)}
                onRevert={task.action !== 'existing' ? () => onTaskRevert?.(task.item) : undefined}
                isSelected={selectedTaskId === task.item.id}
              />
            </motion.div>
          ))}

          {/* Leaving tasks (will animate out during 'removing' phase) */}
          {leavingTasks.map((task) => (
            <motion.div
              key={task.item.id}
              variants={staggerItemVariants}
              layout
              initial={{ opacity: 1 }}
              animate={{
                opacity: ['removing', 'moving', 'adding', 'settling', 'complete'].includes(animationPhase) ? 0 : 1,
                scale: ['removing', 'moving', 'adding', 'settling', 'complete'].includes(animationPhase) ? 0.9 : 1,
                filter: ['removing', 'moving', 'adding', 'settling', 'complete'].includes(animationPhase) ? 'blur(4px)' : 'blur(0px)',
              }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <FlowDiagramTaskCard
                item={task.item}
                action={task.action}
                animationPhase={animationPhase}
                isAnimating={animationPhase !== 'idle' && animationPhase !== 'complete'}
                onClick={() => onTaskClick?.(task.item)}
                isSelected={selectedTaskId === task.item.id}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-zinc-400 dark:text-zinc-500">
            No tasks
          </div>
        )}
      </motion.div>
    </div>
  )
})

export default FlowDiagramStage
