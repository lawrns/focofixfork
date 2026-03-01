'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollText, Clock, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import { useOpenClawLogs } from '@/lib/hooks/use-openclaw-logs'
import { AgentControls } from './agent-controls'
import { MissionTimeline } from './mission-timeline'
import { AGENT_STATUS_COLORS, BACKEND_LABELS } from '@/lib/command-center/types'
import type { UnifiedAgent } from '@/lib/command-center/types'

function modelBadgeClass(model?: string) {
  if (!model) return ''
  const m = model.toLowerCase()
  if (m.includes('opus')) return 'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700'
  if (m.includes('sonnet')) return 'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700'
  if (m.includes('haiku')) return 'text-zinc-500 border-zinc-300 dark:border-zinc-600'
  return ''
}

interface AgentDetail extends UnifiedAgent {
  system_prompt?: string
  tools?: string[]
  recent_runs?: Array<{ id: string; status: string; created_at: string; summary?: string }>
}

function RecentRunsSection({ agentId }: { agentId: string }) {
  const [runs, setRuns] = useState<Array<{ id: string; status: string; created_at: string; summary?: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/runs?runner=${encodeURIComponent(agentId)}&limit=5`)
      .then(r => r.json())
      .then(data => setRuns(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [agentId])

  if (loading) return <p className="text-[12px] text-muted-foreground">Loading runs…</p>
  if (runs.length === 0) return <p className="text-[12px] text-muted-foreground">No recent runs.</p>

  return (
    <div className="space-y-1.5">
      {runs.map(run => (
        <a key={run.id} href={`/runs/${run.id}`} className="flex items-center gap-2 text-[12px] hover:underline">
          <Badge variant="outline" className="text-[10px] capitalize">{run.status}</Badge>
          <span className="truncate text-muted-foreground">{run.summary ?? run.id.slice(0, 12)}</span>
          <span className="ml-auto text-[10px] text-muted-foreground flex-shrink-0">
            {new Date(run.created_at).toLocaleDateString()}
          </span>
        </a>
      ))}
    </div>
  )
}

function SystemPromptSection({ prompt }: { prompt?: string }) {
  const [expanded, setExpanded] = useState(false)

  if (!prompt) return (
    <div className="rounded-md border border-dashed px-3 py-3 text-[12px] text-muted-foreground space-y-1">
      <p className="font-medium text-foreground">System prompt not available</p>
      <p>This agent&apos;s system prompt is not exposed via the ClawdBot API. To enable this, configure ClawdBot to include <code className="text-[11px] bg-muted px-1 py-0.5 rounded">system_prompt</code> in its <code className="text-[11px] bg-muted px-1 py-0.5 rounded">/agents/&#123;id&#125;</code> response.</p>
    </div>
  )

  const preview = prompt.slice(0, 500)
  const hasMore = prompt.length > 500

  return (
    <div className="space-y-1.5">
      <pre className="text-[11px] bg-muted rounded p-2 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
        {expanded ? prompt : preview}{hasMore && !expanded ? '…' : ''}
      </pre>
      {hasMore && (
        <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1" onClick={() => setExpanded(v => !v)}>
          {expanded ? <><ChevronUp className="h-3 w-3" />Collapse</> : <><ChevronDown className="h-3 w-3" />Show full</>}
        </Button>
      )}
    </div>
  )
}

const LEVEL_COLORS: Record<string, string> = {
  error: 'text-red-400',
  warn:  'text-amber-400',
  info:  'text-blue-400',
  debug: 'text-zinc-500',
}

export function AgentDetailSheet() {
  const store = useCommandCenterStore()
  const agent = store.selectedAgent()
  const isOpen = !!agent

  const { logs, connected } = useOpenClawLogs()

  const agentLogs = agent
    ? logs.filter(l => !l.runId || l.runId.includes(agent.nativeId))
    : []

  const mission = agent?.currentMissionId
    ? store.missions.find(m => m.id === agent.currentMissionId)
    : null

  return (
    <Sheet open={isOpen} onOpenChange={v => !v && store.selectAgent(null)}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        {agent && (
          <>
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-start gap-2 flex-wrap">
                <span className="flex-1 min-w-0 truncate">{agent.name}</span>
                <Badge variant="outline" className="text-[10px] flex-shrink-0">
                  {BACKEND_LABELS[agent.backend]}
                </Badge>
              </SheetTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn('text-[10px] border-0', AGENT_STATUS_COLORS[agent.status])}>
                  {agent.status}
                </Badge>
                {agent.model && (
                  <Badge variant="outline" className={cn('text-[10px]', modelBadgeClass(agent.model))}>
                    {agent.model}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-3 w-3 ml-1 -mr-0.5 hover:bg-transparent"
                      onClick={() => navigator.clipboard.writeText(agent.model!)}
                      title="Copy model ID"
                    >
                      <Copy className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                )}
              </div>
            </SheetHeader>

            <div className="mb-4">
              <AgentControls agent={agent} />
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="runs">Runs</TabsTrigger>
                <TabsTrigger value="prompt">Prompt</TabsTrigger>
                <TabsTrigger value="steps">Steps</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="mt-4 space-y-3">
                <Row label="Role" value={agent.role} />
                <Row label="Backend" value={BACKEND_LABELS[agent.backend]} />
                <Row label="Native ID" value={agent.nativeId} mono />
                {agent.lastActiveAt && (
                  <Row label="Last active" value={new Date(agent.lastActiveAt).toLocaleString()} />
                )}
                {agent.errorMessage && (
                  <div className="rounded-md bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                    {agent.errorMessage}
                  </div>
                )}
                {mission && (
                  <div className="rounded-md border px-3 py-2 space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">Current mission</p>
                    <p className="text-sm font-medium">{mission.title}</p>
                  </div>
                )}
              </TabsContent>

              {/* Recent Runs */}
              <TabsContent value="runs" className="mt-4">
                <RecentRunsSection agentId={agent.nativeId} />
              </TabsContent>

              {/* System Prompt */}
              <TabsContent value="prompt" className="mt-4">
                <SystemPromptSection prompt={(agent.raw as any)?.system_prompt} />
              </TabsContent>

              {/* Steps */}
              <TabsContent value="steps" className="mt-4">
                <MissionTimeline steps={mission?.steps ?? []} />
              </TabsContent>

              {/* Logs */}
              <TabsContent value="logs" className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <ScrollText className="h-3 w-3" />
                    Gateway log stream
                  </span>
                  <Badge variant={connected ? 'default' : 'destructive'} className="text-[9px]">
                    {connected ? 'LIVE' : 'OFF'}
                  </Badge>
                </div>
                <div className="h-[320px] overflow-auto rounded-md border bg-black/90 p-3 font-mono text-[11px]">
                  {agentLogs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Waiting for logs…
                    </div>
                  ) : (
                    agentLogs.map((log, i) => {
                      const inferredLevel =
                        log.level ??
                        (log.type === 'error' || /\b(failed|error|denied|crash)\b/i.test(log.message ?? '') ? 'error' : undefined) ??
                        (log.type === 'connected' ? 'info' : undefined) ??
                        (/\bwarn/i.test(log.message ?? '') ? 'warn' : undefined)
                      return (
                        <div
                          key={i}
                          className={cn(
                            'break-all',
                            inferredLevel ? LEVEL_COLORS[inferredLevel] : undefined,
                            log.type === 'connected' && 'text-green-400',
                            !inferredLevel && !log.type && 'text-gray-300',
                          )}
                        >
                          {log.time && (
                            <span className="text-gray-600 mr-2">
                              {new Date(log.time).toLocaleTimeString()}
                            </span>
                          )}
                          {log.message || JSON.stringify(log)}
                        </div>
                      )
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className={cn('truncate text-right', mono && 'font-mono text-[12px]')}>{value}</span>
    </div>
  )
}
