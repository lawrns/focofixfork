'use client'

import { memo, useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useMobile } from '@/lib/hooks/use-mobile'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { ProposalFlowDiagram } from './proposal-flow-diagram'
import { ProposalDetailSkeleton } from './proposal-detail-skeleton'
import { ProposalHeader } from './proposal-header'
import { ProposalImpactPanel } from './proposal-impact-panel'
import { ProposalTimelinePanel } from './proposal-timeline-panel'
import { ProposalChangesPanel } from './proposal-changes-panel'
import { ProposalDiscussionPanel } from './proposal-discussion-panel'
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog'
import { useKeyboardShortcuts } from './use-keyboard-shortcuts'
import type {
  ProposalDetails,
  ProposalApprovalStatus,
} from '@/types/proposals'
import { Layers, Calendar } from 'lucide-react'
import { toast } from 'sonner'

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

  const [proposal, setProposal] = useState<ProposalDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [timelineViewMode, setTimelineViewMode] = useState<'side-by-side' | 'unified'>('unified')
  const [visualizationMode, setVisualizationMode] = useState<'timeline' | 'flow'>('flow')
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  const fetchProposal = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/proposals/${proposalId}`, { credentials: 'include' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to load proposal: ${response.status}`)
      }
      const data = await response.json()
      if (data.success && data.data) {
        const proposalData = data.data
        setProposal({
          ...proposalData,
          items: proposalData.items || [],
          discussions: proposalData.discussions || [],
          impact: proposalData.impact || {
            total_items: proposalData.items?.length || 0,
            items_by_status: { pending: 0, approved: 0, rejected: 0 },
          },
          discussion_count: proposalData.discussions?.length || 0,
        })
      } else {
        throw new Error(data.error || 'Failed to load proposal')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal')
    } finally {
      setIsLoading(false)
    }
  }, [proposalId])

  useEffect(() => { fetchProposal() }, [fetchProposal])

  const handleSubmit = useCallback(async () => {
    if (!proposal) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/proposals/${proposalId}/submit`, { method: 'POST', credentials: 'include' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to submit proposal')
      }
      const data = await response.json()
      if (data.success) {
        setProposal({ ...proposal, status: 'pending_review', submitted_at: new Date().toISOString() })
        toast.success('Proposal submitted for review')
      } else {
        throw new Error(data.error || 'Failed to submit proposal')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit proposal')
    } finally {
      setIsSubmitting(false)
    }
  }, [proposal, proposalId])

  const handleDiscard = useCallback(async () => {
    try {
      const response = await fetch(`/api/proposals/${proposalId}`, { method: 'DELETE', credentials: 'include' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to discard proposal')
      }
      toast.success('Proposal discarded')
      onClose?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to discard proposal')
    }
  }, [onClose, proposalId])

  const handleMerge = useCallback(async () => {
    if (!proposal) return
    setIsMerging(true)
    try {
      const response = await fetch(`/api/proposals/${proposalId}/merge`, { method: 'POST', credentials: 'include' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to merge proposal')
      }
      const data = await response.json()
      if (data.success) {
        setProposal({ ...proposal, status: 'archived', merged_at: new Date().toISOString() })
        toast.success('Changes merged successfully')
        onMerge?.()
      } else {
        throw new Error(data.error || 'Failed to merge proposal')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to merge changes')
    } finally {
      setIsMerging(false)
    }
  }, [proposal, proposalId, onMerge])

  const handleApproveItem = useCallback(async (itemId: string) => {
    if (!proposal) return
    try {
      const response = await fetch(`/api/proposals/${proposalId}/items/${itemId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_status: 'approved' }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to approve item')
      }
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
            pending: Math.max(0, currentStatus.pending - 1),
            approved: currentStatus.approved + 1,
          },
        },
      })
      toast.success('Item approved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve item')
    }
  }, [proposal, proposalId])

  const handleRejectItem = useCallback(async (itemId: string) => {
    if (!proposal) return
    try {
      const response = await fetch(`/api/proposals/${proposalId}/items/${itemId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_status: 'rejected' }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to reject item')
      }
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
            pending: Math.max(0, currentStatus.pending - 1),
            rejected: currentStatus.rejected + 1,
          },
        },
      })
      toast.success('Item rejected')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject item')
    }
  }, [proposal, proposalId])

  const handleAddComment = useCallback(async (content: string) => {
    if (!proposal) return
    try {
      const response = await fetch(`/api/proposals/${proposalId}/discussions`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to add comment')
      }
      const data = await response.json()
      if (data.success && data.data) {
        setProposal({
          ...proposal,
          discussions: [...proposal.discussions, data.data],
          discussion_count: proposal.discussion_count + 1,
        })
        toast.success('Comment added')
      } else {
        throw new Error(data.error || 'Failed to add comment')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add comment')
    }
  }, [proposal, proposalId])

  const toggleItemExpanded = useCallback((itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) { next.delete(itemId) } else { next.add(itemId) }
      return next
    })
  }, [])

  const shortcuts = useMemo(() => ({
    escape: () => onClose?.(),
    '?': () => setShowKeyboardShortcuts((prev) => !prev),
    'a': () => {
      if (proposal) {
        proposal.items.filter((item) => item.status === 'pending').forEach((item) => handleApproveItem(item.id))
      }
    },
    'e': () => {
      if (proposal) {
        if (expandedItems.size === proposal.items.length) {
          setExpandedItems(new Set())
        } else {
          setExpandedItems(new Set(proposal.items.map((i) => i.id)))
        }
      }
    },
  }), [onClose, proposal, expandedItems, handleApproveItem])

  useKeyboardShortcuts(shortcuts)

  if (isLoading) {
    return <div className="max-w-6xl mx-auto p-4 md:p-6"><ProposalDetailSkeleton /></div>
  }

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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        <ProposalHeader
          proposal={proposal}
          onClose={onClose}
          onSubmit={handleSubmit}
          onDiscard={handleDiscard}
          onMerge={handleMerge}
          onShowKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
          isSubmitting={isSubmitting}
          isMerging={isMerging}
        />

        {/* Visualization Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-0.5">
            {(['flow', 'timeline'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setVisualizationMode(mode)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                  visualizationMode === mode
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                {mode === 'flow' ? <Layers className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
                {mode === 'flow' ? 'Flow View' : 'Timeline'}
              </button>
            ))}
          </div>
        </div>

        {/* Visualization Panel */}
        <AnimatePresence mode="wait">
          {visualizationMode === 'flow' ? (
            <motion.div key="flow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <Card>
                <CardContent className="p-6">
                  <ProposalFlowDiagram
                    proposalId={proposalId}
                    items={proposal.items}
                    onItemClick={(item) => toggleItemExpanded(item.id)}
                    onMerge={handleMerge}
                  />
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3')}>
                <div className="lg:col-span-1">
                  <ProposalImpactPanel summary={proposal.impact} />
                </div>
                <div className="lg:col-span-2">
                  <ProposalTimelinePanel
                    proposalId={proposalId}
                    items={proposal.items}
                    viewMode={timelineViewMode}
                    onViewModeChange={setTimelineViewMode}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ProposalChangesPanel
          items={proposal.items}
          expandedItems={expandedItems}
          onExpandAll={() => setExpandedItems(new Set(proposal.items.map((i) => i.id)))}
          onCollapseAll={() => setExpandedItems(new Set())}
          onToggleExpand={toggleItemExpanded}
          onApprove={handleApproveItem}
          onReject={handleRejectItem}
          onDiscuss={(itemId) => {
            document.querySelector<HTMLInputElement>('input[placeholder="Add a comment..."]')?.focus()
          }}
        />

        <ProposalDiscussionPanel
          proposalId={proposalId}
          discussions={proposal.discussions}
          onAddComment={handleAddComment}
        />

      </motion.div>

      <KeyboardShortcutsDialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts} />
    </div>
  )
}

export const ProposalDetailView = memo(ProposalDetailViewComponent)
