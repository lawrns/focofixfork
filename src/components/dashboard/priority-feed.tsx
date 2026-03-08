'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ThumbsUp,
  X,
  Zap,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PriorityItemKind =
  | 'failed_run'
  | 'blocked_work'
  | 'proposal'
  | 'completed_run'
  | 'agent_error'
  | 'milestone'

export type PrioritySeverity = 'P0' | 'P1' | 'P2' | 'P3'

export interface PriorityFeedItem {
  id: string
  kind: PriorityItemKind
  severity: PrioritySeverity
  title: string
  subtitle?: string
  timestamp: string
  source?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
}

export interface PriorityFeedProps {
  proposals: Array<{
    id: string
    title: string
    status: string
    project?: { name: string } | null
    created_at: string
  }>
  workItems: Array<{
    id: string
    title: string
    status: string
    priority?: string | null
    project?: { name: string } | null
    section?: string | null
  }>
  runs: Array<{
    id: string
    runner: string
    status: string
    summary: string | null
    created_at: string
    ended_at: string | null
  }>
  agents: Array<{
    id: string
    name: string
    status: string
    errorMessage?: string | null
  }>
  onRetryRun?: (runId: string) => void
  onApproveProposal?: (proposalId: string) => void
  onDismissItem?: (itemId: string) => void
  maxItems?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<PrioritySeverity, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
}

const SEVERITY_BORDER: Record<PrioritySeverity, string> = {
  P0: 'border-l-rose-500',
  P1: 'border-l-amber-500',
  P2: 'border-l-blue-500',
  P3: 'border-l-emerald-500',
}

const SEVERITY_BADGE_CLASS: Record<PrioritySeverity, string> = {
  P0: 'bg-rose-500/10 text-rose-500',
  P1: 'bg-amber-500/10 text-amber-500',
  P2: 'bg-blue-500/10 text-blue-500',
  P3: 'bg-emerald-500/10 text-emerald-500',
}

const KIND_LABEL: Record<PriorityItemKind, string> = {
  failed_run: 'FAILED RUN',
  blocked_work: 'BLOCKED',
  proposal: 'PROPOSAL',
  completed_run: 'COMPLETED',
  agent_error: 'AGENT ERROR',
  milestone: 'MILESTONE',
}

