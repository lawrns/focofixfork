'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Activity,
  Clock,
  RefreshCw,
  Bot,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface ClawdbotHealth {
  status: string
  last_checkin: string | null
  cron_ran_today: boolean
  today: string
  timestamp: string
}

interface IntelRepo {
  name: string
  url: string
  score: number
  category: string
  stars: string
  language: string
  description: string
  ventures: string
  verdict: string
  integration_difficulty: string
}

interface IntelReport {
  date: string
  summary: string
  repos: IntelRepo[]
}

interface Agent {
  number: number
  name: string
  purpose: string
  focus: string | null
  ventures: string | null
  output_target: string | null
  status: 'active' | 'dormant'
}

// ── Verdict helpers ─────────────────────────────────────────────────────────

const VERDICT_STYLES: Record<string, string> = {
  'upgrade-now':      'bg-emerald-500/10 text-emerald-700 border-emerald-400/40',
  'sandbox-first':    'bg-blue-500/10 text-blue-700 border-blue-400/40',
  'monitor':          'bg-amber-500/10 text-amber-700 border-amber-400/40',
  'ignore':           'bg-zinc-500/10 text-zinc-600 border-zinc-400/40',
  'downgrade-risk':   'bg-rose-500/10 text-rose-700 border-rose-400/40',
}

const VERDICT_LABELS: Record<string, string> = {
  'upgrade-now':    '🚀 upgrade-now',
  'sandbox-first':  '🧪 sandbox-first',
  'monitor':        '👁 monitor',
  'ignore':         '— ignore',
  'downgrade-risk': '⚠ downgrade-risk',
}

function verdictStyle(v: string) {
  return VERDICT_STYLES[v] ?? 'bg-secondary text-secondary-foreground border-border'
}

function verdictLabel(v: string) {
  return VERDICT_LABELS[v] ?? v
}

// ── Score bar ───────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const color = score >= 8 ? 'bg-emerald-500' : score >= 6 ? 'bg-blue-500' : 'bg-amber-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-semibold text-foreground w-6 text-right">{score}</span>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function ClawdbotPage() {
  const [health, setHealth] = useState<ClawdbotHealth | null>(null)
  const [healthError, setHealthError] = useState(false)
  const [intel, setIntel] = useState<IntelReport | null>(null)
  const [intelError, setIntelError] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = useCallback(async () => {
    setRefreshing(true)
    const [healthRes, intelRes, agentsRes] = await Promise.allSettled([
      fetch('/api/clawdbot/health'),
      fetch('/api/clawdbot/intel'),
      fetch('/api/clawdbot/agents'),
    ])

    if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
      setHealth(await healthRes.value.json())
      setHealthError(false)
    } else {
      setHealthError(true)
    }

    if (intelRes.status === 'fulfilled' && intelRes.value.ok) {
      setIntel(await intelRes.value.json())
      setIntelError(false)
    } else {
      setIntelError(true)
    }

    if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
      const d = await agentsRes.value.json()
      setAgents(d.agents ?? [])
    }

    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    document.title = 'Intel Feed | Critter'
  }, [])

  const top5 = (intel?.repos ?? []).slice(0, 5)
  const activeAgents = agents.filter(a => a.status === 'active')
  const dormantAgents = agents.filter(a => a.status === 'dormant')

  return (
    <PageShell>
      <PageHeader
        title="Intel Feed"
        subtitle="Clawdbot daily intelligence sweep"
        primaryAction={
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline ml-1">Refresh</span>
          </Button>
        }
      />

      {/* ── 1. System Health Bar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* API Status */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">API</span>
          </div>
          <div className="flex items-center gap-2">
            {healthError ? (
              <>
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold text-red-500">Offline</span>
              </>
            ) : health ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-600">Online</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">Checking…</span>
              </>
            )}
          </div>
        </div>

        {/* Last Checkin */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Last Checkin</span>
          </div>
          <span className="text-sm font-mono font-semibold">
            {health?.last_checkin
              ? new Date(health.last_checkin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '—'}
          </span>
        </div>

        {/* Daily Cron */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Daily Sweep</span>
          </div>
          {health ? (
            <Badge
              variant="outline"
              className={health.cron_ran_today
                ? 'border-emerald-400/40 text-emerald-700 bg-emerald-500/10'
                : 'border-amber-400/40 text-amber-700 bg-amber-500/10'}
            >
              {health.cron_ran_today ? 'Ran today' : 'Not yet'}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>

        {/* Report Date */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Latest Report</span>
          </div>
          <span className="text-sm font-mono font-semibold">
            {intel?.date ?? '—'}
          </span>
        </div>
      </div>

      {/* ── 2. Today's Brief ─────────────────────────────────────────────── */}
      {(intel || intelError) && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[color:var(--foco-teal)]" />
            Today's Brief
          </h2>
          {intelError ? (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="p-4 flex items-center gap-3 text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm">Could not load intel. Make sure the Clawdbot API server is running (<code className="font-mono">npm run api</code> in clawdbot/).</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{intel?.summary}</p>
                <div className="mt-2 text-xs text-muted-foreground font-mono">{intel?.date}</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── 3. Top Repos ─────────────────────────────────────────────────── */}
      {top5.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3">Top Repos</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {top5.map((repo) => (
              <Card key={repo.url} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold hover:underline flex items-center gap-1 truncate"
                      >
                        {repo.name}
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </a>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{repo.category}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] shrink-0', verdictStyle(repo.verdict))}
                    >
                      {verdictLabel(repo.verdict)}
                    </Badge>
                  </div>

                  {/* Score */}
                  <ScoreBar score={repo.score} />

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2">{repo.description}</p>

                  {/* Meta chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {repo.stars && (
                      <span className="text-[10px] text-muted-foreground font-mono">⭐ {repo.stars}</span>
                    )}
                    {repo.language && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{repo.language}</Badge>
                    )}
                    {repo.ventures && (
                      <span className="text-[10px] text-muted-foreground truncate">{repo.ventures}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Agent Roster ──────────────────────────────────────────────── */}
      {agents.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Bot className="h-4 w-4 text-[color:var(--foco-teal)]" />
            Agent Roster
            <Badge variant="secondary" className="text-[10px] font-mono">{agents.length}</Badge>
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {agents.map((agent) => (
              <div
                key={agent.number}
                className="rounded-lg border border-border bg-card p-3 flex items-start gap-2"
              >
                <span className="text-[10px] font-mono text-muted-foreground w-5 shrink-0 pt-0.5">
                  {String(agent.number).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium truncate">{agent.name.replace(/-Agent$/, '')}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] h-3.5 px-1 shrink-0',
                        agent.status === 'active'
                          ? 'border-emerald-400/40 text-emerald-700 bg-emerald-500/10'
                          : 'border-zinc-400/30 text-zinc-500 bg-zinc-500/5'
                      )}
                    >
                      {agent.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
                    {agent.purpose}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state when API is offline ─────────────────────────────── */}
      {healthError && agents.length === 0 && !intel && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-sm font-semibold mb-2">Clawdbot API not running</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start the API server to see intel data here.
            </p>
            <code className="text-xs bg-secondary px-3 py-1.5 rounded font-mono">
              cd ~/clawdbot && npm run api
            </code>
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}
