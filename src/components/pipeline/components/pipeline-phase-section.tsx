'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { PipelineFallbackEvent, PipelineRun, PipelineRunnerKind, PipelineStatus } from '@/lib/pipeline/types'
import { TelemetryBar } from '@/components/pipeline/telemetry-bar'
import { PhaseCard, type PhaseCardStatus } from '@/components/pipeline/phase-card'
import { ActivityFeed, type FeedEntry } from '@/components/pipeline/activity-feed'

type PhaseStreamState = {
  text: string
  ttftMs: number | null
  tokensIn: number
  tokensOut: number
  elapsedMs: number
  phaseStartMs: number
}

type PhaseRuntimeMeta = {
  requestedModel: string | null
  resolvedModel: string | null
  actualModel: string | null
  runner: PipelineRunnerKind | null
  error: string | null
  fallbacks: PipelineFallbackEvent[]
}

export function PipelinePhaseSection({
  pipelineStatus,
  totalTokens,
  liveMs,
  complexity,
  confidence,
  totalCostUsd,
  hasLiveTokens,
  currentRun,
  plannerModel,
  executorModel,
  reviewerModel,
  planStream,
  execStream,
  reviewStream,
  phaseCardStatus,
  getPhaseThp,
  canExecute,
  triggerExecute,
  canReview,
  triggerReview,
  handbookSlug,
  setHandbookSlug,
  feedEntries,
  phaseMeta,
}: {
  pipelineStatus: PipelineStatus | null
  totalTokens: number
  liveMs: number
  complexity: string
  confidence: number
  totalCostUsd: number
  hasLiveTokens: boolean
  currentRun: PipelineRun | null
  plannerModel: string
  executorModel: string
  reviewerModel: string
  planStream: PhaseStreamState
  execStream: PhaseStreamState
  reviewStream: PhaseStreamState
  phaseCardStatus: (phase: 'plan' | 'execute' | 'review', status: PipelineStatus | null) => PhaseCardStatus
  getPhaseThp: (stream: PhaseStreamState) => number
  canExecute: boolean
  triggerExecute: () => void
  canReview: boolean
  triggerReview: () => void
  handbookSlug: string
  setHandbookSlug: (value: string) => void
  feedEntries: FeedEntry[]
  phaseMeta: Record<'plan' | 'execute' | 'review', PhaseRuntimeMeta>
}) {
  return (
    <>
      <AnimatePresence>
        {pipelineStatus && (
          <motion.div
            key="telemetry"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            suppressHydrationWarning
          >
            <TelemetryBar tokens={totalTokens} runtimeMs={liveMs} complexity={complexity} confidence={confidence} costUsd={totalCostUsd} isLive={hasLiveTokens} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pipelineStatus && (
          <motion.div key="phase-cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3" suppressHydrationWarning>
            <PhaseCard
              phase="plan"
              model={currentRun?.planner_model ?? plannerModel}
              requestedModel={phaseMeta.plan.requestedModel}
              actualModel={phaseMeta.plan.actualModel}
              runner={phaseMeta.plan.runner}
              errorMessage={phaseMeta.plan.error}
              fallbackEvents={phaseMeta.plan.fallbacks}
              status={phaseCardStatus('plan', pipelineStatus)}
              context={currentRun?.plan_result ? JSON.stringify(currentRun.plan_result, null, 2) : undefined}
              elapsedMs={phaseCardStatus('plan', pipelineStatus) === 'active' ? liveMs : planStream.elapsedMs || undefined}
              result={currentRun?.plan_result}
              streamingText={phaseCardStatus('plan', pipelineStatus) === 'active' ? planStream.text : undefined}
              ttftMs={planStream.ttftMs}
              tokensIn={planStream.tokensIn}
              tokensOut={planStream.tokensOut}
              tokenThroughput={phaseCardStatus('plan', pipelineStatus) === 'active' ? getPhaseThp(planStream) : undefined}
            />

            <PhaseCard
              phase="execute"
              model={currentRun?.executor_model ?? executorModel}
              requestedModel={phaseMeta.execute.requestedModel}
              actualModel={phaseMeta.execute.actualModel}
              runner={phaseMeta.execute.runner}
              errorMessage={phaseMeta.execute.error}
              fallbackEvents={phaseMeta.execute.fallbacks}
              status={phaseCardStatus('execute', pipelineStatus)}
              context={currentRun?.execution_result ? JSON.stringify(currentRun.execution_result, null, 2) : undefined}
              elapsedMs={phaseCardStatus('execute', pipelineStatus) === 'active' ? (execStream.phaseStartMs ? Date.now() - execStream.phaseStartMs : liveMs) : execStream.elapsedMs || undefined}
              result={currentRun?.execution_result}
              streamingText={phaseCardStatus('execute', pipelineStatus) === 'active' ? execStream.text : undefined}
              ttftMs={execStream.ttftMs}
              tokensIn={execStream.tokensIn}
              tokensOut={execStream.tokensOut}
              tokenThroughput={phaseCardStatus('execute', pipelineStatus) === 'active' ? getPhaseThp(execStream) : undefined}
            >
              {canExecute && <Button size="sm" variant="outline" onClick={triggerExecute}>Run Execution</Button>}
            </PhaseCard>

            <PhaseCard
              phase="review"
              model={currentRun?.reviewer_model ?? reviewerModel}
              requestedModel={phaseMeta.review.requestedModel}
              actualModel={phaseMeta.review.actualModel}
              runner={phaseMeta.review.runner}
              errorMessage={phaseMeta.review.error}
              fallbackEvents={phaseMeta.review.fallbacks}
              status={phaseCardStatus('review', pipelineStatus)}
              context={currentRun?.review_result ? JSON.stringify(currentRun.review_result, null, 2) : undefined}
              elapsedMs={phaseCardStatus('review', pipelineStatus) === 'active' ? (reviewStream.phaseStartMs ? Date.now() - reviewStream.phaseStartMs : liveMs) : reviewStream.elapsedMs || undefined}
              result={currentRun?.review_result}
              streamingText={phaseCardStatus('review', pipelineStatus) === 'active' ? reviewStream.text : undefined}
              ttftMs={reviewStream.ttftMs}
              tokensIn={reviewStream.tokensIn}
              tokensOut={reviewStream.tokensOut}
              tokenThroughput={phaseCardStatus('review', pipelineStatus) === 'active' ? getPhaseThp(reviewStream) : undefined}
              handbookRef={currentRun?.handbook_ref ?? null}
            >
              {canReview && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" variant="outline" onClick={triggerReview}>Run Review</Button>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Handbook slug</Label>
                    <input
                      type="text"
                      value={handbookSlug}
                      onChange={(e) => setHandbookSlug(e.target.value.replace(/[^a-z0-9_-]/gi, ''))}
                      placeholder="general"
                      className="h-7 w-28 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--foco-teal)]"
                    />
                  </div>
                  <Button size="sm" variant="ghost" className="text-muted-foreground">Skip</Button>
                </div>
              )}
            </PhaseCard>
          </motion.div>
        )}
      </AnimatePresence>

      {feedEntries.length > 0 && (
        <div className="xl:hidden">
          <ActivityFeed entries={feedEntries} />
        </div>
      )}
    </>
  )
}
