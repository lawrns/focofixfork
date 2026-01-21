'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProposalStatusBadge } from './proposal-status-badge'
import { cn } from '@/lib/utils'
import type { Proposal, ProposalSourceType } from '@/types/proposals'
import {
  Mic,
  MessageSquare,
  FileText,
  ChevronRight,
  Calendar,
  Bot,
  Zap,
  FileCode,
  PenTool,
  Phone,
} from 'lucide-react'

interface ProposalCardProps {
  proposal: Proposal
  onClick: () => void
  isSelected?: boolean
  className?: string
}

const sourceTypeConfig: Record<ProposalSourceType, {
  icon: typeof Mic
  label: string
  color: string
}> = {
  voice: {
    icon: Mic,
    label: 'Voice',
    color: 'text-blue-500 dark:text-blue-400',
  },
  text: {
    icon: MessageSquare,
    label: 'Text',
    color: 'text-violet-500 dark:text-violet-400',
  },
  file: {
    icon: FileText,
    label: 'File',
    color: 'text-emerald-500 dark:text-emerald-400',
  },
  api: {
    icon: Zap,
    label: 'API',
    color: 'text-amber-500 dark:text-amber-400',
  },
  whatsapp: {
    icon: Phone,
    label: 'WhatsApp',
    color: 'text-green-500 dark:text-green-400',
  },
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  if (email) {
    return email.charAt(0).toUpperCase()
  }
  return '?'
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function ProposalCardComponent({
  proposal,
  onClick,
  isSelected = false,
  className,
}: ProposalCardProps) {
  const sourceType = proposal.source_type || 'manual'
  const sourceConfig = sourceTypeConfig[sourceType]
  const SourceIcon = sourceConfig.icon

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <Card
        variant="interactive"
        padding="none"
        onClick={onClick}
        className={cn(
          'group relative overflow-hidden transition-all duration-200',
          isSelected && 'ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-900',
          className
        )}
      >
        {/* Hover gradient overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          initial={false}
        />

        <div className="relative p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Source Type Icon */}
            <motion.div
              className={cn(
                'flex-shrink-0 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 transition-colors',
                'group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800'
              )}
              whileHover={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.3 }}
            >
              <SourceIcon className={cn('h-5 w-5', sourceConfig.color)} />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Title and Status */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-primary transition-colors">
                  {proposal.title}
                </h3>
                <ProposalStatusBadge status={proposal.status} size="sm" animate={false} />
              </div>

              {/* Description */}
              {proposal.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                  {proposal.description}
                </p>
              )}

              {/* Meta: Creator and Timestamp */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    {proposal.creator?.avatar_url && (
                      <AvatarImage
                        src={proposal.creator.avatar_url}
                        alt={proposal.creator.full_name || 'Creator'}
                      />
                    )}
                    <AvatarFallback className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {getInitials(proposal.creator?.full_name, proposal.creator?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500 truncate">
                    {proposal.creator?.full_name || proposal.creator?.email || 'Unknown'}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                  <Calendar className="h-3 w-3" />
                  <span>{formatRelativeTime(proposal.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Chevron indicator */}
            <motion.div
              className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity"
              initial={{ x: -4 }}
              whileHover={{ x: 0 }}
            >
              <ChevronRight className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
            </motion.div>
          </div>
        </div>

        {/* Bottom border accent on hover */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ originX: 0 }}
        />
      </Card>
    </motion.div>
  )
}

export const ProposalCard = memo(ProposalCardComponent)
