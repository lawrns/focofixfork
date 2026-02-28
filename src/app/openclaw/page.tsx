'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Wifi, WifiOff, RefreshCw, CircleDot, Unplug, Globe,
  Terminal, Shield, AlertTriangle, Wrench, CheckCircle2, XCircle,
  Play, Square, ScrollText, Zap, Send, Bot, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useSwarm } from '@/components/critter/swarm-context'

interface TabRecord {
  id: string
  title: string
  url: string
  attached: boolean
  profile?: string
  last_seen?: string
}

interface OpenClawStatus {
  relay: { reachable: boolean; url: string; port: number }
  token: { configured: boolean; valid: boolean }
  profiles: Array<{ name: string; active: boolean }>
  tabs: TabRecord[]
}

interface TaskRun {
  runId: string
  agentId: string
  correlationId: string
  status: 'accepted' | 'running' | 'completed' | 'failed'
  task: string
  startedAt: Date
}

interface LogEntry {
  type: string
  time?: string
  level?: string
  message?: string
  runId?: string
  [key: string]: unknown
}

const POLL_INTERVAL = 5_000

export default function OpenClawPage() {
  const [status, setStatus] = useState<OpenClawStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Task runner state
  const [agentId, setAgentId] = useState('kimi-coding/k2p5')
  const [task, setTask] = useState('')
  const [creating, setCreating] = useState(false)
  const [runs, setRuns] = useState<TaskRun[]>([])
  
  // Log stream state
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [streamConnected, setStreamConnected] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  
  const { dispatchSwarm } = useSwarm()

  // Fetch status
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/status')
      if (res.ok) {
        const json = await res.json()
        setStatus(json)
        setLastUpdated(new Date())
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [refresh])

  // SSE Log Stream
  useEffect(() => {
    const eventSource = new EventSource('/api/openclaw-gateway/logs')
    
    eventSource.onopen = () => {
      setStreamConnected(true)
    }
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setLogs(prev => [...prev.slice(-500), data]) // Keep last 500 logs
      } catch {
        // Ignore parse errors
      }
    }
    
    eventSource.onerror = () => {
      setStreamConnected(false)
    }
    
    return () => {
      eventSource.close()
    }
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Create task with Critter Swarm sendoff
  const createTask = async () => {
    if (!task.trim() || !agentId.trim()) return
    
    setCreating(true)
    try {
      const res = await fetch('/api/openclaw-gateway/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, task }),
      })
      
      if (res.ok) {
        const data = await res.json()
        
        // Add to runs
        const newRun: TaskRun = {
          runId: data.runId,
          agentId: data.agentId,
          correlationId: data.correlationId,
          status: 'accepted',
          task: task.trim(),
          startedAt: new Date(),
        }
        setRuns(prev => [newRun, ...prev])
        
        // Trigger Critter Swarm sendoff animation
        const buttonRect = document.getElementById('dispatch-button')?.getBoundingClientRect()
        if (buttonRect) {
          dispatchSwarm({
            sourceRect: buttonRect,
            label: `Agent: ${agentId.split('/').pop()}`,
            runId: data.runId,
            runner: 'Mission Control',
          })
        }
        
        setTask('')
      }
    } catch (err) {
      console.error('Failed to create task:', err)
    } finally {
      setCreating(false)
    }
  }

  const relay = status?.relay
  const token = status?.token
  const profiles = status?.profiles ?? []
  const tabs = status?.tabs ?? []

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mission Control</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            OpenClaw Gateway · Agent Orchestration · Live Logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TroubleshootDrawer status={status} />
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="dispatch" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="dispatch" className="gap-2">
            <Send className="h-4 w-4" />
            Dispatch
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <ScrollText className="h-4 w-4" />
            Live Logs
            <Badge variant={streamConnected ? "default" : "destructive"} className="text-[10px] px-1.5 py-0 h-4">
              {streamConnected ? 'LIVE' : 'OFF'}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-2">
            <Wifi className="h-4 w-4" />
            Status
          </TabsTrigger>
        </TabsList>

        {/* Dispatch Tab */}
        <TabsContent value="dispatch" className="space-y-6">
          {/* Task Creation Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-[color:var(--foco-teal)]" />
                Dispatch Agent Task
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Agent ID</label>
                <Input
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="kimi-coding/k2p5"
                  className="font-mono"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Task</label>
                <Textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Describe what you want the agent to do..."
                  rows={3}
                />
              </div>
              <Button
                id="dispatch-button"
                onClick={createTask}
                disabled={creating || !task.trim() || !agentId.trim()}
                className="w-full gap-2 bg-[color:var(--foco-teal)] hover:bg-[color:var(--foco-teal)]/90"
              >
                {creating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Dispatch with Critter Swarm
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Active Runs */}
          {runs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bot className="h-5 w-5" />
                  Active Runs ({runs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {runs.map((run) => (
                    <div
                      key={run.runId}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {run.runId.slice(0, 8)}
                          </Badge>
                          <span className="text-sm font-medium">{run.agentId}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {run.task}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            run.status === 'completed' ? 'default' :
                            run.status === 'failed' ? 'destructive' :
                            'secondary'
                          }
                          className="text-[10px]"
                        >
                          {run.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {run.startedAt.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScrollText className="h-5 w-5" />
                Gateway Log Stream
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={streamConnected ? "default" : "destructive"} className="text-[10px]">
                  {streamConnected ? 'Connected' : 'Disconnected'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogs([])}
                  className="text-[11px]"
                >
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] overflow-auto rounded-md border bg-black/90 p-4 font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    Waiting for logs...
                  </div>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, i) => (
                      <div
                        key={i}
                        className={cn(
                          'break-all',
                          log.type === 'error' && 'text-red-400',
                          log.type === 'connected' && 'text-green-400',
                          log.level === 'debug' && 'text-gray-500',
                          log.level === 'info' && 'text-blue-400',
                          !log.type && !log.level && 'text-gray-300'
                        )}
                      >
                        {log.time && (
                          <span className="text-gray-600 mr-2">
                            {new Date(log.time).toLocaleTimeString()}
                          </span>
                        )}
                        {log.message || JSON.stringify(log)}
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-6">
          {/* Gateway section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Gateway
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <StatusDot ok={relay?.reachable ?? false} />
                <span className="font-mono text-sm">{relay?.url ?? '—'}</span>
                <Badge variant={relay?.reachable ? 'default' : 'destructive'} className="text-[11px]">
                  {relay?.reachable ? 'reachable' : 'offline'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground w-16">Token</span>
                {token?.configured ? (
                  <Badge variant={token.valid ? 'default' : 'destructive'} className="text-[11px]">
                    {token.valid ? 'valid' : 'invalid'}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[11px]">not configured</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attached Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Attached Tabs ({tabs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tabs.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Unplug className="h-4 w-4 flex-shrink-0" />
                  No tabs attached
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Title</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tabs.map(tab => (
                        <tr key={tab.id} className="bg-card hover:bg-accent/30 transition-colors">
                          <td className="px-3 py-2 max-w-[200px]">
                            <span className="block truncate font-medium text-xs">
                              {tab.title || '(untitled)'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={tab.attached ? 'default' : 'secondary'} className="text-[10px]">
                              {tab.attached ? 'attached' : 'detached'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Troubleshoot Drawer ───────────────────────────────────────────────────────

interface TroubleshootCheck {
  label: string
  ok: boolean
  hint: string
}

function TroubleshootDrawer({ status }: { status: OpenClawStatus | null }) {
  const checks: TroubleshootCheck[] = [
    {
      label: 'Relay reachable',
      ok: status?.relay?.reachable ?? false,
      hint: 'Start OpenClaw gateway: openclaw start',
    },
    {
      label: 'Token configured',
      ok: status?.token?.configured ?? false,
      hint: 'Run: foco init',
    },
    {
      label: 'Token valid',
      ok: status?.token?.valid ?? false,
      hint: 'Check FOCO_OPENCLAW_TOKEN in ~/.foco/config.json',
    },
    {
      label: 'At least 1 tab attached',
      ok: (status?.tabs?.length ?? 0) > 0,
      hint: 'Open browser and use OpenClaw extension to attach a tab',
    },
  ]

  const failCount = checks.filter(c => !c.ok).length

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
          <Wrench className="h-3.5 w-3.5" />
          Troubleshoot
          {failCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">
              {failCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            Troubleshoot OpenClaw
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {checks.map(check => (
            <div
              key={check.label}
              className={cn(
                'rounded-lg border px-4 py-3',
                check.ok
                  ? 'border-[color:var(--foco-teal)]/30 bg-[color:var(--foco-teal)]/5'
                  : 'border-red-400/40 bg-red-50 dark:bg-red-950/20'
              )}
            >
              <div className="flex items-center gap-2">
                {check.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-[color:var(--foco-teal)] flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                <span className={cn(
                  'text-sm font-medium',
                  check.ok ? 'text-foreground' : 'text-red-700 dark:text-red-400'
                )}>
                  {check.label}
                </span>
              </div>
              {!check.ok && (
                <p className="mt-1.5 pl-6 text-[11px] text-red-600 dark:text-red-400/80">
                  {check.hint}
                </p>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function StatusDot({ ok, className }: { ok: boolean; className?: string }) {
  return (
    <span className={cn(
      'inline-block h-2 w-2 rounded-full flex-shrink-0',
      ok ? 'bg-[color:var(--foco-teal)] shadow-[0_0_4px_var(--foco-teal)]' : 'bg-muted-foreground/40',
      className
    )} />
  )
}
