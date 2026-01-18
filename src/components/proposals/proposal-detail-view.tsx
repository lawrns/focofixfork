'use client'

import { memo, useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useMobile } from '@/lib/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ErrorState } from '@/components/ui/error-state'
import { ProposalStatusBadge } from './proposal-status-badge'
import type {
  Proposal,
  ProposalItem,
  ProposalDiscussion,
  ProposalImpactSummary,
  ProposalDetails,
  ProposalStatus,
  ProposalApprovalStatus,
  ProposalItemAction,
} from '@/types/proposals'
import {
  X,
  GitMerge,
  Trash2,
  Send,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  LayoutGrid,
  List,
  Calendar,
  Keyboard,
} from 'lucide-react'
import { toast } from 'sonner'

// =============================================================================
// Sub-component Interfaces (to be imported from their respective files)
// =============================================================================

interface ImpactDashboardProps {
  summary: ProposalImpactSummary
  isLoading?: boolean
}

interface TimelineComparisonProps {
  proposalId: string
  items: ProposalItem[]
  viewMode?: 'side-by-side' | 'unified'
  onViewModeChange?: (mode: 'side-by-side' | 'unified') => void
}

interface ProposalItemRowProps {
  item: ProposalItem
  onApprove?: (itemId: string) => Promise<void>
  onReject?: (itemId: string) => Promise<void>
  onDiscuss?: (itemId: string) => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}

interface DiscussionThreadProps {
  proposalId: string
  discussions: ProposalDiscussion[]
  onAddComment?: (content: string) => Promise<void>
}

interface ApprovalButtonsProps {
  proposalStatus: ProposalStatus
  onSubmit?: () => Promise<void>
  onDiscard?: () => Promise<void>
  onMerge?: () => Promise<void>
  isSubmitting?: boolean
  isMerging?: boolean
}

// =============================================================================
// Placeholder Sub-components (to be replaced with actual imports)
// =============================================================================

