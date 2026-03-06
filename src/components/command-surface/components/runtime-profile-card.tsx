'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getModelLabel, getModelRuntimeSourceLabel } from '@/lib/ai/model-catalog'
import { useAIHealth } from '@/lib/hooks/use-ai-health'

type ExecutionPolicy = {
  mode: 'auto' | 'semi_auto'
  confidenceMinForAuto: number
  requireApprovalForChanges: boolean
}

type RuntimeProfileSummary = {
  workspaceId: string | null
  planModel: string | null
  executeModel: string | null
  reviewModel: string | null
  customAgentOverrides: number
  toolMode: string | null
}

export function RuntimeProfileCard({
  executionPolicy,
  runtimeProfile,
}: {
  executionPolicy: ExecutionPolicy
  runtimeProfile: RuntimeProfileSummary
}) {
  const { getModelHealth } = useAIHealth()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-r from-background via-background to-muted/40 p-3"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.1),transparent_35%)]" />
      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Runtime Profile</p>
          </div>
          <p className="mt-1 text-sm text-foreground/85">
            Approval mode is <span className="font-medium">{executionPolicy.mode === 'semi_auto' ? 'semi-auto' : 'auto'}</span>
            {executionPolicy.requireApprovalForChanges ? ' with write approvals required.' : ' with direct execution allowed when confidence is high.'}
          </p>
          <p className="text-xs text-muted-foreground">
            Confidence gate: {(executionPolicy.confidenceMinForAuto * 100).toFixed(0)}%
            {runtimeProfile.workspaceId ? ' · workspace scoped' : ' · workspace not detected'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[{
            label: 'Plan',
            model: runtimeProfile.planModel,
            className: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
          }, {
            label: 'Execute',
            model: runtimeProfile.executeModel,
            className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
          }, {
            label: 'Review',
            model: runtimeProfile.reviewModel,
            className: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
          }].map((item) => {
            const health = getModelHealth(item.model)
            return (
              <Badge
                key={item.label}
                variant="secondary"
                className={`gap-1 ${health && !health.available ? 'border-rose-500/30 bg-rose-500/10 text-rose-700' : item.className}`}
                title={item.model ? `${getModelRuntimeSourceLabel(item.model) ?? 'Adaptive'} · ${health?.reason ?? 'Health unavailable'}` : 'Adaptive routing'}
              >
                {item.label} {item.model ? getModelLabel(item.model) : 'Adaptive'}
              </Badge>
            )
          })}
          {runtimeProfile.toolMode && <Badge variant="outline">{runtimeProfile.toolMode.replaceAll('_', ' ')}</Badge>}
          {runtimeProfile.customAgentOverrides > 0 && <Badge variant="outline">{runtimeProfile.customAgentOverrides} agent overrides</Badge>}
        </div>
      </div>
    </motion.div>
  )
}
