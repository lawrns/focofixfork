'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { AgentRosterExtended } from '@/components/empire/agent-roster-extended'

function AgentsContent() {
  const searchParams = useSearchParams()
  const workspaceId = searchParams?.get('workspace_id') ?? null

  return (
    <PageShell>
      <PageHeader
        title="Agent Roster"
        subtitle="Focused operators and advisors, with diagnostics moved out of the way"
      />

      <div className="space-y-6 w-full">
        <AgentRosterExtended workspaceId={workspaceId} />
      </div>
    </PageShell>
  )
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<PageShell><div>Loading...</div></PageShell>}>
      <AgentsContent />
    </Suspense>
  )
}
