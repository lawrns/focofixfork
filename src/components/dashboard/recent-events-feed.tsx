'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LedgerEvent } from './use-dashboard-data'

const SHARED_SPRING = { type: 'spring', stiffness: 300, damping: 30 }

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.max(1, Math.floor(ms / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function sourceBorder(type: string): string {
  if (type === 'policy') return 'border-l-2 border-l-purple-500'
  if (type === 'clawdbot') return 'border-l-2 border-l-cyan-500'
  if (type === 'error') return 'border-l-2 border-l-rose-500'
  return 'border-l-2 border-l-zinc-400 dark:border-l-zinc-600'
}

type RecentEventsFeedProps = {
  events: LedgerEvent[]
  onSelect: (event: LedgerEvent) => void
}

export function RecentEventsFeed({ events, onSelect }: RecentEventsFeedProps) {
  const router = useRouter()

  return (
    <div className="rounded-xl border bg-card">
      <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Events</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push('/ledger')}>View all</Button>
      </div>
      <div className="relative">
        <div className="overflow-auto max-h-[calc(100vh-12rem)]">
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3">No recent events.</p>
          ) : (
            <div className="divide-y divide-border/50">
              <AnimatePresence initial={false}>
                {events.slice(0, 14).map((event) => (
                  <motion.button
                    key={event.id}
                    initial={{ y: -12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 12, opacity: 0 }}
                    transition={SHARED_SPRING}
                    onClick={() => onSelect(event)}
                    className={cn(
                      'group w-full flex items-center gap-2 px-3 h-7 text-left hover:bg-muted/40 transition-colors',
                      sourceBorder(event.type)
                    )}
                  >
                    <span className="font-mono text-[10px] uppercase text-muted-foreground w-14 flex-shrink-0 truncate">
                      {event.type}
                    </span>
                    <span className="truncate font-mono text-xs flex-1">
                      {event.source || event.type}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground truncate max-w-[120px] transition-opacity">
                      {event.payload ? Object.keys(event.payload).slice(0, 2).join(', ') : ''}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{relativeTime(event.timestamp)}</span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent" />
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-card to-transparent" />
      </div>
    </div>
  )
}
