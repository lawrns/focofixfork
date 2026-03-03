'use client'

import { useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeedEntry } from './activity-feed'
import { useOpenClawLogs } from '@/lib/hooks/use-openclaw-logs'

interface TerminalSidebarProps {
  feedEntries: FeedEntry[]
  activePhase: 'plan' | 'execute' | 'review' | null
  activeStreamText: string
  isRunning: boolean
  isOpen?: boolean
  onToggle?: () => void
}

const PREFIX_STYLES: Record<string, string> = {
  plan:    'text-indigo-400',
  execute: 'text-[color:var(--foco-teal,#00c8aa)]',
  review:  'text-amber-400',
  system:  'text-zinc-500',
  gate:    'text-zinc-600',
}

const PREFIX_LABELS: Record<string, string> = {
  plan:    '[PLAN]',
  execute: '[EXEC]',
  review:  '[REV ]',
  system:  '[SYS ]',
  gate:    '[GATE]',
}

function formatHHMMSS(date: Date): string {
  return date.toTimeString().slice(0, 8)
}

function TerminalLine({
  prefix,
  time,
  text,
}: {
  prefix: string
  time?: string
  text: string
}) {
  const prefixColor = PREFIX_STYLES[prefix] ?? 'text-zinc-500'
  const label = PREFIX_LABELS[prefix] ?? `[${prefix.toUpperCase().slice(0, 4)}]`

  return (
    <div className="flex gap-2 leading-relaxed">
      {time && (
        <span className="text-zinc-600 tabular-nums flex-shrink-0 select-none">{time}</span>
      )}
      <span className={cn('flex-shrink-0 select-none font-bold', prefixColor)}>{label}</span>
      <span className="text-zinc-300 break-all whitespace-pre-wrap">{text}</span>
    </div>
  )
}

export function TerminalSidebar({
  feedEntries,
  activePhase,
  activeStreamText,
  isRunning,
  isOpen = true,
  onToggle,
}: TerminalSidebarProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const { logs: gateLogs, connected: gateConnected } = useOpenClawLogs(100)

  // Last 20 lines of streaming text
  const streamLines = activeStreamText
    ? activeStreamText.split('\n').slice(-20)
    : []

  // Last 30 gate log entries
  const recentGateLogs = gateLogs.slice(-30)

  // Auto-scroll on any content change
  const totalEntries = feedEntries.length + streamLines.length + recentGateLogs.length
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [totalEntries, isOpen])

  const entryCount = feedEntries.length + recentGateLogs.length

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col">
      {/* Header — always visible, acts as toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 flex-shrink-0 w-full text-left hover:bg-zinc-900/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
            Terminal
          </span>
          {isRunning && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {gateConnected && (
            <span className="text-[10px] text-zinc-600 font-mono">gate ●</span>
          )}
          {entryCount > 0 && (
            <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5 font-mono tabular-nums">
              {entryCount}
            </span>
          )}
          {isOpen
            ? <ChevronUp className="h-3.5 w-3.5 text-zinc-600" />
            : <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
          }
        </div>
      </button>

      {/* Body — collapsible */}
      {isOpen && (
        <div className="overflow-y-auto px-3 py-2 font-mono text-[11px] space-y-0.5 max-h-80">
          {feedEntries.map((entry) => (
            <TerminalLine
              key={entry.id}
              prefix={entry.phase}
              time={formatHHMMSS(entry.ts)}
              text={entry.message}
            />
          ))}

          {activePhase && streamLines.length > 0 && (
            <>
              <div className="border-t border-zinc-800 my-1.5" />
              <div className="text-[10px] text-zinc-700 mb-1 uppercase tracking-wider">
                ── live stream ──
              </div>
              {streamLines.map((line, i) => (
                <TerminalLine
                  key={`stream-${i}`}
                  prefix={activePhase}
                  text={line || ' '}
                />
              ))}
              <span className="inline-block w-1.5 h-3 bg-zinc-400 ml-1 animate-pulse align-middle" />
            </>
          )}

          {recentGateLogs.length > 0 && (
            <>
              <div className="border-t border-zinc-800 my-1.5" />
              <div className="text-[10px] text-zinc-700 mb-1 uppercase tracking-wider">
                ── gateway ──
              </div>
              {recentGateLogs.map((log, i) => {
                const msg =
                  log.message ??
                  (typeof log.data === 'string' ? log.data : JSON.stringify(log))
                return (
                  <TerminalLine
                    key={`gate-${i}`}
                    prefix="gate"
                    time={log.time ? String(log.time).slice(11, 19) : undefined}
                    text={String(msg)}
                  />
                )
              })}
            </>
          )}

          {feedEntries.length === 0 && streamLines.length === 0 && recentGateLogs.length === 0 && (
            <div className="text-zinc-700 text-[11px] mt-4 text-center">
              Waiting for activity…
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
