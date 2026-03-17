'use client'

import { Suspense } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useDashboardData } from '@/components/dashboard/use-dashboard-data'
import { RunsPanel } from './panels/runs-panel'
import { SignalsPanel } from './panels/signals-panel'
import { AttentionPanel } from './panels/attention-panel'
import { AgentGrid } from './agent-grid'

function CockpitContent() {
  const { user } = useAuth()
  const data = useDashboardData(user)

  const displayRuns = [
    ...data.activeRuns,
    ...data.allRuns.filter(r => !data.activeRuns.find(ar => ar.id === r.id) && r.status === 'failed').slice(0, 5),
    ...data.allRuns.filter(r => r.status === 'completed').slice(0, 3),
  ]

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-4 px-5 py-4">
      {/* Top row: runs (left) + right column (signals + attention) */}
      <div className="flex gap-5 flex-1 min-h-0 overflow-hidden">
        {/* Active runs stream */}
        <div className="flex-1 bg-[#0e0e10] rounded-2xl border border-zinc-800/50 p-4 flex flex-col overflow-hidden">
          <RunsPanel
            runs={displayRuns}
            onRefresh={data.fetchAll}
            refreshing={data.refreshing}
          />
        </div>

        {/* Right column: signals + attention */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-hidden">
          <div className="bg-[#0e0e10] rounded-2xl border border-zinc-800/50 p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
            <SignalsPanel
              events={data.recentEvents}
              refreshing={data.refreshing}
              onRefresh={data.fetchAll}
            />
          </div>
          <div className="bg-[#0e0e10] rounded-2xl border border-zinc-800/50 p-4 flex-shrink-0 flex flex-col overflow-hidden max-h-52">
            <AttentionPanel
              runs={data.allRuns}
              workItems={data.workItems}
              proposals={data.proposals}
              agents={data.agents}
            />
          </div>
        </div>
      </div>

      {/* Agent fleet grid — compact below */}
      <div className="bg-[#0e0e10] rounded-2xl border border-zinc-800/50 p-4 flex-shrink-0">
        <AgentGrid agents={data.agents} runs={data.allRuns} />
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
