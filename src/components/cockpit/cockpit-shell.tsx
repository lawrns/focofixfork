'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { useMissionControlData } from '@/features/mission-control/hooks/use-mission-control-data'
import { RunsPanel } from './panels/runs-panel'
import { SignalsPanel } from './panels/signals-panel'
import { AttentionPanel } from './panels/attention-panel'
import { AgentGrid } from './agent-grid'
import { WorkboardPanel } from './panels/workboard-panel'
import { MachinePanel } from './panels/machine-panel'
import { ActivityPanel } from './panels/activity-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

function CockpitContent() {
  const data = useMissionControlData()
  const snapshot = data.snapshot

  const displayRuns = [
    ...(snapshot?.runs.filter((run) => run.status === 'running' || run.status === 'pending') ?? []),
    ...(snapshot?.runs.filter((run) => run.status === 'failed').slice(0, 4) ?? []),
    ...(snapshot?.runs.filter((run) => run.status === 'completed').slice(0, 3) ?? []),
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 py-4">
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.14),transparent_36%),linear-gradient(180deg,#111214,#0c0d0f)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Mission Control</p>
              <h1 className="mt-2 text-2xl font-semibold text-zinc-50">Transparent OpenClaw operations, not isolated dashboards.</h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                The cockpit now unifies machine pulse, run execution, task evidence, and operator attention into one live surface.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-[0.18em]',
                  data.streamState === 'live' ? 'text-emerald-300' : 'text-amber-300'
                )}
              >
                workspace {data.streamState}
              </Badge>
              <Button variant="outline" size="sm" className="border-zinc-700 bg-black/20 text-zinc-200 hover:bg-zinc-900" onClick={() => void data.refresh()}>
                <RefreshCw className={cn('mr-2 h-3.5 w-3.5', data.loading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(data.metrics.length === 0 ? [0, 1, 2, 3] : data.metrics).map((metric, index) => (
            <motion.div
              key={typeof metric === 'number' ? metric : metric.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className="rounded-2xl border border-zinc-800/60 bg-[#0e0f11] p-4"
            >
              {typeof metric === 'number' ? (
                <div className="space-y-3">
                  <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
                  <div className="h-8 w-12 animate-pulse rounded bg-zinc-800" />
                  <div className="h-3 w-full animate-pulse rounded bg-zinc-900" />
                </div>
              ) : (
                <>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{metric.label}</div>
                  <div className="mt-3 text-2xl font-semibold text-zinc-50">{metric.value}</div>
                  <div className="mt-1 text-[11px] text-zinc-500">{metric.detail}</div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.25fr_1fr_0.9fr]">
        <div className="min-h-0 rounded-2xl border border-zinc-800/50 bg-[#0e0e10] p-4">
          <RunsPanel
            runs={displayRuns}
            onRefresh={() => void data.refresh()}
            refreshing={data.loading}
          />
        </div>

        <div className="min-h-0 rounded-2xl border border-zinc-800/50 bg-[#0e0e10] p-4">
          <WorkboardPanel tasks={snapshot?.tasks ?? []} />
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          <div className="min-h-0 flex-1 rounded-2xl border border-zinc-800/50 bg-[#0e0e10] p-4">
            <MachinePanel machine={snapshot?.machine ?? {
              signalStrength: 0,
              gatewayHealthy: false,
              primaryModel: null,
              attachedTabs: 0,
              cpuPercent: 0,
              memPercent: 0,
              workspacePath: null,
              cronSummary: { total: 0, enabled: 0, healthy: 0, degraded: 0, failing: 0 },
              alerts: [],
            }} runtime={snapshot?.runtime ?? null} streamState={data.streamState} />
          </div>
          <div className="max-h-64 min-h-[15rem] rounded-2xl border border-zinc-800/50 bg-[#0e0e10] p-4">
            <AttentionPanel
              runs={snapshot?.runs ?? []}
              workItems={(snapshot?.tasks ?? []).map((task) => ({
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority,
                project: { id: task.projectId, name: task.projectName, slug: task.projectSlug ?? undefined },
                section: task.latestEvent ?? undefined,
              }))}
              proposals={(snapshot?.proposals ?? []).map((proposal) => ({
                ...proposal,
                project: proposal.project
                  ? {
                      ...proposal.project,
                      slug: proposal.project.slug ?? undefined,
                    }
                  : proposal.project,
              }))}
              agents={snapshot?.agents ?? []}
            />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-h-[18rem] rounded-2xl border border-zinc-800/50 bg-[#0e0e10] p-4">
          <ActivityPanel activity={snapshot?.activity ?? []} />
        </div>

        <div className="flex min-h-[18rem] flex-col gap-4">
          <div className="min-h-0 flex-1 rounded-2xl border border-zinc-800/50 bg-[#0e0e10] p-4">
            <SignalsPanel
              events={snapshot?.signals ?? []}
              refreshing={data.loading}
              onRefresh={() => void data.refresh()}
            />
          </div>
          <div className="rounded-2xl border border-zinc-800/50 bg-[#0e0e10] p-4">
            <AgentGrid agents={snapshot?.agents ?? []} runs={snapshot?.runs ?? []} />
          </div>
        </div>
      </div>
    </div>
  )
}

function CockpitFallback() {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 px-5 py-4">
      <div className="flex gap-5 flex-1 min-h-0">
        <div className="flex-1 bg-[#0e0e10] rounded-2xl border border-zinc-800/50 animate-pulse" />
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
          <div className="flex-1 bg-[#0e0e10] rounded-2xl border border-zinc-800/50 animate-pulse" />
          <div className="h-52 bg-[#0e0e10] rounded-2xl border border-zinc-800/50 animate-pulse" />
        </div>
      </div>
      <div className="h-32 bg-[#0e0e10] rounded-2xl border border-zinc-800/50 flex-shrink-0 animate-pulse" />
    </div>
  )
}

export function CockpitShell() {
  return (
    <Suspense fallback={<CockpitFallback />}>
      <CockpitContent />
    </Suspense>
  )
}
