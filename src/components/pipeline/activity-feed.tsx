'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { listItem } from '@/lib/motion/variants'

export interface FeedEntry {
  id: string
  ts: Date
  phase: 'plan' | 'execute' | 'review' | 'system'
  message: string
}

function formatHHMMSS(date: Date): string {
  return date.toTimeString().slice(0, 8)
}

const PILL_STYLES: Record<FeedEntry['phase'], string> = {
  plan: 'bg-indigo-500/15 text-indigo-400',
  execute: 'bg-[color:var(--foco-teal-dim)] text-[color:var(--foco-teal)]',
  review: 'bg-amber-500/15 text-amber-400',
  system: 'bg-muted text-muted-foreground',
}

const PILL_LABELS: Record<FeedEntry['phase'], string> = {
  plan: 'Plan',
  execute: 'Exec',
  review: 'Rev',
  system: 'Sys',
}

function PhasePill({ phase }: { phase: FeedEntry['phase'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 w-10 justify-center',
        PILL_STYLES[phase]
      )}
    >
      {PILL_LABELS[phase]}
    </span>
  )
}

interface ActivityFeedProps {
  entries: FeedEntry[]
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  return (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Activity Feed
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto px-4 py-2">
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              variants={listItem}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex items-baseline gap-3 py-1 text-[12px] font-mono overflow-hidden"
            >
              <span className="text-muted-foreground tabular-nums w-16 flex-shrink-0">
                {formatHHMMSS(entry.ts)}
              </span>
              <PhasePill phase={entry.phase} />
              <span className="text-foreground/80">{entry.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