const KIND_ICON: Record<PriorityItemKind, React.ReactNode> = {
  failed_run: <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />,
  blocked_work: <Zap className="h-3.5 w-3.5 text-amber-500" />,
  proposal: <ThumbsUp className="h-3.5 w-3.5 text-amber-500" />,
  completed_run: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  agent_error: <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />,
  milestone: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const delta = Math.max(0, Math.floor((now - then) / 1000))
  if (delta < 60) return `${delta}s ago`
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`
  return `${Math.floor(delta / 86400)}d ago`
}

// ---------------------------------------------------------------------------
// Build priority items from heterogeneous sources
// ---------------------------------------------------------------------------

function buildPriorityItems(props: PriorityFeedProps): PriorityFeedItem[] {
  const items: PriorityFeedItem[] = []

  // Failed runs -> P0
  for (const run of props.runs) {
    if (run.status === 'failed' || run.status === 'error') {
      items.push({
        id: `run-${run.id}`,
        kind: 'failed_run',
        severity: 'P0',
        title: run.summary || `Run by ${run.runner}`,
        subtitle: run.runner,
        timestamp: run.ended_at || run.created_at,
        source: run.runner,
        actionLabel: 'Retry',
        onAction: props.onRetryRun ? () => props.onRetryRun!(run.id) : undefined,
        secondaryActionLabel: 'Dismiss',
        onSecondaryAction: props.onDismissItem
          ? () => props.onDismissItem!(`run-${run.id}`)
          : undefined,
      })
    } else if (run.status === 'completed') {
      items.push({
        id: `run-${run.id}`,
        kind: 'completed_run',
        severity: 'P3',
        title: run.summary || `Run by ${run.runner}`,
        subtitle: run.runner,
        timestamp: run.ended_at || run.created_at,
        source: run.runner,
      })
    }
  }

  // Blocked work items -> P0
  for (const wi of props.workItems) {
    if (wi.status === 'blocked') {
      items.push({
        id: `work-${wi.id}`,
        kind: 'blocked_work',
        severity: 'P0',
        title: wi.title,
        subtitle: wi.project?.name || wi.section || undefined,
        timestamp: new Date().toISOString(),
        source: wi.project?.name || undefined,
        actionLabel: 'Escalate',
        onAction: undefined,
        secondaryActionLabel: 'Dismiss',
        onSecondaryAction: props.onDismissItem
          ? () => props.onDismissItem!(`work-${wi.id}`)
          : undefined,
      })
    }
  }

  // Proposals needing review -> P1
  for (const p of props.proposals) {
    if (p.status === 'pending' || p.status === 'draft' || p.status === 'in_review') {
      items.push({
        id: `proposal-${p.id}`,
        kind: 'proposal',
        severity: 'P1',
        title: p.title,
        subtitle: p.project?.name || undefined,
        timestamp: p.created_at,
        source: p.project?.name || undefined,
        actionLabel: 'Approve',
        onAction: props.onApproveProposal
          ? () => props.onApproveProposal!(p.id)
          : undefined,
        secondaryActionLabel: 'Dismiss',
        onSecondaryAction: props.onDismissItem
          ? () => props.onDismissItem!(`proposal-${p.id}`)
          : undefined,
      })
    }
  }

  // Agent errors -> P1
  for (const agent of props.agents) {
    if (agent.status === 'error' || agent.status === 'failed') {
      items.push({
        id: `agent-${agent.id}`,
        kind: 'agent_error',
        severity: 'P1',
        title: agent.errorMessage || `${agent.name} encountered an error`,
        subtitle: agent.name,
        timestamp: new Date().toISOString(),
        source: agent.name,
        secondaryActionLabel: 'Dismiss',
        onSecondaryAction: props.onDismissItem
          ? () => props.onDismissItem!(`agent-${agent.id}`)
          : undefined,
      })
    }
  }

  // Sort by severity first, then timestamp desc
  items.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (sevDiff !== 0) return sevDiff
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  return items
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.15, ease: 'easeIn' } },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PriorityFeed(props: PriorityFeedProps) {
  const { maxItems = 12 } = props
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const allItems = useMemo(() => buildPriorityItems(props), [props])

  const visibleItems = useMemo(
    () => allItems.filter((item) => !dismissed.has(item.id)).slice(0, maxItems),
    [allItems, dismissed, maxItems]
  )

  const urgentCount = useMemo(
    () =>
      visibleItems.filter(
        (item) => item.severity === 'P0' || item.severity === 'P1'
      ).length,
    [visibleItems]
  )

  function handleDismiss(item: PriorityFeedItem) {
    setDismissed((prev) => new Set(prev).add(item.id))
    item.onSecondaryAction?.()
  }

  if (visibleItems.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Needs Attention
        </h3>
        <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          All clear — nothing needs your attention right now.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Needs Attention
        </h3>
        {urgentCount > 0 && (
          <Badge
            variant="secondary"
            className="bg-rose-500/10 text-rose-500 text-[10px] px-1.5 py-0"
          >
            {urgentCount}
          </Badge>
        )}
      </div>

      {/* Feed list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                'rounded-lg border-l-[3px] border bg-card px-3 py-2.5 flex items-center gap-3',
                SEVERITY_BORDER[item.severity]
              )}
            >
              {/* Icon */}
              <div className="flex-shrink-0">{KIND_ICON[item.kind]}</div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] font-semibold px-1.5 py-0 uppercase tracking-wider flex-shrink-0',
                      SEVERITY_BADGE_CLASS[item.severity]
                    )}
                  >
                    {KIND_LABEL[item.kind]}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {relativeTime(item.timestamp)}
                  </span>
                </div>
                <p className="text-sm font-medium truncate mt-0.5">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.subtitle}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {item.actionLabel && item.onAction && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-7 px-2.5 text-xs',
                      item.kind === 'failed_run' && 'text-rose-500 hover:text-rose-400',
                      item.kind === 'proposal' && 'text-[color:var(--foco-teal)] hover:text-[color:var(--foco-teal)]',
                      item.kind === 'blocked_work' && 'text-amber-500 hover:text-amber-400'
                    )}
                    onClick={item.onAction}
                  >
                    {item.kind === 'failed_run' && (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    {item.kind === 'proposal' && (
                      <ThumbsUp className="h-3 w-3 mr-1" />
                    )}
                    {item.kind === 'blocked_work' && (
                      <Zap className="h-3 w-3 mr-1" />
                    )}
                    {item.actionLabel}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => handleDismiss(item)}
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
