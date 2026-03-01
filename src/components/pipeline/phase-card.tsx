'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { PlanResult, ExecutionResult, ReviewReport } from '@/lib/pipeline/types'
import { ContextInspector } from './context-inspector'
import { ReviewReport as ReviewReportComponent } from './review-report'

export type PhaseCardStatus = 'idle' | 'active' | 'done' | 'failed'

interface PhaseCardProps {
  phase: 'plan' | 'execute' | 'review'
  model: string | null
  status: PhaseCardStatus
  context?: string
  elapsedMs?: number
  result?: PlanResult | ExecutionResult | ReviewReport | null
  children?: React.ReactNode
  handbookRef?: string | null
  // Streaming props
  streamingText?: string
  ttftMs?: number | null
  tokensIn?: number
  tokensOut?: number
  tokenThroughput?: number // tokens per second
}

const PHASE_LABELS: Record<PhaseCardProps['phase'], string> = {
  plan: '① Planning',
  execute: '② Execution',
  review: '③ Review',
}

const MODEL_SHORT: Record<string, string> = {
  'claude-opus-4-6': 'Claude Opus 4.6',
  'kimi-k2-standard': 'Kimi K2.5 Standard',
  'kimi-k2-fast': 'Kimi K2.5 Fast',
  'kimi-k2-max': 'Kimi K2.5 Max',
  'codex-standard': 'Codex Standard',
  'codex-mini': 'Codex Mini',
  'codex-fast': 'Codex Fast',
  'codex-pro': 'Codex Pro',
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function StatusBadge({ status, elapsedMs, ttftMs, tokensOut, tokenThroughput }: {
  status: PhaseCardStatus
  elapsedMs?: number
  ttftMs?: number | null
  tokensOut?: number
  tokenThroughput?: number
}) {
  switch (status) {
    case 'active':
      return (
        <div className="flex items-center gap-3">
          {ttftMs != null && (
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
              TTFT {ttftMs}ms
            </span>
          )}
          {tokensOut != null && tokensOut > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
              {tokensOut} tok
              {tokenThroughput != null && tokenThroughput > 0 && ` · ${tokenThroughput.toFixed(0)}/s`}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[color:var(--foco-teal)] text-xs font-medium">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Running{elapsedMs ? `… ${formatElapsed(elapsedMs)}` : '…'}
          </span>
        </div>
      )
    case 'done':
      return (
        <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {elapsedMs ? `✔ ${formatElapsed(elapsedMs)}` : '✔ Done'}
        </span>
      )
    case 'failed':
      return (
        <span className="flex items-center gap-1.5 text-destructive text-xs font-medium">
          <XCircle className="h-3.5 w-3.5" />
          Failed
        </span>
      )
    default:
      return (
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Clock className="h-3.5 w-3.5" />
          Waiting
        </span>
      )
  }
}

function isPlanResult(r: unknown): r is PlanResult {
  return !!r && typeof r === 'object' && 'steps' in r
}

function isExecutionResult(r: unknown): r is ExecutionResult {
  return !!r && typeof r === 'object' && 'patches' in r
}

function isReviewReport(r: unknown): r is ReviewReport {
  return !!r && typeof r === 'object' && 'confidence_score' in r
}

export function PhaseCard({
  phase,
  model,
  status,
  context,
  elapsedMs,
  result,
  children,
  handbookRef,
  streamingText,
  ttftMs,
  tokensIn,
  tokensOut,
  tokenThroughput,
}: PhaseCardProps) {
  const streamEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll streaming text to bottom
  useEffect(() => {
    if (streamingText && streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamingText])

  const showStreamingText = status === 'active' && streamingText && streamingText.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'rounded-xl border-2 transition-colors bg-card',
        status === 'active' &&
          'border-[color:var(--foco-teal)] shadow-[0_0_12px_rgba(0,200,170,0.15)]',
        status === 'done' && 'border-emerald-500/60',
        status === 'failed' && 'border-destructive/60',
        status === 'idle' && 'border-border opacity-60',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{PHASE_LABELS[phase]}</span>
          <span className="text-xs text-muted-foreground">
            {(model && MODEL_SHORT[model]) ?? model ?? '—'}
          </span>
        </div>
        <StatusBadge
          status={status}
          elapsedMs={elapsedMs}
          ttftMs={ttftMs}
          tokensOut={tokensOut}
          tokenThroughput={tokenThroughput}
        />
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Token summary for completed phases */}
        {status === 'done' && (tokensIn != null || tokensOut != null) && (tokensIn! > 0 || tokensOut! > 0) && (
          <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {tokensIn ?? 0} in / {tokensOut ?? 0} out
            </span>
            {ttftMs != null && <span>TTFT {ttftMs}ms</span>}
          </div>
        )}

        {/* Live streaming text output */}
        {showStreamingText && (
          <ScrollArea className="h-48 rounded-md border border-border/50 bg-muted/30">
            <pre className="text-[11px] font-mono p-3 whitespace-pre-wrap leading-relaxed text-foreground/80">
              {streamingText}
              <span className="inline-block w-2 h-4 bg-[color:var(--foco-teal)] animate-pulse ml-0.5 align-text-bottom" />
              <div ref={streamEndRef} />
            </pre>
          </ScrollArea>
        )}

        {/* Context inspector */}
        {context && (
          <ContextInspector label="Context sent" text={context} value={`ctx-${phase}`} />
        )}

        {/* Plan result */}
        {result && isPlanResult(result) && (
          <div className="space-y-2">
            <p className="text-sm text-foreground/80">{result.summary}</p>
            {result.steps?.length > 0 && (
              <ol className="space-y-1 pl-1">
                {result.steps.map((s: string, i: number) => (
                  <li key={i} className="text-xs text-foreground/70 flex gap-2">
                    <span className="text-muted-foreground font-medium w-4 flex-shrink-0">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            )}
            {result.risks?.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Risks</p>
                {result.risks.map((r: string, i: number) => (
                  <p key={i} className="text-xs text-amber-500">· {r}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Execution result */}
        {result && isExecutionResult(result) && (
          <div className="space-y-2">
            <p className="text-sm text-foreground/80">{result.summary}</p>
            <p className="text-xs text-muted-foreground">
              {result.patches?.length ?? 0} patches
              {result.commands_suggested?.length ? ` · ${result.commands_suggested.length} commands` : ''}
            </p>
          </div>
        )}

        {/* Review result */}
        {result && isReviewReport(result) && (
          <ReviewReportComponent report={result} handbookRef={handbookRef ?? null} />
        )}

        {/* Progress bar while active */}
        {status === 'active' && !showStreamingText && (
          <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full w-full bg-[color:var(--foco-teal)] rounded-full animate-[shimmer_2s_ease-in-out_infinite] origin-left" />
          </div>
        )}

        {/* Action slot */}
        {children && <div className="pt-1">{children}</div>}
      </div>
    </motion.div>
  )
}
