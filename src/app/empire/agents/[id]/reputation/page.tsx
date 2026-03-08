'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Shield } from 'lucide-react'
import { PageShell } from '@/components/layout/page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrustScoreGauge } from '@/components/trust/trust-score-gauge'
import { PoeAnchorList } from '@/components/trust/poe-anchor-list'
import { GraduationTimeline } from '@/components/trust/graduation-timeline'
import { cn } from '@/lib/utils'
import type { AgentReputationProfile, AutonomyTier } from '@/lib/trust/types'

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

function backendLabel(backend: string): string {
  const labels: Record<string, string> = {
    clawdbot: 'AI Engine',
    crico: 'Intelligence',
    bosun: 'Scheduler',
    openclaw: 'Browser Agent',
    custom: 'Custom',
  }
  return labels[backend] ?? backend
}

function SparklineMini({ data }: { data: Array<{ score: number }> }) {
  if (data.length < 2) return null
  const max = 100
  const min = 0
  const width = 200
  const height = 40
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((d.score - min) / (max - min)) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="text-[color:var(--foco-teal)]">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function AgentReputationPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [profile, setProfile] = useState<AgentReputationProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/trust/agents/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setProfile(json.profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  if (loading && !profile) {
    return (
      <PageShell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading reputation profile...
        </div>
      </PageShell>
    )
  }

  if (error || !profile) {
    return (
      <PageShell>
        <div className="space-y-4">
          <Link href="/agents" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to agents
          </Link>
          <Card className="border-rose-500/40">
            <CardContent className="pt-4 text-sm text-rose-600">{error ?? 'Agent not found'}</CardContent>
          </Card>
        </div>
      </PageShell>
    )
  }

  const { agent, trust_score, recent_anchors, graduations, revenue_total_cents } = profile

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Nav */}
        <Link href="/agents" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to agents
        </Link>

        {/* Agent Identity Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Shield className="h-5 w-5 text-[color:var(--foco-teal)]" />
              <h1 className="text-xl font-semibold">{agent.display_name}</h1>
              <Badge variant="outline" className="text-[10px]">{backendLabel(agent.backend)}</Badge>
              <Badge variant="outline" className={cn('text-[10px]', tierBadgeClass(agent.autonomy_tier as AutonomyTier))}>
                {tierLabel(agent.autonomy_tier as AutonomyTier)}
              </Badge>
            </div>
            {agent.description && (
              <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
            )}
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 self-start" onClick={() => void load()}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Score + Sparkline Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-6 pt-6">
              <TrustScoreGauge score={trust_score.score} tier={agent.autonomy_tier as AutonomyTier} size="lg" />
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Total runs</span>
                  <span className="font-medium">{trust_score.total_iterations}</span>
                  <span className="text-muted-foreground">Successful</span>
                  <span className="font-medium text-emerald-500">{trust_score.successful_iterations}</span>
                  <span className="text-muted-foreground">Failed</span>
                  <span className="font-medium text-rose-500">{trust_score.failed_iterations}</span>
                  <span className="text-muted-foreground">Cancelled</span>
                  <span className="font-medium">{trust_score.cancelled_iterations}</span>
                </div>
                {trust_score.avg_duration_ms != null && (
                  <p className="text-xs text-muted-foreground">
                    Avg duration: {trust_score.avg_duration_ms < 1000 ? `${trust_score.avg_duration_ms}ms` : `${(trust_score.avg_duration_ms / 1000).toFixed(1)}s`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Score History</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(trust_score.score_history) && trust_score.score_history.length >= 2 ? (
                <SparklineMini data={trust_score.score_history as Array<{ score: number }>} />
              ) : (
                <p className="text-sm text-muted-foreground">Not enough data for sparkline yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Graduation Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Autonomy Tier History</CardTitle>
          </CardHeader>
          <CardContent>
            <GraduationTimeline graduations={graduations} />
          </CardContent>
        </Card>

        {/* PoE Anchors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Proof of Execution</CardTitle>
          </CardHeader>
          <CardContent>
            <PoeAnchorList agentId={agent.id} />
          </CardContent>
        </Card>

        {/* Revenue Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Revenue Attribution</CardTitle>
          </CardHeader>
          <CardContent>
            {revenue_total_cents > 0 ? (
              <div className="text-sm">
                <span className="text-2xl font-semibold">${(revenue_total_cents / 100).toFixed(2)}</span>
                <span className="ml-2 text-muted-foreground">total attributed</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No revenue data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
