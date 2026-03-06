'use client'

import Link from 'next/link'
import { forwardRef, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Square, ArrowDown, CheckCircle2 } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/data-display/avatar'
import { runCardEntry } from '@/lib/motion/variants'
import { getAgentAvatar } from '@/lib/agent-avatars'
import type { Run } from './use-dashboard-data'

export type TerminalToken = 'INIT' | 'PLAN' | 'ACTION' | 'OBSERVE' | 'RESULT' | 'ERROR'

export type TerminalLine = {
  id: string
  token: TerminalToken
  text: string
  ts: number
}

function tokenPill(token: TerminalToken) {
  const colors: Record<TerminalToken, string> = {
    INIT: 'bg-emerald-500/10 text-emerald-400',
    PLAN: 'bg-cyan-500/10 text-cyan-400',
    ACTION: 'bg-amber-500/10 text-amber-400',
    OBSERVE: 'bg-blue-500/10 text-blue-400',
    RESULT: 'bg-emerald-500/10 text-emerald-400',
    ERROR: 'bg-rose-500/10 text-rose-400',
  }
  return colors[token]
}

function statusDotColor(status: string): string {
  if (status === 'running' || status === 'active') return 'bg-emerald-500'
  if (status === 'pending' || status === 'queued') return 'bg-amber-500'
  if (status === 'failed' || status === 'error') return 'bg-rose-500'
  if (status === 'completed') return 'bg-emerald-500'
  return 'bg-zinc-500'
}

function statusBorderColor(status: string): string {
  if (status === 'running' || status === 'active') return 'border-l-emerald-500'
  if (status === 'pending' || status === 'queued') return 'border-l-amber-500'
  if (status === 'failed' || status === 'error') return 'border-l-rose-500'
  if (status === 'completed') return 'border-l-emerald-500'
  return 'border-l-zinc-500'
}

function connectionLabel(connectionState: NonNullable<RunCardProps['connectionState']>): string {
  switch (connectionState) {
    case 'resolving':
      return 'Resolving stream'
    case 'connecting':
      return 'Connecting stream'
    case 'live':
      return 'Live stream attached'
    case 'ended':
      return 'Stream ended'
    case 'unavailable':
      return 'No live stream'
    default:
      return 'Waiting for updates'
  }
}

function ElapsedTimer({ since }: { since?: string | null }) {
  const [elapsed, setElapsed] = useState('0s')

  useEffect(() => {
    if (!since) return
    const update = () => {
      const delta = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000))
      if (delta < 60) setElapsed(`${delta}s`)
      else if (delta < 3600) setElapsed(`${Math.floor(delta / 60)}m ${delta % 60}s`)
      else setElapsed(`${Math.floor(delta / 3600)}h ${Math.floor((delta % 3600) / 60)}m`)
    }
    update()
    const id = window.setInterval(update, 1000)
    return () => window.clearInterval(id)
  }, [since])

  return <span className="text-[10px] text-muted-foreground font-mono">{elapsed}</span>
}

type RunCardProps = {
  run: Run
  terminalLines: TerminalLine[]
  connectionState?: 'idle' | 'resolving' | 'connecting' | 'live' | 'ended' | 'unavailable'
  onStop?: (id: string) => void
}

export const RunCard = forwardRef<HTMLDivElement, RunCardProps>(function RunCard(
  { run, terminalLines, connectionState = 'idle', onStop }: RunCardProps,
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [showJumpButton, setShowJumpButton] = useState(false)
  const isComplete = run.status === 'completed'
  const isFailed = run.status === 'failed' || run.status === 'error'
  const isRunning = run.status === 'running' || run.status === 'active'

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowJumpButton(!entry.isIntersecting),
      { root: scrollRef.current, threshold: 0.1 }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (sentinelRef.current && !showJumpButton) {
      sentinelRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [terminalLines.length, showJumpButton])

  return (
    <motion.div
      ref={ref}
      layout
      variants={runCardEntry}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'rounded-lg border-l-4 border bg-card overflow-hidden transition-colors',
        statusBorderColor(run.status),
        isFailed && 'animate-[failFlash_0.6s_ease-in-out]'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <motion.div
          className={cn('h-2 w-2 rounded-full flex-shrink-0', statusDotColor(run.status))}
          animate={isRunning ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
          transition={isRunning ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
        />
        {isComplete ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
        ) : null}
        <Avatar size="xs" className="flex-shrink-0">
          <AvatarImage src={getAgentAvatar({ name: run.runner || 'agent', nativeId: run.runner })} alt={run.runner || 'agent'} />
          <AvatarFallback className="text-[9px]">{(run.runner || 'AG').slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
          {run.runner || 'agent'}
        </Badge>
        <Badge variant="secondary" className="hidden md:inline-flex text-[10px] px-1.5 py-0 flex-shrink-0">
          {connectionLabel(connectionState)}
        </Badge>
        <span className="text-xs text-muted-foreground truncate flex-1">
          {run.summary || run.task_id || 'Task'}
        </span>
        <ElapsedTimer since={run.started_at || run.created_at || null} />
        <Link href={`/runs/${run.id}`} className="text-[10px] text-[color:var(--foco-teal)] hover:underline">
          Details
        </Link>
        {isRunning && onStop && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
            onClick={() => onStop(run.id)}
          >
            <Square className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Mini terminal */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="bg-zinc-950 font-mono text-xs text-zinc-100 px-3 py-2 h-[120px] overflow-auto"
        >
          {terminalLines.length === 0 ? (
            <p className="text-zinc-500">
              {connectionState === 'resolving' || connectionState === 'connecting'
                ? 'Connecting to execution stream...'
                : connectionState === 'unavailable'
                  ? 'Run is saved, but no live stream is attached yet.'
                  : 'Run is saved. Waiting for execution updates...'}
            </p>
          ) : (
            terminalLines.map((line) => (
              <div key={line.id} className="whitespace-pre-wrap break-words leading-relaxed">
                <span className={cn('rounded px-1 text-[10px] font-semibold mr-1.5', tokenPill(line.token))}>
                  [{line.token}]
                </span>
                <span>{line.text}</span>
              </div>
            ))
          )}
          {(isRunning || connectionState !== 'idle') && (
            <div className="mt-2 border-t border-zinc-800 pt-2 text-[10px] text-zinc-500">
              <span className={cn('mr-2', connectionState === 'live' ? 'text-emerald-400' : 'text-blue-400')}>
                [{connectionState === 'live' ? 'STREAM' : 'STATE'}]
              </span>
              <span>{connectionLabel(connectionState)}</span>
            </div>
          )}
          <div ref={sentinelRef} />
        </div>

        {showJumpButton && (
          <button
            onClick={() => sentinelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
            className="absolute bottom-2 right-2 rounded-full bg-zinc-800 border border-zinc-700 p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Jump to latest output"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        )}
      </div>
    </motion.div>
  )
})
