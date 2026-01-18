'use client'

import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Minus, RefreshCw, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  springs,
  taskCardVariants,
  glowVariants,
  actionColors,
  type ActionType,
} from './flow-diagram-animations'
import type { ProposalItem, ProposalItemAction } from '@/types/proposals'

// ============================================================================
// TYPES
// ============================================================================

export interface FlowDiagramTaskCardProps {
  item: ProposalItem
  action: ProposalItemAction | 'existing'
  isAnimating?: boolean
  animationPhase?: 'idle' | 'preparing' | 'removing' | 'moving' | 'adding' | 'settling' | 'complete'
  onClick?: () => void
  onRevert?: () => void
  isSelected?: boolean
  className?: string
}

// ============================================================================
// ACTION ICON COMPONENT
// ============================================================================

function ActionIcon({ action }: { action: ProposalItemAction | 'existing' }) {
  if (action === 'existing') return null

  const iconClasses = 'h-3 w-3'

  switch (action) {
    case 'add':
      return <Plus className={cn(iconClasses, 'text-emerald-600 dark:text-emerald-400')} />
    case 'modify':
      return <RefreshCw className={cn(iconClasses, 'text-amber-600 dark:text-amber-400')} />
    case 'remove':
      return <Minus className={cn(iconClasses, 'text-red-600 dark:text-red-400')} />
    default:
      return null
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FlowDiagramTaskCard = memo(function FlowDiagramTaskCard({
  item,
  action,
  isAnimating = false,
  animationPhase = 'idle',
  onClick,
  onRevert,
  isSelected = false,
  className,
}: FlowDiagramTaskCardProps) {
  // Map action to color key
  const colorKey: ActionType = action === 'existing' ? 'existing' : action
  const colors = actionColors[colorKey]

  // Get the display title
  const title = useMemo(() => {
    if (item.title) return item.title
    const proposedState = item.changes || item.proposed_data
    if (proposedState && typeof proposedState === 'object' && 'title' in proposedState) {
      return String(proposedState.title)
    }
    return 'Untitled Task'
  }, [item])

  // Determine current animation variant
  const currentVariant = useMemo(() => {
    if (!isAnimating) return 'initial'

    switch (animationPhase) {
      case 'preparing':
        return 'preparing'
      case 'removing':
        return action === 'remove' ? 'removing' : 'preparing'
      case 'adding':
        return action === 'add' ? 'adding' : 'settled'
      case 'settling':
      case 'complete':
        return 'settled'
      default:
        return 'initial'
    }
  }, [isAnimating, animationPhase, action])

  // Determine glow animation key (only for proposal actions, not 'existing')
  const glowAction = useMemo((): 'add' | 'modify' | 'remove' | null => {
    if (!isAnimating) return null
    if (animationPhase === 'adding' && action === 'add') return 'add'
    if (animationPhase === 'moving' && action === 'modify') return 'modify'
    if (animationPhase === 'removing' && action === 'remove') return 'remove'
    return null
  }, [isAnimating, animationPhase, action])

  const isProposalAction = action !== 'existing'

  return (
    <motion.div
      layout
      variants={taskCardVariants}
      initial="initial"
      animate={currentVariant}
      whileHover={!isAnimating ? 'hover' : undefined}
      onClick={onClick}
      className={cn(
        'group relative rounded-lg border-2 p-3 cursor-pointer select-none',
        'bg-white dark:bg-zinc-900',
        'transition-colors duration-150',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-950',
        className
      )}
      style={{
        borderColor: colors.border,
        backgroundColor: isProposalAction
          ? `var(--action-bg, ${colors.bg})`
          : undefined,
      }}
    >
      {/* Glow effect overlay */}
      {glowAction && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          variants={glowVariants}
          animate={glowAction}
        />
      )}

      {/* Content */}
      <div className="flex items-start gap-2">
        {/* Drag handle (visual only for now) */}
        <div className="mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity">
          <GripVertical className="h-4 w-4 text-zinc-400" />
        </div>

        {/* Action indicator */}
        {action !== 'existing' && (
          <div
            className={cn(
              'flex-shrink-0 mt-0.5 flex items-center justify-center',
              'w-5 h-5 rounded-full',
              action === 'add' && 'bg-emerald-100 dark:bg-emerald-900/50',
              action === 'modify' && 'bg-amber-100 dark:bg-amber-900/50',
              action === 'remove' && 'bg-red-100 dark:bg-red-900/50'
            )}
          >
            <ActionIcon action={action} />
          </div>
        )}

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              'text-sm font-medium truncate',
              action === 'remove' && 'line-through text-zinc-400 dark:text-zinc-500',
              action !== 'remove' && 'text-zinc-900 dark:text-zinc-100'
            )}
          >
            {title}
          </h4>

          {/* Description preview */}
          {item.description && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
              {item.description}
            </p>
          )}

          {/* AI estimate badge */}
          {item.ai_estimate?.hours && (
            <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              ~{item.ai_estimate.hours}h
            </div>
          )}
        </div>
      </div>

      {/* Hover actions */}
      {onRevert && action !== 'existing' && !isAnimating && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'absolute -top-2 -right-2 p-1 rounded-full',
            'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
            'shadow-sm opacity-0 group-hover:opacity-100 transition-opacity',
            'hover:bg-red-50 dark:hover:bg-red-950/30',
            'hover:border-red-300 dark:hover:border-red-700'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onRevert()
          }}
          transition={springs.micro}
        >
          <Minus className="h-3 w-3 text-red-500" />
        </motion.button>
      )}
    </motion.div>
  )
})

export default FlowDiagramTaskCard
