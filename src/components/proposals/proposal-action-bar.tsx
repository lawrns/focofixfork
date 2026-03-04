'use client'

import { Trash2, Send, GitMerge, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import type { ProposalStatus } from '@/types/proposals'

interface ProposalActionBarProps {
  proposalStatus: ProposalStatus
  onSubmit?: () => Promise<void>
  onDiscard?: () => Promise<void>
  onMerge?: () => Promise<void>
  isSubmitting?: boolean
  isMerging?: boolean
}

export function ProposalActionBar({
  proposalStatus,
  onSubmit,
  onDiscard,
  onMerge,
  isSubmitting,
  isMerging,
}: ProposalActionBarProps) {
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
