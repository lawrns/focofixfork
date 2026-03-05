'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/hooks/use-auth'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import ErrorBoundary from '@/components/error/error-boundary'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bot,
  Clock3,
  Cpu,
  Flag,
  Gauge,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  X,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react'

type Run = {
  id: string
  runner: string
  status: string
  task_id: string | null
  started_at: string | null
  ended_at: string | null
  created_at?: string
  summary?: string | null
}

type LedgerEvent = {
  id: string
  type: string
  source: string | null
  payload: Record<string, unknown> | null
  timestamp: string
}

type AgentOption = {
  id: string
  name: string
  nativeId: string
  status: string
  backend: string
}

type ProjectOption = {
  id: string
  slug: string
  name: string
}

type TerminalToken = 'INIT' | 'PLAN' | 'ACTION' | 'OBSERVE' | 'RESULT' | 'ERROR'

type TerminalLine = {
  id: string
  token: TerminalToken
  text: string
  ts: number
}

type RibbonState = {
  agent: string
  task: string
  runId?: string
}

const AIInsights = dynamic(
  () => import('@/components/dashboard/AIInsights').then((m) => m.AIInsights),
  { ssr: false, loading: () => null }
)

const SHARED_SPRING = { type: 'spring', stiffness: 300, damping: 30 }

const PERSONA_PRESETS: Array<{ key: 'cto' | 'coo' | 'auto' | 'intake'; label: string; description: string }> = [
  { key: 'cto', label: 'CTO', description: 'Architecture and systems decisions' },
  { key: 'coo', label: 'COO', description: 'Operations and execution flow' },
  { key: 'auto', label: 'Auto', description: 'Automatic best-agent routing' },
  { key: 'intake', label: 'Intake', description: 'Task intake and triage' },
]

function tokenClass(token: TerminalToken): string {
  switch (token) {
    case 'INIT': return 'text-[#4ade80]'
    case 'PLAN': return 'text-[#22d3ee]'
    case 'ACTION': return 'text-[#fbbf24]'
    case 'OBSERVE': return 'text-[#60a5fa]'
    case 'RESULT': return 'text-[#34d399]'
    case 'ERROR': return 'text-[#f87171]'
  }
}

function statusAccent(status: string): string {
  if (status === 'running' || status === 'active') return 'border-l-emerald-500'
  if (status === 'pending' || status === 'queued') return 'border-l-amber-500'
  if (status === 'failed' || status === 'error') return 'border-l-rose-500'
  return 'border-l-zinc-500'
}

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

  return <>{elapsed}</>
}

