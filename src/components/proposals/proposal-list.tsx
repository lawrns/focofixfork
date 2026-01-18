'use client'

import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProposalCard } from './proposal-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/loading/skeleton'
import { cn } from '@/lib/utils'
import type { Proposal } from '@/types/proposals'
import { FileText, Inbox, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProposalListProps {
  proposals: Proposal[]
  projectId: string
  onSelectProposal: (id: string) => void
  isLoading?: boolean
  className?: string
  emptyStateAction?: () => void
}

// Staggered animation variants for list items
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
}

// Loading skeleton for proposal cards
function ProposalCardSkeleton() {
  return (
    <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Icon skeleton */}
        <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />

        {/* Content skeleton */}
        <div className="flex-1 space-y-3">
          {/* Title and status */}
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ProposalListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <ProposalCardSkeleton />
        </motion.div>
      ))}
    </div>
  )
}

function ProposalEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <EmptyState
        icon={<Inbox className="h-full w-full" />}
        title="No proposals yet"
        description="Create your first proposal to suggest changes to this project. You can add tasks, update milestones, or make other improvements."
        size="md"
        action={
          onAction && (
            <Button onClick={onAction} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Proposal
            </Button>
          )
        }
      />
    </motion.div>
  )
}

function ProposalListComponent({
  proposals,
  projectId,
  onSelectProposal,
  isLoading = false,
  className,
  emptyStateAction,
}: ProposalListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSelect = (id: string) => {
    setSelectedId(id)
    onSelectProposal(id)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <ProposalListSkeleton count={3} />
      </div>
    )
  }

  // Empty state
  if (proposals.length === 0) {
    return (
      <div className={className}>
        <ProposalEmptyState onAction={emptyStateAction} />
      </div>
    )
  }

  return (
    <motion.div
      className={cn('space-y-3', className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {proposals.map((proposal) => (
          <motion.div
            key={proposal.id}
            variants={itemVariants}
            layout
            exit="exit"
          >
            <ProposalCard
              proposal={proposal}
              onClick={() => handleSelect(proposal.id)}
              isSelected={selectedId === proposal.id}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

export const ProposalList = memo(ProposalListComponent)

// Export sub-components for flexibility
export { ProposalCardSkeleton, ProposalListSkeleton, ProposalEmptyState }
