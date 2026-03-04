'use client'

import { X, User, Clock, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ProposalStatusBadge } from './proposal-status-badge'
import { ProposalActionBar } from './proposal-action-bar'
import type { ProposalDetails } from '@/types/proposals'

interface ProposalHeaderProps {
  proposal: ProposalDetails
  onClose?: () => void
  onSubmit: () => Promise<void>
  onDiscard: () => Promise<void>
  onMerge: () => Promise<void>
  onShowKeyboardShortcuts: () => void
  isSubmitting: boolean
  isMerging: boolean
}

export function ProposalHeader({
  proposal,
  onClose,
  onSubmit,
  onDiscard,
  onMerge,
  onShowKeyboardShortcuts,
  isSubmitting,
  isMerging,
}: ProposalHeaderProps) {
  return (
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
              <X className="h-4 w-4" />
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
                onClick={onShowKeyboardShortcuts}
                className="hidden md:flex"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <ProposalActionBar
          proposalStatus={proposal.status}
          onSubmit={onSubmit}
          onDiscard={onDiscard}
          onMerge={onMerge}
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
  )
}
