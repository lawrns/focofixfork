'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DiagramContainer } from '@/components/command-center/diagram/diagram-container'
import { NightAutonomyCard } from '@/components/command-center/orchestrator/night-autonomy-card'
import { AgentDetailSheet } from '@/components/command-center/panels/agent-detail-sheet'
import { CreateMissionDialog } from '@/components/command-center/dialogs/create-mission-dialog'
import { AgentTable } from '@/components/command-center/tables/agent-table'
import { MissionTable } from '@/components/command-center/tables/mission-table'
import { RunsTable } from '@/components/command-center/tables/runs-table'
import { MobileCommandView } from '@/components/command-center/mobile/mobile-command-view'
import { useOpenClawLogs } from '@/lib/hooks/use-openclaw-logs'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import type { UnifiedAgent } from '@/lib/command-center/types'
import type { Run } from '@/lib/types/runs'
import {
  RefreshCw,
  Plus,
  Cpu,
  AlertCircle,
  Pause,
  Play,
  Send,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Activity,
  Clock3,
  Radio,
  Bot,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Gauge,
  Workflow,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ServiceStatus {
  name: string
  status: 'up' | 'down' | 'degraded'
  latencyMs?: number
  detail?: string
  url: string
}

interface CoFounderInsightItem {
  id: string
  eventType: string
  severity: string
  title: string
  detail?: string | null
  createdAt: string
  payload?: Record<string, unknown>
}

interface RibbonState {
  agent: string
  task: string
  runId?: string
}

interface TerminalLine {
  id: string
  token: 'INIT' | 'PLAN' | 'ACTION' | 'OBSERVE' | 'RESULT' | 'ERROR'
  text: string
  ts: number
}

interface ProjectOption {
  id: string
  slug: string
  name: string
}

interface ClawdbotActivityItem {
  id: string
  agent_key: string
  event_type: string
  direction: string
  session_key?: string | null
  title: string
  detail: string | null
  payload?: Record<string, unknown>
  project_id?: string | null
  created_at: string
}

const AGENT_POLL_INTERVAL = 10_000
const DECISIONS_POLL_INTERVAL = 15_000
const COFOUNDER_POLL_INTERVAL = 20_000
const CLAWDBOT_ACTIVITY_POLL_INTERVAL = 8_000
const RUNS_POLL_INTERVAL = 15_000
const SHARED_SPRING = { type: 'spring', stiffness: 300, damping: 30 }

const PERSONA_PRESETS: Array<{ key: 'cto' | 'coo' | 'auto' | 'intake'; label: string; description: string }> = [
  { key: 'cto', label: 'CTO', description: 'Architecture and systems decisions' },
  { key: 'coo', label: 'COO', description: 'Operations and execution flow' },
  { key: 'auto', label: 'Auto', description: 'Automatic best-agent routing' },
  { key: 'intake', label: 'Intake', description: 'Task intake and triage' },
]

function inferSoapToken(message: string): TerminalLine['token'] {
  const lower = message.toLowerCase()
  if (lower.includes('error') || lower.includes('failed') || lower.includes('denied')) return 'ERROR'
  if (lower.includes('plan') || lower.includes('route')) return 'PLAN'
  if (lower.includes('observ') || lower.includes('heartbeat')) return 'OBSERVE'
  if (lower.includes('result') || lower.includes('done') || lower.includes('completed')) return 'RESULT'
  if (lower.includes('init') || lower.includes('dispatch')) return 'INIT'
  return 'ACTION'
}

function tokenClass(token: TerminalLine['token']): string {
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

export function CommandCenterClient() {
  const store = useCommandCenterStore()
  const searchParams = useSearchParams()
  const { logs, connected } = useOpenClawLogs(200)

  const agentParamHandled = useRef(false)
  const [missionDialogOpen, setMissionDialogOpen] = useState(false)
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [healthLoading, setHealthLoading] = useState(true)
  const [globalSearch, setGlobalSearch] = useState('')
  const [cofounderInsights, setCofounderInsights] = useState<CoFounderInsightItem[]>([])
  const [cofounderLoading, setCofounderLoading] = useState(true)
  const [clawdbotActivity, setClawdbotActivity] = useState<ClawdbotActivityItem[]>([])
  const [clawdbotActivityLoading, setClawdbotActivityLoading] = useState(true)

  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [selectedProjectSlug, setSelectedProjectSlug] = useState('')
  const [dispatchKind, setDispatchKind] = useState<'task' | 'report'>('task')
  const [commandExpanded, setCommandExpanded] = useState(false)
  const [persona, setPersona] = useState<'cto' | 'coo' | 'auto' | 'intake'>('auto')
  const [agentId, setAgentId] = useState(process.env.EMPIRE_EXECUTION_MODEL || '')
  const [task, setTask] = useState('')
  const [dispatching, setDispatching] = useState(false)
  const [ribbon, setRibbon] = useState<RibbonState | null>(null)
  const [pendingFlash, setPendingFlash] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([])
  const [activeRuns, setActiveRuns] = useState<Run[]>([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [fleetExpanded, setFleetExpanded] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CoFounderInsightItem | null>(null)

  const { setAgents, setMissions, setError, setDecisions, approveDecision } = store

  const fetchAgents = useCallback(async (signal?: AbortSignal) => {
    try {
      const [agentRes, missionRes] = await Promise.allSettled([
        fetch('/api/command-center/agents', { signal }),
        fetch('/api/command-center/missions', { signal }),
      ])

      if (agentRes.status === 'fulfilled' && agentRes.value.ok) {
        const json = await agentRes.value.json()
        setAgents(json.agents ?? [])
        if (json.errors?.length) setError(json.errors.join('; '))
        else setError(null)
      }

      if (missionRes.status === 'fulfilled' && missionRes.value.ok) {
        const json = await missionRes.value.json()
        setMissions(json.missions ?? [])
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Failed to fetch agent data')
    }
  }, [setAgents, setMissions, setError])

  const fetchDecisions = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/command-center/decisions', { signal })
      if (res.ok) {
        const json = await res.json()
        setDecisions(json.decisions ?? [])
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }, [setDecisions])

  const fetchRuns = useCallback(async (signal?: AbortSignal) => {
    setRunsLoading(true)
    try {
      const res = await fetch('/api/runs?limit=20', { signal })
      if (!res.ok) return
      const json = await res.json()
      const runs = (json.data ?? []) as Run[]
      setActiveRuns(runs.filter((run) => ['running', 'pending', 'active'].includes(run.status)).slice(0, 8))
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    } finally {
      setRunsLoading(false)
    }
  }, [])

  const loadCofounderInsights = useCallback(async (signal?: AbortSignal, initialLoad = false) => {
    if (initialLoad) setCofounderLoading(true)
    try {
      const feedRes = await fetch('/api/cofounder/insights/feed?window=24h&limit=80', { signal })
      if (!feedRes.ok) return
      const feedJson = await feedRes.json()
      const items = (feedJson?.data?.items ?? []) as CoFounderInsightItem[]
      setCofounderInsights(items)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    } finally {
      if (initialLoad) setCofounderLoading(false)
    }
  }, [])

  const loadClawdbotActivity = useCallback(async (signal?: AbortSignal, initialLoad = false) => {
    if (initialLoad) setClawdbotActivityLoading(true)
    try {
      const params = new URLSearchParams({ limit: '16' })
      const res = await fetch(`/api/agents/clawdbot/activity?${params.toString()}`, { signal })
      if (!res.ok) return
      const json = await res.json()
      setClawdbotActivity((json?.data?.items ?? []) as ClawdbotActivityItem[])
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    } finally {
      if (initialLoad) setClawdbotActivityLoading(false)
    }
  }, [])

  useEffect(() => {
    if (store.paused) return
    const controller = new AbortController()
    fetchAgents(controller.signal)
    const id = setInterval(() => fetchAgents(controller.signal), AGENT_POLL_INTERVAL)
    return () => { controller.abort(); clearInterval(id) }
  }, [fetchAgents, store.paused])

  useEffect(() => {
    if (store.paused) return
    const controller = new AbortController()
    fetchDecisions(controller.signal)
    const id = setInterval(() => fetchDecisions(controller.signal), DECISIONS_POLL_INTERVAL)
    return () => { controller.abort(); clearInterval(id) }
  }, [fetchDecisions, store.paused])

  useEffect(() => {
    if (store.paused) return
    const controller = new AbortController()
    fetchRuns(controller.signal)
    const id = setInterval(() => fetchRuns(controller.signal), RUNS_POLL_INTERVAL)
    return () => { controller.abort(); clearInterval(id) }
  }, [fetchRuns, store.paused])

  useEffect(() => {
    const controller = new AbortController()
    loadCofounderInsights(controller.signal, true)
    const id = setInterval(() => loadCofounderInsights(controller.signal), COFOUNDER_POLL_INTERVAL)
    return () => {
      controller.abort()
      clearInterval(id)
    }
  }, [loadCofounderInsights])

  useEffect(() => {
    const controller = new AbortController()
    loadClawdbotActivity(controller.signal, true)
    const id = setInterval(() => loadClawdbotActivity(controller.signal), CLAWDBOT_ACTIVITY_POLL_INTERVAL)
    return () => {
      controller.abort()
      clearInterval(id)
    }
  }, [loadClawdbotActivity])

  useEffect(() => {
    const load = async () => {
      setHealthLoading(true)
      try {
        const res = await fetch('/api/empire/health')
        if (res.ok) {
          const json = await res.json()
          setServices(json.services ?? [])
        }
      } finally {
        setHealthLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetch('/api/projects?limit=50')
        if (!res.ok) return
        const json = await res.json()
        const projects = (json?.data?.projects ?? []) as Array<{ id: string; slug: string; name: string }>
        setProjectOptions(projects)
        if (!selectedProjectSlug && projects[0]?.slug) {
          setSelectedProjectSlug(projects[0].slug)
        }
      } catch {
        // noop
      }
    }
    loadProjects()
  }, [selectedProjectSlug])

  useEffect(() => {
    if (agentParamHandled.current) return
    const agentParam = searchParams?.get('agent')
    if (!agentParam || store.agents.length === 0) return
    const match = store.agents.find((a) => a.id === agentParam || a.nativeId === agentParam)
    if (match) {
      setAgentId(match.nativeId)
      agentParamHandled.current = true
    }
  }, [searchParams, store.agents])

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

  const streamCommandSurfaceJob = useCallback(async (streamUrl: string) => {
    const streamRes = await fetch(streamUrl, {
      headers: { Accept: 'text/event-stream' },
    })
    if (!streamRes.ok || !streamRes.body) throw new Error('Failed to connect to command stream')

    const reader = streamRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6)) as Record<string, unknown>
          if (event.type === 'status_update' && typeof event.message === 'string') {
            pushTerminalLine({ token: inferSoapToken(event.message), text: event.message })
          } else if (event.type === 'reasoning' && typeof event.text === 'string') {
            pushTerminalLine({ token: 'PLAN', text: event.text })
          } else if (event.type === 'output_chunk' && typeof event.text === 'string') {
            pushTerminalLine({ token: 'RESULT', text: event.text })
          } else if (event.type === 'error' && typeof event.message === 'string') {
            pushTerminalLine({ token: 'ERROR', text: event.message })
          } else if (event.type === 'done' && typeof event.summary === 'string') {
            pushTerminalLine({ token: 'RESULT', text: event.summary })
          }
        } catch {
          // ignore malformed stream chunks
        }
      }
    }
  }, [pushTerminalLine])

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

    if (runId) {
      pushTerminalLine({ token: 'OBSERVE', text: `Run ${runId.slice(0, 8)} moved to running` }, 980)
    } else {
      pushTerminalLine({ token: 'OBSERVE', text: 'Awaiting backend run confirmation...' }, 980)
    }

    setActiveRuns((prev) => {
      const synthetic: Run = {
        id: runId || `local-${Date.now()}`,
        runner: agentLabel,
        status: 'pending',
        task_id: null,
        created_at: new Date().toISOString(),
        started_at: null,
        ended_at: null,
        summary: userTask,
      }
      return [synthetic, ...prev].slice(0, 8)
    })

    window.setTimeout(() => {
      setActiveRuns((prev) => prev.map((run) =>
        run.id === (runId || prev[0]?.id)
          ? { ...run, status: 'running' as Run['status'], started_at: new Date().toISOString() }
          : run
      ))
      pushTerminalLine({ token: 'RESULT', text: 'Execution stream is live. Observability hooks attached.' })
    }, 1300)
  }, [pushTerminalLine, selectedProjectSlug])

  const handleDispatch = useCallback(async () => {
    if (!task.trim()) return
    setDispatching(true)

    const personaLabel = PERSONA_PRESETS.find((preset) => preset.key === persona)?.label ?? 'Auto'
    const targetAgent = agentId.trim() || personaLabel
    const selectedProject = projectOptions.find((project) => project.slug === selectedProjectSlug) ?? null

    try {
      if (dispatchKind === 'report') {
        if (!selectedProject) {
          pushTerminalLine({ token: 'ERROR', text: 'Select a project before generating a report.' })
          return
        }

        const reportPrompt = `${task.trim()}\n\nFocus on codebase health, project direction, risks, next steps, and how to steer this project toward well-being.`
        triggerDispatchArc(targetAgent, reportPrompt)
        pushTerminalLine({ token: 'PLAN', text: `Report mode active for ${selectedProject.name}` })

        const res = await fetch('/api/command-surface/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: reportPrompt,
            mode: persona,
            project_id: selectedProject.id,
            planning_goal: `Generate a durable project steering report for ${selectedProject.name}`,
            context: {
              dispatch_kind: 'project_report',
              selected_agent_id: targetAgent,
              selected_agent_name: targetAgent,
              project_slug: selectedProject.slug,
            },
            report_request: {
              enabled: true,
              report_type: 'project_health',
              project_id: selectedProject.id,
              selected_agent_id: targetAgent,
              selected_agent_name: targetAgent,
            },
          }),
        })

        const payload = await res.json()
        if (!res.ok || !payload?.stream_url) {
          pushTerminalLine({ token: 'ERROR', text: payload?.error ?? 'Report dispatch failed' })
        } else {
          await streamCommandSurfaceJob(payload.stream_url as string)
        }
      } else {
        const res = await fetch('/api/openclaw-gateway/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: targetAgent,
            task,
            project_slug: selectedProjectSlug || undefined,
            context: { persona },
          }),
        })

        if (!res.ok) {
          triggerDispatchArc(targetAgent, task)
          pushTerminalLine({ token: 'ERROR', text: 'Gateway rejected dispatch request' })
        } else {
          const data = await res.json()
          triggerDispatchArc(targetAgent, task, data?.runId)
        }
      }

      setTask('')
      setCommandExpanded(false)
    } catch {
      triggerDispatchArc(targetAgent, task)
      pushTerminalLine({ token: 'ERROR', text: 'Dispatch failed due to network or gateway error' })
    } finally {
      setDispatching(false)
    }
  }, [task, persona, agentId, selectedProjectSlug, triggerDispatchArc, pushTerminalLine, dispatchKind, projectOptions, streamCommandSurfaceJob])

  const staleCount = store.agents.filter((agent) => {
    if (agent.status !== 'working' || !agent.lastActiveAt) return false
    return Date.now() - new Date(agent.lastActiveAt).getTime() > 30 * 60 * 1000
  }).length

  const runningCount = store.agents.filter((agent) => agent.status === 'working').length
  const doneCount = store.agents.filter((agent) => agent.status === 'done').length
  const failedCount = store.agents.filter((agent) => agent.status === 'error').length
  const blockedCount = store.agents.filter((agent) => agent.status === 'blocked').length
  const pendingCount = store.decisions.length

  const avgLatency = useMemo(() => {
    const latencies = services.map((service) => service.latencyMs).filter((value): value is number => typeof value === 'number')
    if (latencies.length === 0) return null
    return Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
  }, [services])

  const gatewayStatus = useMemo(() => {
    const relay = services.find((service) => /gateway|openclaw|relay/i.test(service.name))
    if (!relay) return 'Unknown'
    return relay.status === 'up' ? 'Reachable' : relay.status === 'degraded' ? 'Degraded' : 'Offline'
  }, [services])

  const filteredInsights = cofounderInsights.filter((item) => {
    if (!globalSearch) return true
    const q = globalSearch.toLowerCase()
    return item.title.toLowerCase().includes(q) || (item.detail ?? '').toLowerCase().includes(q)
  })

  const mergedTerminalLines = useMemo(() => {
    const fromLogs: TerminalLine[] = logs.slice(-20).map((entry, idx) => ({
      id: `log-${idx}-${entry.time ?? idx}`,
      token: inferSoapToken(entry.message ?? ''),
      text: entry.message ?? JSON.stringify(entry),
      ts: entry.time ? new Date(entry.time).getTime() : Date.now() - (20 - idx),
    }))
    return [...terminalLines, ...fromLogs].sort((a, b) => a.ts - b.ts).slice(-90)
  }, [logs, terminalLines])

  return (
    <TooltipProvider delayDuration={120}>
      <PageShell className="space-y-3">
        <PageHeader
          title="Critter Mission Control"
          subtitle="Dense command-and-observe surface for live agent operations"
          primaryAction={
            <div className="flex items-center gap-2">
              {store.error && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{store.error}</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAgents()}
                disabled={store.isLoading}
                className="h-8 gap-1.5"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', store.isLoading && 'animate-spin')} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setMissionDialogOpen(true)} className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Mission
              </Button>
            </div>
          }
        />

        <div className="rounded-lg border border-zinc-300/70 bg-zinc-100/70 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200">
          Strategic rule active: dispatches favor observable execution and guarded transitions.
        </div>

        <div className="bg-gradient-to-b from-background to-muted/20 rounded-xl border p-3 space-y-2">
          <motion.div layoutId="command-surface" transition={SHARED_SPRING} className="rounded-xl border border-zinc-300/70 bg-card p-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-lg border bg-background px-2 py-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {(['task', 'report'] as const).map((kind) => (
                    <button
                      key={kind}
                      onClick={() => setDispatchKind(kind)}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                        kind === dispatchKind
                          ? 'border-cyan-500 bg-cyan-500 text-white'
                          : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {kind === 'task' ? 'Task' : 'Report'}
                    </button>
                  ))}
                  {PERSONA_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => setPersona(preset.key)}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                        preset.key === persona
                          ? 'border-[color:var(--foco-teal)] bg-[color:var(--foco-teal)] text-white'
                          : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground',
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
                  onChange={(e) => setTask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleDispatch()
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
                      {store.agents.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-2 py-1">No live agents discovered</p>
                      ) : (
                        store.agents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => setAgentId(agent.nativeId)}
                            className={cn(
                              'w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                              agentId === agent.nativeId ? 'border-[color:var(--foco-teal)] bg-muted/40' : 'border-transparent hover:border-border hover:bg-muted/30',
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

                <Button onClick={handleDispatch} disabled={dispatching || !task.trim()} size="sm" className="h-8 gap-1.5">
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
                          <span className="rounded-full border px-2 py-0.5">{dispatchKind === 'report' ? 'durable report artifact' : 'live task dispatch'}</span>
                          {connected && <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-500">live logs</span>}
                        </div>
                      </div>

                      <select
                        className="h-8 rounded-md border bg-background px-2 text-xs"
                        value={selectedProjectSlug}
                        onChange={(e) => setSelectedProjectSlug(e.target.value)}
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

        <ExecutionStatBar
          running={runningCount}
          pending={pendingCount}
          done={doneCount}
          blocked={blockedCount}
          failed={failedCount}
          stale={staleCount}
          paused={store.paused}
          flashPending={pendingFlash}
        />

        <FleetStatusPanel
          expanded={fleetExpanded}
          onToggle={() => setFleetExpanded((prev) => !prev)}
          services={services}
          loading={healthLoading}
          gatewayStatus={gatewayStatus}
          running={runningCount}
          failed={failedCount}
          avgLatency={avgLatency}
        />

        <div className="grid gap-2 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <ActiveRunsBoard runs={activeRuns} loading={runsLoading} />
          </div>
          <div className="xl:col-span-7">
            <SoapTerminal lines={mergedTerminalLines} open={terminalOpen} onOpenChange={setTerminalOpen} connected={connected} />
          </div>
        </div>

        <ClawdbotActivityFeed events={clawdbotActivity} loading={clawdbotActivityLoading} />

        <LiveTickerFeed
          loading={cofounderLoading}
          events={filteredInsights}
          onOpenEvent={(event) => setSelectedEvent(event)}
        />

        <div className="hidden md:block rounded-xl border overflow-hidden bg-card/80" style={{ minHeight: '220px' }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Swarm topology</span>
          </div>
          <DiagramContainer className="min-h-[180px]" />
        </div>

        <div className="md:hidden">
          <MobileCommandView />
        </div>

        <Tabs defaultValue={searchParams?.get('tab') ?? 'agents'}>
          <TabsList>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="missions">Missions</TabsTrigger>
            <TabsTrigger value="morning">Morning</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-3">
            <AgentTable />
          </TabsContent>

          <TabsContent value="missions" className="mt-3">
            <MissionTable />
          </TabsContent>

          <TabsContent value="morning" className="mt-3">
            <NightAutonomyCard />
          </TabsContent>

          <TabsContent value="runs" className="mt-3">
            <RunsTable />
          </TabsContent>
        </Tabs>

        <AgentDetailSheet />
        <CreateMissionDialog open={missionDialogOpen} onClose={() => setMissionDialogOpen(false)} />

        <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Event Replay
              </SheetTitle>
              <SheetDescription>
                {selectedEvent?.eventType} · {selectedEvent ? relativeTime(selectedEvent.createdAt) : ''}
              </SheetDescription>
            </SheetHeader>

            {selectedEvent && (
              <div className="mt-4 space-y-3">
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium">{selectedEvent.title}</p>
                  {selectedEvent.detail && <p className="mt-1 text-xs text-muted-foreground">{selectedEvent.detail}</p>}
                </div>

                <div className="rounded-md border bg-zinc-950 p-3 font-mono text-xs text-zinc-200">
                  <div className="text-[#22d3ee]">[INIT]  ingest event {selectedEvent.id.slice(0, 8)}</div>
                  <div className="text-[#60a5fa] mt-1">[OBSERVE] type={selectedEvent.eventType} severity={selectedEvent.severity}</div>
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
  )
}

function ExecutionStatBar({
  running,
  pending,
  done,
  blocked,
  failed,
  stale,
  paused,
  flashPending,
}: {
  running: number
  pending: number
  done: number
  blocked: number
  failed: number
  stale: number
  paused: boolean
  flashPending: boolean
}) {
  const stats = [
    { label: 'Running', value: running, icon: Activity },
    { label: 'Pending', value: pending, icon: Clock3 },
    { label: 'Done', value: done, icon: Workflow },
    { label: 'Blocked', value: blocked, icon: ShieldCheck },
    { label: 'Failed', value: failed, icon: AlertCircle },
    { label: 'Stale', value: stale, icon: Gauge },
  ]

  return (
    <div className="rounded-xl border p-2">
      <div className="flex flex-wrap items-center gap-2">
        {stats.map((stat) => (
          <Tooltip key={stat.label}>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scaleX: 1.06 }}
                transition={SHARED_SPRING}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1 text-xs',
                  stat.label === 'Pending' && flashPending && 'border-amber-400 bg-amber-400/20',
                )}
              >
                <stat.icon className="h-3.5 w-3.5" />
                <span>{stat.label}</span>
                <span className="font-mono">{stat.value}</span>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{stat.label} agents or items</TooltipContent>
          </Tooltip>
        ))}

        <div className="ml-auto inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className={cn('h-2 w-2 rounded-full', paused ? 'bg-rose-500' : 'bg-emerald-500')}
          />
          Fleet {paused ? 'paused' : 'running'}
        </div>
      </div>
    </div>
  )
}

function FleetStatusPanel({
  expanded,
  onToggle,
  services,
  loading,
  gatewayStatus,
  running,
  failed,
  avgLatency,
}: {
  expanded: boolean
  onToggle: () => void
  services: ServiceStatus[]
  loading: boolean
  gatewayStatus: string
  running: number
  failed: number
  avgLatency: number | null
}) {
  return (
    <div className="rounded-xl border bg-card/80">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <Badge variant="outline" className="text-[10px]">AI Gateway · {loading ? 'Checking...' : gatewayStatus}</Badge>
        <Badge variant="outline" className="text-[10px]">Workload · {running} active</Badge>
        <Badge variant="outline" className="text-[10px]">Errors · {failed}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">Fleet status</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
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
                <p className="mt-2 text-sm font-medium">Gateway: {loading ? 'checking' : gatewayStatus}</p>
                <p className="mt-1 text-xs text-muted-foreground">{services.filter((service) => service.status === 'up').length}/{services.length} services healthy</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Workload</p>
                <p className="mt-2 text-sm font-medium">{running} agents executing</p>
                <p className="mt-1 text-xs text-muted-foreground">{failed} in error state</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Performance</p>
                <p className="mt-2 text-sm font-medium">{avgLatency === null ? 'n/a' : `${avgLatency} ms avg`}</p>
                <p className="mt-1 text-xs text-muted-foreground">Latency from integrated health probes</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ActiveRunsBoard({ runs, loading }: { runs: Run[]; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Active Runs</CardTitle></CardHeader>
        <CardContent className="py-6 text-sm text-muted-foreground">Loading runs...</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="py-3"><CardTitle className="text-sm">Active Runs</CardTitle></CardHeader>
      <CardContent className="pt-0">
        {runs.length === 0 ? (
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
              {runs.map((run) => (
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
                    <span className="font-mono text-xs">{run.runner}</span>
                    <Badge variant="outline" className="text-[10px]">{run.status}</Badge>
                    <span className="ml-auto text-[10px] text-muted-foreground"><ElapsedTimer since={run.started_at || run.created_at} /></span>
                  </div>
                  {run.summary && <p className="mt-1 text-xs text-muted-foreground truncate">{run.summary}</p>}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
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

function SoapTerminal({
  lines,
  open,
  onOpenChange,
  connected,
}: {
  lines: TerminalLine[]
  open: boolean
  onOpenChange: (open: boolean) => void
  connected: boolean
}) {
  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2"><Terminal className="h-4 w-4" />Output Terminal</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(!open)}>
            {open ? 'Collapse' : 'Open'}
          </Button>
        </div>
      </CardHeader>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SHARED_SPRING}
            className="overflow-hidden"
          >
            <CardContent className="pt-0">
              <div className="rounded-md border bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
                <div
                  className="space-y-1 max-h-[340px] overflow-auto"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)',
                  }}
                >
                  {lines.length === 0 ? (
                    <p className="text-zinc-500">Awaiting output stream...</p>
                  ) : (
                    <AnimatePresence initial={false}>
                      {lines.map((line, index) => (
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
                    <span className={cn('mr-2', connected ? 'text-emerald-400' : 'text-rose-400')}>{connected ? '[LIVE]' : '[OFF]'}</span>
                    <span className="animate-pulse">▋</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function LiveTickerFeed({
  loading,
  events,
  onOpenEvent,
}: {
  loading: boolean
  events: CoFounderInsightItem[]
  onOpenEvent: (event: CoFounderInsightItem) => void
}) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Recent Events</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recent events.</p>
        ) : (
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {events.slice(0, 14).map((event) => (
                <motion.button
                  key={event.id}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={SHARED_SPRING}
                  onClick={() => onOpenEvent(event)}
                  className="w-full rounded-md border px-2 py-1.5 text-left hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'font-mono text-[10px] uppercase',
                        event.eventType === 'policy' && 'border-fuchsia-500/40 text-fuchsia-500',
                        event.eventType === 'clawdbot' && 'border-cyan-500/40 text-cyan-500',
                        event.severity === 'error' && 'border-rose-500/40 text-rose-500',
                      )}
                    >
                      {event.eventType}
                    </Badge>
                    <span className="truncate font-mono text-xs">{event.title}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{relativeTime(event.createdAt)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ClawdbotActivityFeed({
  events,
  loading,
}: {
  events: ClawdbotActivityItem[]
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Clawdbot Live Feed</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading live bridge events...</p>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No live bridge activity yet.</p>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 8).map((event) => {
              const model = typeof event.payload?.model_preference === 'string'
                ? event.payload.model_preference
                : typeof event.payload?.model === 'string'
                  ? event.payload.model
                  : null

              return (
                <div key={event.id} className="rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-cyan-500/40 text-cyan-500">
                      {event.event_type}
                    </Badge>
                    <span className="font-mono text-xs">{event.agent_key}</span>
                    <span className="text-[10px] text-muted-foreground">{relativeTime(event.created_at)}</span>
                    {model && <Badge variant="outline" className="ml-auto text-[10px]">{model}</Badge>}
                  </div>
                  <p className="mt-1 text-xs font-medium">{event.title}</p>
                  {event.detail && <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>}
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{event.direction}</span>
                    {event.project_id && <span className="font-mono">project:{event.project_id.slice(0, 8)}</span>}
                    {typeof event.session_key === 'string' && <span className="font-mono">session:{event.session_key}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