function ImpactDashboard({ summary, isLoading }: ImpactDashboardProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500">
          Impact Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Changes by Type */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Changes
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {summary.items_by_type?.add ?? summary.by_action?.add ?? 0}
              </p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                Add
              </p>
            </div>
            <div className="text-center p-2 rounded-md bg-amber-50 dark:bg-amber-950/30">
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {summary.items_by_type?.modify ?? summary.by_action?.modify ?? 0}
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                Modify
              </p>
            </div>
            <div className="text-center p-2 rounded-md bg-red-50 dark:bg-red-950/30">
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                {summary.items_by_type?.remove ?? summary.by_action?.remove ?? 0}
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">
                Remove
              </p>
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Review Status
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="flex h-full">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${((summary.items_by_status?.approved ?? 0) / summary.total_items) * 100}%`,
                  }}
                />
                <div
                  className="bg-red-500 transition-all duration-300"
                  style={{
                    width: `${((summary.items_by_status?.rejected ?? 0) / summary.total_items) * 100}%`,
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-zinc-500 whitespace-nowrap">
              {summary.items_by_status?.approved ?? 0}/{summary.total_items}
            </span>
          </div>
        </div>

        {/* Entities Affected */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Affected Entities
          </p>
          <div className="flex flex-wrap gap-2">
            {(summary.entities_affected?.tasks ?? summary.by_entity?.task ?? 0) > 0 && (
              <Badge variant="outline" className="text-xs">
                {summary.entities_affected?.tasks ?? summary.by_entity?.task ?? 0} Tasks
              </Badge>
            )}
            {(summary.entities_affected?.milestones ?? summary.by_entity?.milestone ?? 0) > 0 && (
              <Badge variant="outline" className="text-xs">
                {summary.entities_affected?.milestones ?? summary.by_entity?.milestone ?? 0} Milestones
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TimelineComparison({
  proposalId,
  items,
  viewMode = 'unified',
  onViewModeChange,
}: TimelineComparisonProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-zinc-500">
          Timeline Comparison
        </CardTitle>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'unified' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  onClick={() => onViewModeChange?.('unified')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Unified view</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'side-by-side' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  onClick={() => onViewModeChange?.('side-by-side')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Side-by-side view</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-32 text-zinc-400 text-sm">
          <Calendar className="h-5 w-5 mr-2" />
          Timeline visualization
        </div>
      </CardContent>
    </Card>
  )
}

function ProposalItemRow({
  item,
  onApprove,
  onReject,
  onDiscuss,
  isExpanded,
  onToggleExpand,
}: ProposalItemRowProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await onApprove?.(item.id)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await onReject?.(item.id)
    } finally {
      setIsRejecting(false)
    }
  }

  // Action type colors (using new action field, with fallback to legacy item_type)
  const actionColors: Record<ProposalItemAction, string> = {
    add: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    modify: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    remove: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  }

  const statusIcons: Record<ProposalApprovalStatus, React.ReactNode> = {
    pending: <Clock className="h-4 w-4 text-zinc-400" />,
    approved: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    rejected: <XCircle className="h-4 w-4 text-red-500" />,
    needs_discussion: <MessageSquare className="h-4 w-4 text-amber-500" />,
  }

  // Get action from new field or fallback to legacy item_type
  const action = item.action ?? item.item_type ?? 'modify'
  const itemStatus = item.status ?? 'pending'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-4 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className="mt-0.5">{statusIcons[itemStatus]}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn('text-xs', actionColors[action])}>
              {action}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {item.entity_type}
            </Badge>
            {item.entity_id && (
              <span className="text-xs text-zinc-400 font-mono truncate">
                {item.entity_id.slice(0, 8)}...
              </span>
            )}
          </div>

          {/* Item title */}
          <p className="mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {item.title}
          </p>

          {/* Changes preview */}
          {(item.changes || item.proposed_data) && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 font-mono">
              {JSON.stringify(item.changes ?? item.proposed_data).slice(0, 100)}...
            </p>
          )}

          {/* Expandable AI reasoning */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-3 rounded-md bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900">
                  <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 mb-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-medium">AI Reasoning</span>
                  </div>
                  <p className="text-xs text-violet-600 dark:text-violet-400">
                    This change was suggested based on project timeline optimization
                    and resource allocation patterns.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {itemStatus === 'pending' && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleApprove}
                      loading={isApproving}
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Approve change</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleReject}
                      loading={isRejecting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reject change</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDiscuss?.(item.id)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add comment</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function DiscussionThread({
  proposalId,
  discussions,
  onAddComment,
}: DiscussionThreadProps) {
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!comment.trim()) return
    setIsSubmitting(true)
    try {
      await onAddComment?.(comment.trim())
      setComment('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Discussion ({discussions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {discussions.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">
            No comments yet. Start the discussion.
          </p>
        ) : (
          <div className="space-y-3">
            {discussions.map((discussion) => (
              <div
                key={discussion.id}
                className="flex gap-3 p-3 rounded-md bg-zinc-50 dark:bg-zinc-800/50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {discussion.user_id.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">User</span>
                    <span className="text-xs text-zinc-400">
                      {new Date(discussion.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {discussion.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comment input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 text-sm border rounded-md bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!comment.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ApprovalButtons({
  proposalStatus,
  onSubmit,
  onDiscard,
  onMerge,
  isSubmitting,
  isMerging,
}: ApprovalButtonsProps) {
  const canSubmit = proposalStatus === 'draft'
  const canMerge = proposalStatus === 'approved'
  const canDiscard = proposalStatus === 'draft' || proposalStatus === 'pending_review'

  return (
    <div className="flex items-center gap-2">
      {canDiscard && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Discard
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Discard Proposal?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this proposal and all its changes.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDiscard}
                className="bg-red-600 hover:bg-red-700"
              >
                Discard Proposal
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {canSubmit && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onSubmit}
          loading={isSubmitting}
        >
          <Send className="h-4 w-4 mr-2" />
          Submit for Review
        </Button>
      )}

      {canMerge && (
        <Button
          variant="default"
          size="sm"
          onClick={onMerge}
          loading={isMerging}
        >
          <GitMerge className="h-4 w-4 mr-2" />
          Merge Changes
        </Button>
      )}
    </div>
  )
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function ProposalDetailSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Dashboard and Timeline skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <Skeleton className="h-5 w-40 mb-4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Items skeleton */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-5 w-36 mb-4" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>

      {/* Discussion skeleton */}
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-5 w-28 mb-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Keyboard Shortcuts Hook
// =============================================================================

function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const key = [
        event.metaKey && 'meta',
        event.ctrlKey && 'ctrl',
        event.shiftKey && 'shift',
        event.altKey && 'alt',
        event.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join('+')

      if (shortcuts[key]) {
        event.preventDefault()
        shortcuts[key]()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

// =============================================================================
// Main Component
// =============================================================================

interface ProposalDetailViewProps {
  proposalId: string
  onClose?: () => void
  onMerge?: () => void
}

function ProposalDetailViewComponent({
  proposalId,
  onClose,
  onMerge,
}: ProposalDetailViewProps) {
  const isMobile = useMobile()

  // State
  const [proposal, setProposal] = useState<ProposalDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [timelineViewMode, setTimelineViewMode] = useState<'side-by-side' | 'unified'>('unified')
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  // Fetch proposal data
  const fetchProposal = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/proposals/${proposalId}`)
      // const data = await response.json()

      // Mock data for development
      const mockProposal: ProposalDetails = {
        id: proposalId,
        workspace_id: 'workspace-1',
        project_id: 'project-1',
        title: 'Q1 Sprint Planning Adjustments',
        description: 'AI-suggested optimizations for the upcoming sprint based on team velocity and resource availability.',
        status: 'pending_review',
        source_type: 'text',
        owner_id: 'user-1',
        submitted_at: new Date().toISOString(),
        approved_by: null,
        approved_at: null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        applied_by: null,
        applied_at: null,
        merged_at: null,
        metadata: {},
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        items: [
          {
            id: 'item-1',
            proposal_id: proposalId,
            action: 'modify',
            entity_type: 'task',
            entity_id: 'task-123',
            title: 'Update task priority and due date',
            description: 'Adjust timeline based on team velocity',
            changes: { due_date: '2024-02-15', priority: 'high' },
            previous_values: { due_date: '2024-02-10', priority: 'medium' },
            status: 'pending',
            review_notes: null,
            reviewed_by: null,
            reviewed_at: null,
            sequence: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'item-2',
            proposal_id: proposalId,
            action: 'add',
            entity_type: 'task',
            entity_id: null,
            title: 'Add buffer task for sprint planning',
            description: 'New task to account for unexpected work',
            changes: { title: 'New task for buffer', estimate: '2d' },
            previous_values: null,
            status: 'approved',
            review_notes: 'Good addition',
            reviewed_by: 'user-2',
            reviewed_at: new Date().toISOString(),
            sequence: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'item-3',
            proposal_id: proposalId,
            action: 'remove',
            entity_type: 'task',
            entity_id: 'task-456',
            title: 'Remove obsolete task',
            description: 'This task is no longer relevant',
            changes: {},
            previous_values: { title: 'Obsolete task' },
            status: 'pending',
            review_notes: null,
            reviewed_by: null,
            reviewed_at: null,
            sequence: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        discussions: [
          {
            id: 'disc-1',
            proposal_id: proposalId,
            proposal_item_id: null,
            user_id: 'user-2',
            content: 'These changes look good overall. I have a few questions about the priority adjustments.',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            updated_at: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
        impact: {
          total_items: 3,
          items_by_type: { add: 1, modify: 1, remove: 1 },
          items_by_status: { pending: 2, approved: 1, rejected: 0 },
          entities_affected: { tasks: 3, projects: 0, milestones: 0 },
        },
        discussion_count: 1,
      }

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      setProposal(mockProposal)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal')
    } finally {
      setIsLoading(false)
    }
  }, [proposalId])

  useEffect(() => {
    fetchProposal()
  }, [fetchProposal])

  // Action handlers
  const handleSubmit = useCallback(async () => {
    if (!proposal) return
    setIsSubmitting(true)
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setProposal({ ...proposal, status: 'pending_review' })
      toast.success('Proposal submitted for review')
    } catch (err) {
      toast.error('Failed to submit proposal')
    } finally {
      setIsSubmitting(false)
    }
  }, [proposal])

  const handleDiscard = useCallback(async () => {
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500))
      toast.success('Proposal discarded')
      onClose?.()
    } catch (err) {
      toast.error('Failed to discard proposal')
    }
  }, [onClose])

  const handleMerge = useCallback(async () => {
    if (!proposal) return
    setIsMerging(true)
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setProposal({ ...proposal, status: 'archived' }) // Status becomes 'archived' after merge
      toast.success('Changes merged successfully')
      onMerge?.()
    } catch (err) {
      toast.error('Failed to merge changes')
    } finally {
      setIsMerging(false)
    }
  }, [proposal, onMerge])

  const handleApproveItem = useCallback(async (itemId: string) => {
    if (!proposal) return
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 300))
      const currentStatus = proposal.impact.items_by_status ?? { pending: 0, approved: 0, rejected: 0 }
      setProposal({
        ...proposal,
        items: proposal.items.map((item) =>
          item.id === itemId ? { ...item, status: 'approved' as ProposalApprovalStatus } : item
        ),
        impact: {
          ...proposal.impact,
          items_by_status: {
            ...currentStatus,
            pending: currentStatus.pending - 1,
            approved: currentStatus.approved + 1,
          },
        },
      })
      toast.success('Item approved')
    } catch (err) {
      toast.error('Failed to approve item')
    }
  }, [proposal])

  const handleRejectItem = useCallback(async (itemId: string) => {
    if (!proposal) return
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 300))
      const currentStatus = proposal.impact.items_by_status ?? { pending: 0, approved: 0, rejected: 0 }
      setProposal({
        ...proposal,
        items: proposal.items.map((item) =>
          item.id === itemId ? { ...item, status: 'rejected' as ProposalApprovalStatus } : item
        ),
        impact: {
          ...proposal.impact,
          items_by_status: {
            ...currentStatus,
            pending: currentStatus.pending - 1,
            rejected: currentStatus.rejected + 1,
          },
        },
      })
      toast.success('Item rejected')
    } catch (err) {
      toast.error('Failed to reject item')
    }
  }, [proposal])

  const handleAddComment = useCallback(async (content: string) => {
    if (!proposal) return
    try {
      // TODO: Replace with actual API call
      const newDiscussion: ProposalDiscussion = {
        id: `disc-${Date.now()}`,
        proposal_id: proposalId,
        proposal_item_id: null,
        user_id: 'current-user',
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setProposal({
        ...proposal,
        discussions: [...proposal.discussions, newDiscussion],
      })
      toast.success('Comment added')
    } catch (err) {
      toast.error('Failed to add comment')
    }
  }, [proposal, proposalId])

  const toggleItemExpanded = useCallback((itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  // Keyboard shortcuts
  const shortcuts = useMemo(
    () => ({
      escape: () => onClose?.(),
      '?': () => setShowKeyboardShortcuts((prev) => !prev),
      'a': () => {
        // Approve all pending items
        if (proposal) {
          proposal.items
            .filter((item) => item.status === 'pending')
            .forEach((item) => handleApproveItem(item.id))
        }
      },
      'e': () => {
        // Expand/collapse all items
        if (proposal) {
          if (expandedItems.size === proposal.items.length) {
            setExpandedItems(new Set())
          } else {
            setExpandedItems(new Set(proposal.items.map((i) => i.id)))
          }
        }
      },
    }),
    [onClose, proposal, expandedItems, handleApproveItem]
  )

  useKeyboardShortcuts(shortcuts)

  // Render loading state
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <ProposalDetailSkeleton />
      </div>
    )
  }

  // Render error state
  if (error || !proposal) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <ErrorState
          title="Failed to load proposal"
          message={error || 'The proposal could not be found.'}
          onRetry={fetchProposal}
          variant={error ? 'error' : 'not-found'}
        />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  className="mr-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {proposal.title}
              </h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <ProposalStatusBadge status={proposal.status} />
              <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                <User className="h-4 w-4" />
                <span>Created by {proposal.owner_id}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                <Clock className="h-4 w-4" />
                <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            {proposal.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
                {proposal.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowKeyboardShortcuts(true)}
                    className="hidden md:flex"
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <ApprovalButtons
              proposalStatus={proposal.status}
              onSubmit={handleSubmit}
              onDiscard={handleDiscard}
              onMerge={handleMerge}
              isSubmitting={isSubmitting}
              isMerging={isMerging}
            />

            {onClose && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="hidden sm:flex"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Impact Dashboard and Timeline Comparison */}
        <div
          className={cn(
            'grid gap-4',
            isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'
          )}
        >
          <div className="lg:col-span-1">
            <ImpactDashboard summary={proposal.impact} />
          </div>
          <div className="lg:col-span-2">
            <TimelineComparison
              proposalId={proposalId}
              items={proposal.items}
              viewMode={timelineViewMode}
              onViewModeChange={setTimelineViewMode}
            />
          </div>
        </div>

        {/* Proposed Changes */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-zinc-500">
                Proposed Changes ({proposal.items.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (expandedItems.size === proposal.items.length) {
                    setExpandedItems(new Set())
                  } else {
                    setExpandedItems(new Set(proposal.items.map((i) => i.id)))
                  }
                }}
              >
                {expandedItems.size === proposal.items.length ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Collapse all
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Expand all
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3 pr-4">
                {proposal.items
                  .sort((a, b) => (a.sequence ?? a.position ?? 0) - (b.sequence ?? b.position ?? 0))
                  .map((item) => (
                    <ProposalItemRow
                      key={item.id}
                      item={item}
                      onApprove={handleApproveItem}
                      onReject={handleRejectItem}
                      onDiscuss={(itemId) => {
                        // Focus discussion input
                        document
                          .querySelector<HTMLInputElement>(
                            'input[placeholder="Add a comment..."]'
                          )
                          ?.focus()
                      }}
                      isExpanded={expandedItems.has(item.id)}
                      onToggleExpand={() => toggleItemExpanded(item.id)}
                    />
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Discussion Thread */}
        <DiscussionThread
          proposalId={proposalId}
          discussions={proposal.discussions}
          onAddComment={handleAddComment}
        />
      </motion.div>

      {/* Keyboard Shortcuts Modal */}
      <AlertDialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">
                      Esc
                    </kbd>
                    <span>Close view</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">
                      ?
                    </kbd>
                    <span>Show shortcuts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">
                      A
                    </kbd>
                    <span>Approve all pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">
                      E
                    </kbd>
                    <span>Expand/collapse all</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export const ProposalDetailView = memo(ProposalDetailViewComponent)
