'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, RotateCcw, CheckCircle2, Layers, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FlowDiagramStage, type TaskStatus, type TaskWithAction } from './flow-diagram-stage'
import { FlowDiagramScrubber } from './flow-diagram-scrubber'
import {
  type AnimationPhase,
  timing,
  phaseTimings,
  buttonVariants,
  springs,
  prefersReducedMotion,
} from './flow-diagram-animations'
import type { ProposalItem, ProposalItemAction } from '@/types/proposals'

// ============================================================================
// TYPES
// ============================================================================

export interface ProposalFlowDiagramProps {
  proposalId: string
  items: ProposalItem[]
  existingTasks?: Array<{
    id: string
    title: string
    status: TaskStatus
    description?: string
  }>
  onItemClick?: (item: ProposalItem) => void
  onItemRevert?: (item: ProposalItem) => void
  onMerge?: () => void
  className?: string
}

type ViewMode = 'before' | 'after' | 'animating'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map proposal item status to our stage status
 */
function mapToStageStatus(status: string | undefined): TaskStatus {
  const statusLower = (status || 'backlog').toLowerCase()

  if (statusLower.includes('progress') || statusLower === 'in_progress') {
    return 'in_progress'
  }
  if (statusLower.includes('review') || statusLower === 'in_review') {
    return 'review'
  }
  if (statusLower.includes('done') || statusLower === 'completed' || statusLower === 'complete') {
    return 'done'
  }
  return 'backlog'
}

/**
 * Get the target status from proposal item changes
 */
function getTargetStatus(item: ProposalItem): TaskStatus {
  const changes = item.changes || item.proposed_data
  if (changes && typeof changes === 'object' && 'status' in changes) {
    return mapToStageStatus(String(changes.status))
  }
  return 'backlog'
}

/**
 * Get phase from progress value
 */
function getPhaseFromProgress(progress: number): AnimationPhase {
  const ms = progress * timing.total

  for (const [phase, { start, end }] of Object.entries(phaseTimings)) {
    if (ms >= start && ms < end) {
      return phase as AnimationPhase
    }
  }

  return progress >= 1 ? 'complete' : 'idle'
}

