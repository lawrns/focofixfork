'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import type {
  ProposalItem,
  ProposalApprovalStatus,
  ProposalItemAction,
} from '@/types/proposals'

interface ProposalChangeRowProps {
  item: ProposalItem
  onApprove?: (itemId: string) => Promise<void>
  onReject?: (itemId: string) => Promise<void>
  onDiscuss?: (itemId: string) => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}

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

export function ProposalChangeRow({
  item,
  onApprove,
  onReject,
  onDiscuss,
  isExpanded,
  onToggleExpand,
}: ProposalChangeRowProps) {
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

  const action = item.action ?? item.item_type ?? 'modify'
  const itemStatus = item.status ?? 'pending'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-4 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{statusIcons[itemStatus]}</div>

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

          <p className="mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {item.title}
          </p>

          {(item.changes || item.proposed_data) && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 font-mono">
              {JSON.stringify(item.changes ?? item.proposed_data).slice(0, 100)}...
            </p>
          )}

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
