'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollText, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import { useOpenClawLogs } from '@/lib/hooks/use-openclaw-logs'
import { AgentControls } from './agent-controls'
import { MissionTimeline } from './mission-timeline'
import { AGENT_STATUS_COLORS, BACKEND_LABELS } from '@/lib/command-center/types'

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
                  <Badge variant="outline" className="text-[10px]">{agent.model}</Badge>
                )}
              </div>
            </SheetHeader>

            <div className="mb-4">
              <AgentControls agent={agent} />
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
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