// ============================================================================
// LEGEND COMPONENT
// ============================================================================

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" />
        <span>Existing</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30" />
        <span>+Add</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/30" />
        <span>~Modify</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded border-2 border-red-500 bg-red-50 dark:bg-red-900/30" />
        <span>-Remove</span>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ProposalFlowDiagram = memo(function ProposalFlowDiagram({
  proposalId,
  items,
  existingTasks = [],
  onItemClick,
  onItemRevert,
  onMerge,
  className,
}: ProposalFlowDiagramProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('before')
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle')
  const [scrubberProgress, setScrubberProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  // Refs
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  // Group tasks by stage
  const tasksByStage = useMemo(() => {
    const stages: Record<TaskStatus, TaskWithAction[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    }

    // Add existing tasks
    for (const task of existingTasks) {
      // Check if this task is being modified or removed by the proposal
      const proposalItem = items.find(
        (item) => item.entity_id === task.id && (item.action === 'modify' || item.action === 'remove')
      )

      if (proposalItem) {
        const action = proposalItem.action as ProposalItemAction
        const targetStatus = action === 'modify' ? getTargetStatus(proposalItem) : task.status

        stages[task.status].push({
          item: {
            ...proposalItem,
            title: task.title,
            description: task.description,
          },
          action,
          sourceStatus: task.status,
          targetStatus,
        })
      } else {
        // Existing task not affected by proposal
        stages[task.status].push({
          item: {
            id: task.id,
            proposal_id: proposalId,
            title: task.title,
            description: task.description,
            action: 'add', // Placeholder, won't be used
            entity_type: 'task',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          action: 'existing',
        })
      }
    }

    // Add new tasks from proposal
    for (const item of items) {
      if (item.action === 'add') {
        const targetStatus = getTargetStatus(item)
        stages[targetStatus].push({
          item,
          action: 'add',
          targetStatus,
        })
      }
    }

    return stages
  }, [items, existingTasks, proposalId])

  // Get tasks for "after" view (post-merge state)
  const afterViewTasksByStage = useMemo(() => {
    const stages: Record<TaskStatus, TaskWithAction[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    }

    // Copy existing tasks, applying modifications
    for (const status of Object.keys(stages) as TaskStatus[]) {
      for (const task of tasksByStage[status]) {
        // Skip removed tasks
        if (task.action === 'remove') continue

        // For modified tasks, use target status
        if (task.action === 'modify' && task.targetStatus) {
          stages[task.targetStatus].push({
            ...task,
            action: 'existing', // After merge, it's just existing
          })
        } else {
          // For existing and added tasks, keep in current position
          stages[status].push({
            ...task,
            action: 'existing',
          })
        }
      }
    }

    return stages
  }, [tasksByStage])

  // Current display based on view mode / animation progress
  const displayTasksByStage = useMemo(() => {
    if (viewMode === 'after' || scrubberProgress >= 1) {
      return afterViewTasksByStage
    }
    return tasksByStage
  }, [viewMode, scrubberProgress, tasksByStage, afterViewTasksByStage])

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return

    const startTime = performance.now()
    const startProgress = scrubberProgress

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const duration = timing.total * (1 - startProgress) // Remaining duration

      const newProgress = startProgress + (elapsed / timing.total)

      if (newProgress >= 1) {
        setScrubberProgress(1)
        setAnimationPhase('complete')
        setIsPlaying(false)
        setViewMode('after')
        return
      }

      setScrubberProgress(newProgress)
      setAnimationPhase(getPhaseFromProgress(newProgress))

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    // Check for reduced motion
    if (prefersReducedMotion()) {
      setScrubberProgress(1)
      setAnimationPhase('complete')
      setIsPlaying(false)
      setViewMode('after')
      return
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, scrubberProgress])

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false)
    } else {
      if (scrubberProgress >= 1) {
        // Reset if at end
        setScrubberProgress(0)
        setAnimationPhase('idle')
        setViewMode('before')
      }
      setIsPlaying(true)
      setViewMode('animating')
    }
  }, [isPlaying, scrubberProgress])

  // Handle reset
  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setScrubberProgress(0)
    setAnimationPhase('idle')
    setViewMode('before')
  }, [])

  // Handle scrubber change
  const handleScrubberChange = useCallback((progress: number) => {
    setIsPlaying(false)
    setScrubberProgress(progress)
    setAnimationPhase(getPhaseFromProgress(progress))
    setViewMode(progress >= 1 ? 'after' : progress > 0 ? 'animating' : 'before')
  }, [])

  // Handle item click
  const handleItemClick = useCallback(
    (item: ProposalItem) => {
      setSelectedItemId((prev) => (prev === item.id ? null : item.id))
      onItemClick?.(item)
    },
    [onItemClick]
  )

  // Handle preview merge button
  const handlePreviewMerge = useCallback(() => {
    handleReset()
    setTimeout(() => {
      setIsPlaying(true)
      setViewMode('animating')
    }, 50)
  }, [handleReset])

  // Summary stats
  const stats = useMemo(() => {
    const addCount = items.filter((i) => i.action === 'add').length
    const modifyCount = items.filter((i) => i.action === 'modify').length
    const removeCount = items.filter((i) => i.action === 'remove').length
    return { addCount, modifyCount, removeCount, total: items.length }
  }, [items])

  const stages: Array<{ status: TaskStatus; label: string }> = [
    { status: 'backlog', label: 'Backlog' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'review', label: 'Review' },
    { status: 'done', label: 'Done' },
  ]

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-0.5">
            <button
              onClick={() => {
                handleReset()
                setViewMode('before')
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === 'before'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              )}
            >
              Before
            </button>
            <button
              onClick={handlePreviewMerge}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'animating'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              )}
            >
              <Layers className="h-3 w-3" />
              Flow
            </button>
            <button
              onClick={() => {
                setScrubberProgress(1)
                setAnimationPhase('complete')
                setViewMode('after')
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === 'after'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              )}
            >
              After
            </button>
          </div>

          {/* Stats summary */}
          <div className="flex items-center gap-2 ml-4 text-xs">
            {stats.addCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                +{stats.addCount} new
              </span>
            )}
            {stats.modifyCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                ~{stats.modifyCount} modified
              </span>
            )}
            {stats.removeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium">
                -{stats.removeCount} removed
              </span>
            )}
          </div>
        </div>

        {/* Preview Merge button */}
        <motion.div
          variants={buttonVariants}
          animate={isPlaying ? 'loading' : scrubberProgress >= 1 ? 'success' : 'idle'}
        >
          <Button
            onClick={handlePreviewMerge}
            disabled={isPlaying}
            className={cn(
              'gap-2',
              scrubberProgress >= 1 && 'bg-emerald-600 hover:bg-emerald-700'
            )}
          >
            {scrubberProgress >= 1 ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Preview Complete
              </>
            ) : isPlaying ? (
              <>
                <motion.div
                  className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
                Merging...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Preview Merge
              </>
            )}
          </Button>
        </motion.div>
      </div>

      {/* Flow diagram stages */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.map(({ status, label }) => (
            <FlowDiagramStage
              key={status}
              status={status}
              label={label}
              tasks={displayTasksByStage[status]}
              animationPhase={animationPhase}
              onTaskClick={handleItemClick}
              onTaskRevert={onItemRevert}
              selectedTaskId={selectedItemId}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <Legend />

      {/* Scrubber */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <FlowDiagramScrubber
          progress={scrubberProgress}
          onChange={handleScrubberChange}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onReset={handleReset}
        />
      </div>

      {/* Apply changes button (when preview complete) */}
      <AnimatePresence>
        {scrubberProgress >= 1 && onMerge && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={springs.snappy}
            className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800"
          >
            <Button onClick={onMerge} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Apply Changes
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

export default ProposalFlowDiagram
