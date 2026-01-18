'use client'

import { useState, memo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Target,
  Calendar,
  Users,
  Link2,
  User,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { AIReasoningPanel } from './ai-reasoning-panel'
import { ApprovalButtons } from './approval-buttons'
import type {
  ProposalItemAction,
  ProposalItemEntityType,
  ProposalItemApprovalStatus,
} from '@/lib/validation/schemas/proposal-api.schema'

export interface ProposalItem {
  id: string
  proposal_id: string
  action: ProposalItemAction
  entity_type: ProposalItemEntityType
  entity_id: string | null
  original_state: Record<string, unknown> | null
  proposed_state: Record<string, unknown>
  ai_reasoning?: string
  ai_confidence?: number
  ai_factors?: string[]
  ai_estimate?: {
    hours?: number
    points?: number
    complexity?: 'low' | 'medium' | 'high'
  }
  ai_assignment?: {
    user_id?: string
    user_name?: string
    reason?: string
  }
  approval_status: ProposalItemApprovalStatus
  reviewer_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  position: number
  created_at: string
  updated_at: string
}

interface ProposalItemRowProps {
  item: ProposalItem
  onApprove: (id: string, notes?: string) => void
  onReject: (id: string, notes?: string) => void
  onDiscuss: (id: string) => void
  isReviewer: boolean
  className?: string
}

// Action configuration
const actionConfig: Record<ProposalItemAction, {
  label: string
  icon: typeof Plus
  color: string
  bgColor: string
}> = {
  add: {
    label: 'Add',
    icon: Plus,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
  },
  modify: {
    label: 'Modify',
    icon: Pencil,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  remove: {
    label: 'Remove',
    icon: Trash2,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950',
  },
}

// Entity type configuration
const entityConfig: Record<ProposalItemEntityType, {
  label: string
  icon: typeof Target
  color: string
}> = {
  task: {
    label: 'Task',
    icon: Target,
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  },
  milestone: {
    label: 'Milestone',
    icon: Calendar,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  assignment: {
    label: 'Assignment',
    icon: Users,
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  },
  dependency: {
    label: 'Dependency',
    icon: Link2,
    color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  },
}

// Status indicator colors
const statusColors: Record<ProposalItemApprovalStatus, string> = {
  pending: 'bg-zinc-200 dark:bg-zinc-700',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  needs_discussion: 'bg-amber-500',
}

function ProposalItemRowComponent({
  item,
  onApprove,
  onReject,
  onDiscuss,
  isReviewer,
  className,
}: ProposalItemRowProps) {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false)
  const [animationState, setAnimationState] = useState<'idle' | 'approve' | 'reject' | 'discuss'>('idle')
  const [prevStatus, setPrevStatus] = useState(item.approval_status)

  const actionInfo = actionConfig[item.action]
  const entityInfo = entityConfig[item.entity_type]
  const ActionIcon = actionInfo.icon
  const EntityIcon = entityInfo.icon

  // Detect status changes for animations
  useEffect(() => {
    if (item.approval_status !== prevStatus) {
      if (item.approval_status === 'approved') {
        setAnimationState('approve')
      } else if (item.approval_status === 'rejected') {
        setAnimationState('reject')
      } else if (item.approval_status === 'needs_discussion') {
        setAnimationState('discuss')
      }

      // Reset animation state after it completes
      const timer = setTimeout(() => {
        setAnimationState('idle')
      }, 700)

      setPrevStatus(item.approval_status)
      return () => clearTimeout(timer)
    }
  }, [item.approval_status, prevStatus])

  // Extract display data from proposed_state
  const proposedTitle = item.proposed_state.title as string | undefined
  const proposedAssignee = item.ai_assignment?.user_name
  const proposedEstimate = item.ai_estimate

  const handleApprove = (notes?: string) => {
    onApprove(item.id, notes)
  }

  const handleReject = (notes?: string) => {
    onReject(item.id, notes)
  }

  const handleDiscuss = () => {
    onDiscuss(item.id)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: item.approval_status === 'rejected' ? 0.4 : 1,
        y: 0,
        x: animationState === 'approve' ? 4 : 0,
        backgroundColor:
          animationState === 'approve'
            ? 'rgba(16, 185, 129, 0.08)'
            : animationState === 'discuss'
              ? 'rgba(245, 158, 11, 0.08)'
              : 'transparent',
      }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        layout: { duration: 0.3 },
        opacity: { duration: 0.3 },
        x: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
        backgroundColor: { duration: 0.4 },
      }}
      className={cn(
        'group relative rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden transition-shadow hover:shadow-sm',
        className
      )}
    >
      {/* Status indicator bar */}
      <motion.div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300',
          statusColors[item.approval_status]
        )}
        animate={
          animationState === 'approve'
            ? { scaleY: [1, 1.1, 1] }
            : animationState === 'reject'
              ? { opacity: [1, 0.5, 1] }
              : {}
        }
        transition={{ duration: 0.4 }}
      />

      <div className="pl-4 pr-4 py-4">
        {/* Main content row */}
        <div className="flex items-start gap-4">
          {/* Action indicator */}
          <div
            className={cn(
              'flex items-center justify-center h-8 w-8 rounded-lg flex-shrink-0',
              actionInfo.bgColor
            )}
          >
            <ActionIcon className={cn('h-4 w-4', actionInfo.color)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Entity type badge and title */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-medium border',
                  entityInfo.color
                )}
              >
                <EntityIcon className="h-3 w-3 mr-1" />
                {entityInfo.label}
              </Badge>
              <span className="text-xs text-zinc-500 dark:text-zinc-500 uppercase font-medium">
                {actionInfo.label}
              </span>
            </div>

            {/* Proposed state preview */}
            <div className="space-y-1.5">
              {proposedTitle && (
                <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {proposedTitle}
                </h4>
              )}

              {/* Metadata row */}
              <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                {proposedAssignee && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {proposedAssignee}
                  </span>
                )}
                {proposedEstimate?.hours && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {proposedEstimate.hours}h
                  </span>
                )}
                {proposedEstimate?.complexity && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-medium',
                    proposedEstimate.complexity === 'low'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : proposedEstimate.complexity === 'medium'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                  )}>
                    {proposedEstimate.complexity}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Approval buttons */}
          <div className="flex-shrink-0">
            <ApprovalButtons
              onApprove={handleApprove}
              onReject={handleReject}
              onDiscuss={handleDiscuss}
              isReviewer={isReviewer}
              currentStatus={item.approval_status}
              size="sm"
            />
          </div>
        </div>

        {/* AI Reasoning Panel */}
        {item.ai_reasoning && (
          <div className="mt-4">
            <AIReasoningPanel
              reasoning={item.ai_reasoning}
              confidence={item.ai_confidence}
              factors={item.ai_factors}
              isExpanded={isReasoningExpanded}
              onToggle={() => setIsReasoningExpanded(!isReasoningExpanded)}
            />
          </div>
        )}
      </div>

      {/* Approval animation overlays */}
      <AnimatePresence>
        {animationState === 'approve' && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export const ProposalItemRow = memo(ProposalItemRowComponent)
