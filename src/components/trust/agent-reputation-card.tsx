'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { TrustScoreGauge } from './trust-score-gauge'
import type { AutonomyTier } from '@/lib/trust/types'

interface AgentReputationCardProps {
  agentId: string
  displayName: string
  backend: string
  score: number | null
  tier: AutonomyTier | null
  totalIterations?: number
}

function tierLabel(tier: AutonomyTier): string {
  switch (tier) {
    case 'off': return 'Off'
    case 'advisor': return 'Advisor'
    case 'bounded': return 'Bounded'
    case 'near_full': return 'Near-Full'
  }
}

function tierBadgeClass(tier: AutonomyTier): string {
  switch (tier) {
    case 'near_full': return 'text-emerald-500 border-emerald-500/30'
    case 'bounded': return 'text-[color:var(--foco-teal)] border-[color:var(--foco-teal)]/30'
    case 'advisor': return 'text-amber-500 border-amber-500/30'
    case 'off': return 'text-muted-foreground'
  }
}

export function AgentReputationCard({ agentId, displayName, backend, score, tier, totalIterations }: AgentReputationCardProps) {
  if (score == null || tier == null) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-muted-foreground text-[10px]">No trust data</Badge>
      </div>
    )
  }

  return (
    <Link
      href={`/empire/agents/${agentId}/reputation`}
      className="inline-flex items-center gap-2 rounded-md border px-2 py-1 hover:bg-accent/50 transition-colors"
    >
      <TrustScoreGauge score={score} tier={tier} size="sm" />
      <div className="flex flex-col">
        <Badge variant="outline" className={`text-[10px] w-fit ${tierBadgeClass(tier)}`}>
          {tierLabel(tier)}
        </Badge>
        {totalIterations != null && totalIterations > 0 && (
          <span className="text-[10px] text-muted-foreground">{totalIterations} runs</span>
        )}
      </div>
    </Link>
  )
}