export default function DashboardPageClient() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [relayReachable, setRelayReachable] = useState<boolean | null>(null)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [attachedTabs, setAttachedTabs] = useState(0)
  const [allRuns, setAllRuns] = useState<Run[]>([])
  const [fleetPaused, setFleetPaused] = useState(false)
  const [recentEvents, setRecentEvents] = useState<LedgerEvent[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [autonomousStats, setAutonomousStats] = useState({ improvementsWeek: 0, handbookEntries: 0 })
  const [showStrategicBanner, setShowStrategicBanner] = useState(true)

  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [selectedProjectSlug, setSelectedProjectSlug] = useState('')
  const [agents, setAgents] = useState<AgentOption[]>([])

  const [commandExpanded, setCommandExpanded] = useState(false)
  const [persona, setPersona] = useState<'cto' | 'coo' | 'auto' | 'intake'>('auto')
  const [agentId, setAgentId] = useState('')
  const [task, setTask] = useState('')
  const [dispatching, setDispatching] = useState(false)
  const [ribbon, setRibbon] = useState<RibbonState | null>(null)
  const [pendingFlash, setPendingFlash] = useState(false)

  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([])
  const [fleetExpanded, setFleetExpanded] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<LedgerEvent | null>(null)

  const hasFetched = useRef(false)

  const activeRuns = useMemo(
    () => allRuns.filter((run) => run.status === 'running' || run.status === 'pending').slice(0, 10),
    [allRuns]
  )

  const runningCount = allRuns.filter((run) => run.status === 'running').length
  const pendingCount = allRuns.filter((run) => run.status === 'pending').length
  const doneCount = allRuns.filter((run) => run.status === 'completed').length
  const failedCount = allRuns.filter((run) => run.status === 'failed').length
  const staleCount = allRuns.filter((run) => run.status === 'running' && run.started_at && Date.now() - new Date(run.started_at).getTime() > 30 * 60 * 1000).length

  const g1Share = allRuns.length > 0
    ? Math.round(
      (allRuns.filter((run) => /revenue|customer|sales|onboard|trial/i.test((run.runner || '') + ' ' + (run.task_id || '') + ' ' + (run.summary || ''))).length / allRuns.length) * 100
    )
    : null

  const gatewayStatus = relayReachable === null ? 'Checking...' : relayReachable ? 'Reachable' : 'Down'

  useEffect(() => {
    document.title = 'Dashboard | Critter'
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const fetchAll = useCallback(async () => {
    if (!user) return
    setRefreshing(true)

    try {
      const [statusRes, runsRes, fleetRes, ledgerRes, projectsRes, agentsRes] = await Promise.allSettled([
        fetch('/api/openclaw/status'),
        fetch('/api/runs'),
        fetch('/api/policies/fleet-status'),
        fetch('/api/ledger?limit=18'),
        fetch('/api/projects?limit=50'),
        fetch('/api/command-center/agents'),
      ])

      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const data = await statusRes.value.json()
        setRelayReachable(data.relay?.reachable ?? false)
        setTokenValid(data.token?.valid ?? false)
        setAttachedTabs(data.tabs?.filter((tab: any) => tab.attached).length ?? 0)
      } else {
        setRelayReachable(false)
        setTokenValid(false)
        setAttachedTabs(0)
      }

      if (runsRes.status === 'fulfilled' && runsRes.value.ok) {
        const data = await runsRes.value.json()
        const runs: Run[] = data.data || data.runs || []
        setAllRuns(runs)
      }

      if (fleetRes.status === 'fulfilled' && fleetRes.value.ok) {
        const data = await fleetRes.value.json()
        if (typeof data.paused === 'boolean') setFleetPaused(data.paused)
      }

      if (ledgerRes.status === 'fulfilled' && ledgerRes.value.ok) {
        const data = await ledgerRes.value.json()
        setRecentEvents(data.data || data.events || [])
      }

      if (projectsRes.status === 'fulfilled' && projectsRes.value.ok) {
        const data = await projectsRes.value.json()
        const projects = (data?.data?.projects ?? []) as ProjectOption[]
        setProjectOptions(projects)
        if (!selectedProjectSlug && projects[0]?.slug) {
          setSelectedProjectSlug(projects[0].slug)
        }
      }

      if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
        const data = await agentsRes.value.json()
        const nextAgents = (data?.agents ?? []) as AgentOption[]
        setAgents(nextAgents)
      }

      fetch('/api/dashboard/autonomous-stats')
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data) {
            setAutonomousStats({
              improvementsWeek: data.improvementsWeek ?? 0,
              handbookEntries: data.improvementsMonth ?? 0,
            })
          }
        })
        .catch(() => {})
    } catch {
      // no-op
    } finally {
      setRefreshing(false)
    }
  }, [user, selectedProjectSlug])

  useEffect(() => {
    if (user && !hasFetched.current) {
      hasFetched.current = true
      fetchAll()
    }
  }, [user, fetchAll])

  useEffect(() => {
    const handleRunsMutated = () => {
      void fetchAll()
    }
    window.addEventListener('runs:mutated', handleRunsMutated)
    return () => window.removeEventListener('runs:mutated', handleRunsMutated)
  }, [fetchAll])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(fetchAll, 30_000)
    return () => clearInterval(interval)
  }, [user, fetchAll])

  const pushTerminalLine = useCallback((line: Omit<TerminalLine, 'id' | 'ts'>, delay = 0) => {
    window.setTimeout(() => {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          ts: Date.now(),
          ...line,
        },
      ].slice(-120))
    }, delay)
  }, [])

  const triggerDispatchArc = useCallback((agentLabel: string, userTask: string, runId?: string) => {
    setRibbon({ agent: agentLabel, task: userTask, runId })
    setPendingFlash(true)
    setTerminalOpen(true)
    setTerminalLines([])

    window.setTimeout(() => setPendingFlash(false), 850)
    window.setTimeout(() => setRibbon(null), 4600)

    pushTerminalLine({ token: 'INIT', text: `Dispatch accepted for ${agentLabel}${runId ? ` (run ${runId.slice(0, 8)})` : ''}` }, 40)
    pushTerminalLine({ token: 'PLAN', text: `Routing task${selectedProjectSlug ? ` under project ${selectedProjectSlug}` : ''} and preparing execution graph` }, 340)
    pushTerminalLine({ token: 'ACTION', text: userTask }, 660)
    pushTerminalLine({ token: 'OBSERVE', text: runId ? `Run ${runId.slice(0, 8)} moved to running` : 'Awaiting backend run confirmation...' }, 980)

    window.setTimeout(() => {
      pushTerminalLine({ token: 'RESULT', text: 'Execution stream is live. Observability hooks attached.' })
    }, 1300)
  }, [pushTerminalLine, selectedProjectSlug])

  const handleDispatch = useCallback(async () => {
    if (!task.trim()) return
    setDispatching(true)

    const personaLabel = PERSONA_PRESETS.find((preset) => preset.key === persona)?.label ?? 'Auto'
    const targetAgent = agentId.trim() || personaLabel

    try {
      const response = await fetch('/api/openclaw-gateway/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: targetAgent,
          task,
          project_slug: selectedProjectSlug || undefined,
          context: { persona },
        }),
      })

      if (!response.ok) {
        triggerDispatchArc(targetAgent, task)
        pushTerminalLine({ token: 'ERROR', text: 'Gateway rejected dispatch request' })
      } else {
        const payload = await response.json()
        triggerDispatchArc(targetAgent, task, payload?.runId)
      }

      setTask('')
      setCommandExpanded(false)
      window.setTimeout(() => fetchAll(), 800)
    } catch {
      triggerDispatchArc(targetAgent, task)
      pushTerminalLine({ token: 'ERROR', text: 'Dispatch failed due to network or gateway error' })
    } finally {
      setDispatching(false)
    }
  }, [task, persona, agentId, selectedProjectSlug, triggerDispatchArc, pushTerminalLine, fetchAll])

  const mergedTerminalLines = useMemo(() => {
    const eventLines: TerminalLine[] = recentEvents.slice(0, 10).map((event, idx) => ({
      id: `evt-${event.id}`,
      token: event.type === 'error' ? 'ERROR' : idx % 2 === 0 ? 'OBSERVE' : 'ACTION',
      text: `${event.type}${event.source ? ` · ${event.source}` : ''}`,
      ts: new Date(event.timestamp).getTime(),
    }))
    return [...terminalLines, ...eventLines].sort((a, b) => a.ts - b.ts).slice(-90)
  }, [terminalLines, recentEvents])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={120}>
        <PageShell className="space-y-3 bg-gradient-to-b from-background to-muted/20 rounded-xl p-2">
          <PageHeader
            title="Execution Dashboard"
            subtitle="Mission control for operator + agent execution"
            primaryAction={
              <Button variant="outline" size="sm" onClick={() => fetchAll()} disabled={refreshing} className="h-8 gap-1.5">
                <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                Refresh
              </Button>
            }
          />

          {showStrategicBanner && (
            <div className="rounded-lg border border-zinc-300/70 bg-zinc-100/70 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Flag className="h-3.5 w-3.5" />
                  Strategic rule active: prioritize customer-facing execution over platform churn.
                </div>
                <button
                  onClick={() => setShowStrategicBanner(false)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  aria-label="Dismiss strategic rule"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border p-3 space-y-2 bg-card/70">
            <motion.div layoutId="dashboard-command" transition={SHARED_SPRING} className="rounded-xl border border-zinc-300/70 bg-card p-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-lg border bg-background px-2 py-2 border-l-2 border-l-[color:var(--foco-teal)]">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {PERSONA_PRESETS.map((preset) => (
                      <button
                        key={preset.key}
                        onClick={() => setPersona(preset.key)}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                          preset.key === persona
                            ? 'border-[color:var(--foco-teal)] bg-[color:var(--foco-teal)] text-white'
                            : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <Input
                    value={task}
                    onFocus={() => setCommandExpanded(true)}
                    onBlur={() => {
                      if (!task.trim()) setCommandExpanded(false)
                    }}
                    onChange={(event) => setTask(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void handleDispatch()
                      }
                    }}
                    placeholder="Dispatch a task to the critter fleet..."
                    className="h-8 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                  />

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs">
                        <Bot className="h-3.5 w-3.5" />
                        Agent
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 p-2">
                      <div className="space-y-1 max-h-56 overflow-auto">
                        {agents.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-2 py-1">No live agents discovered</p>
                        ) : (
                          agents.map((agent) => (
                            <button
                              key={agent.id}
                              onClick={() => setAgentId(agent.nativeId)}
                              className={cn(
                                'w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                                agentId === agent.nativeId ? 'border-[color:var(--foco-teal)] bg-muted/40' : 'border-transparent hover:border-border hover:bg-muted/30'
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium truncate">{agent.name}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0">{agent.status}</Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{agent.backend} · {agent.nativeId}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button onClick={() => void handleDispatch()} disabled={dispatching || !task.trim()} size="sm" className="h-8 gap-1.5">
                    {dispatching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send
                  </Button>
                </div>

                <AnimatePresence initial={false}>
                  {commandExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={SHARED_SPRING}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-2 md:grid-cols-[1fr_180px_180px]">
                        <div className="rounded-md border border-dashed border-border px-2 py-1.5 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">Context</span>
                          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                            <span className="rounded-full border px-2 py-0.5">{PERSONA_PRESETS.find((preset) => preset.key === persona)?.description}</span>
                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-500">live logs</span>
                          </div>
                        </div>

                        <select
                          className="h-8 rounded-md border bg-background px-2 text-xs"
                          value={selectedProjectSlug}
                          onChange={(event) => setSelectedProjectSlug(event.target.value)}
                        >
                          <option value="">Workspace default project</option>
                          {projectOptions.map((project) => (
                            <option key={project.id} value={project.slug}>{project.name}</option>
                          ))}
                        </select>

                        <div className="h-8 rounded-md border bg-background px-2 text-xs flex items-center justify-between">
                          <span className="text-muted-foreground">thinking</span>
                          <motion.span
                            animate={{ opacity: [0.25, 1, 0.25], x: [0, 3, 0] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                            className="font-mono"
                          >
                            ...
                          </motion.span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            <AnimatePresence>
              {ribbon && (
                <motion.div
                  key={`${ribbon.agent}-${ribbon.task}`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={SHARED_SPRING}
                  className="rounded-lg border-l-2 border-[color:var(--foco-teal)] bg-card/80 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-[color:var(--foco-teal)]" />
                    <span className="font-medium">Activity Ribbon</span>
                    <span className="text-muted-foreground">{ribbon.agent}</span>
                    {ribbon.runId && <Badge variant="outline" className="text-[10px]">{ribbon.runId.slice(0, 8)}</Badge>}
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground truncate">{ribbon.task}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-xl border p-2">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'Running', value: runningCount, icon: Activity },
                { label: 'Pending', value: pendingCount, icon: Clock3 },
                { label: 'Done', value: doneCount, icon: Workflow },
                { label: 'Blocked', value: fleetPaused ? 1 : 0, icon: ShieldCheck },
                { label: 'Failed', value: failedCount, icon: AlertCircle },
                { label: 'Stale', value: staleCount, icon: Gauge },
              ].map((stat) => (
                <Tooltip key={stat.label}>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ scaleX: 1.06 }}
                      transition={SHARED_SPRING}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1 text-xs',
                        stat.label === 'Pending' && pendingFlash && 'border-amber-400 bg-amber-400/20'
                      )}
                      onClick={() => {
                        if (stat.label === 'Running') router.push('/runs?status=running')
                        if (stat.label === 'Pending') router.push('/runs?status=pending')
                        if (stat.label === 'Done') router.push('/runs?status=completed')
                        if (stat.label === 'Failed') router.push('/runs?status=failed')
                      }}
                    >
                      <stat.icon className="h-3.5 w-3.5" />
                      <span>{stat.label}</span>
                      <span className="font-mono">{stat.value}</span>
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">{stat.label} agents or items</TooltipContent>
                </Tooltip>
              ))}

              <div className="ml-auto inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs">
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className={cn('h-2 w-2 rounded-full', fleetPaused ? 'bg-rose-500' : 'bg-emerald-500')}
                />
                Fleet {fleetPaused ? 'paused' : 'running'}
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card/80">
            <button
              type="button"
              onClick={() => setFleetExpanded((prev) => !prev)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left"
            >
              <Badge variant="outline" className="text-[10px]">AI Gateway · {gatewayStatus}</Badge>
              <Badge variant="outline" className="text-[10px]">Workload · {activeRuns.length} active</Badge>
              <Badge variant="outline" className="text-[10px]">Errors · {failedCount}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">Fleet status</span>
              {fleetExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <AnimatePresence initial={false}>
              {fleetExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SHARED_SPRING}
                  className="overflow-hidden"
                >
                  <div className="grid gap-2 border-t p-3 md:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">System Health</p>
                      <p className="mt-2 text-sm font-medium">Gateway: {gatewayStatus}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Auth: {tokenValid ? 'Valid' : tokenValid === null ? 'Checking...' : 'Invalid'} · Sessions: {attachedTabs}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Workload</p>
                      <p className="mt-2 text-sm font-medium">{runningCount} agents executing</p>
                      <p className="mt-1 text-xs text-muted-foreground">{pendingCount} pending · {failedCount} failed</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Performance</p>
                      <p className="mt-2 text-sm font-medium">Auto improvements: {autonomousStats.improvementsWeek}</p>
                      <p className="mt-1 text-xs text-muted-foreground">G1 alignment: {g1Share === null ? '—' : `${g1Share}%`}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid gap-2 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <div className="rounded-xl border bg-card">
                <div className="px-3 py-2 border-b">
                  <h3 className="text-sm font-semibold">Active Runs</h3>
                </div>
                <div className="p-3">
                  {activeRuns.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-center">
                      <svg viewBox="0 0 120 32" className="mx-auto h-10 w-40 opacity-70">
                        <motion.path
                          d="M2 16h20l6-8 8 16 8-16 8 16 8-8h34"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-zinc-500"
                          animate={{ pathLength: [0.2, 1, 0.2], opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 2.4 }}
                        />
                      </svg>
                      <p className="mt-1 text-xs text-muted-foreground">No active runs</p>
                    </div>
                  ) : (
                    <motion.div layout className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {activeRuns.map((run) => (
                          <motion.div
                            key={run.id}
                            layout
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={SHARED_SPRING}
                            className={cn('rounded-md border-l-4 border bg-card px-3 py-2', statusAccent(run.status))}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{run.runner || 'agent'}</span>
                              <Badge variant="outline" className="text-[10px]">{run.status}</Badge>
                              <span className="ml-auto text-[10px] text-muted-foreground"><ElapsedTimer since={run.started_at || run.created_at || null} /></span>
                            </div>
                            {(run.summary || run.task_id) && <p className="mt-1 text-xs text-muted-foreground truncate">{run.summary || run.task_id}</p>}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            <div className="xl:col-span-7">
              <div className="rounded-xl border bg-card">
                <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Terminal className="h-4 w-4" />Output Terminal</h3>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTerminalOpen((prev) => !prev)}>
                    {terminalOpen ? 'Collapse' : 'Open'}
                  </Button>
                </div>
                <AnimatePresence initial={false}>
                  {terminalOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={SHARED_SPRING}
                      className="overflow-hidden"
                    >
                      <div className="p-3">
                        <div className="rounded-md border bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
                          <div
                            className="space-y-1 max-h-[320px] overflow-auto"
                            style={{
                              backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)',
                            }}
                          >
                            {mergedTerminalLines.length === 0 ? (
                              <p className="text-zinc-500">Awaiting output stream...</p>
                            ) : (
                              <AnimatePresence initial={false}>
                                {mergedTerminalLines.map((line, index) => (
                                  <motion.div
                                    key={line.id}
                                    initial={{ x: -8, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.25) }}
                                    className="whitespace-pre-wrap break-words"
                                  >
                                    <span className={cn('mr-2', tokenClass(line.token))}>[{line.token}]</span>
                                    <span>{line.text}</span>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            )}
                            <div className="mt-1 text-zinc-500">
                              <span className="mr-2 text-emerald-400">[LIVE]</span>
                              <span className="animate-pulse">▋</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card">
            <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Recent Events</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push('/ledger')}>View all</Button>
            </div>
            <div className="p-3">
              {recentEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No recent events.</p>
              ) : (
                <div className="space-y-1">
                  <AnimatePresence initial={false}>
                    {recentEvents.slice(0, 14).map((event) => (
                      <motion.button
                        key={event.id}
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        transition={SHARED_SPRING}
                        onClick={() => setSelectedEvent(event)}
                        className="w-full rounded-md border px-2 py-1.5 text-left hover:bg-muted/40"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-mono text-[10px] uppercase',
                              event.type === 'policy' && 'border-fuchsia-500/40 text-fuchsia-500',
                              event.type === 'clawdbot' && 'border-cyan-500/40 text-cyan-500',
                              event.type === 'error' && 'border-rose-500/40 text-rose-500'
                            )}
                          >
                            {event.type}
                          </Badge>
                          <span className="truncate font-mono text-xs">{event.source || event.type}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground">{relativeTime(event.timestamp)}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          <ErrorBoundary fallback={() => null}>
            <AIInsights userId={user.id} className="mb-1" runs={allRuns} recentEvents={recentEvents} />
          </ErrorBoundary>

          <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Event Replay
                </SheetTitle>
                <SheetDescription>
                  {selectedEvent?.type} · {selectedEvent ? relativeTime(selectedEvent.timestamp) : ''}
                </SheetDescription>
              </SheetHeader>

              {selectedEvent && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-md border p-3">
                    <p className="text-sm font-medium">{selectedEvent.type}</p>
                    {selectedEvent.source && <p className="mt-1 text-xs text-muted-foreground">{selectedEvent.source}</p>}
                  </div>

                  <div className="rounded-md border bg-zinc-950 p-3 font-mono text-xs text-zinc-200">
                    <div className="text-[#22d3ee]">[INIT]  ingest event {selectedEvent.id.slice(0, 8)}</div>
                    <div className="text-[#60a5fa] mt-1">[OBSERVE] type={selectedEvent.type} source={selectedEvent.source || 'system'}</div>
                    <div className="text-[#fbbf24] mt-1">[ACTION] derive routing and policy annotations</div>
                    <div className="text-[#34d399] mt-1">[RESULT] event ready for operator decision</div>
                  </div>

                  <details className="rounded-md border p-3">
                    <summary className="cursor-pointer text-xs font-medium">Raw payload</summary>
                    <pre className="mt-2 max-h-[320px] overflow-auto rounded bg-muted p-2 text-[10px]">{JSON.stringify(selectedEvent.payload ?? {}, null, 2)}</pre>
                  </details>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </PageShell>
      </TooltipProvider>
    </ErrorBoundary>
  )
}
