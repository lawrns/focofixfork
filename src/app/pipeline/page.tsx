import { Suspense } from 'react'
import Link from 'next/link'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { PipelineControl } from '@/components/pipeline/pipeline-control'
import { WorkflowOrchestrator } from '@/features/orchestration/components/workflow-orchestrator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Workflows',
  description: 'Canonical workflow surface for live pipeline execution and guided orchestration.',
}

async function getProjects() {
  if (!supabaseAdmin) return []

  const { data, error } = await supabaseAdmin
    .from('foco_projects')
    .select('id, name, slug')
    .order('name')

  if (error) {
    console.error('[PipelinePage] Failed to load projects for orchestration tab:', error)
    return []
  }

  return data ?? []
}

function PipelineSkeleton() {
  return <div className="h-80 rounded-xl border bg-card/60 animate-pulse" />
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams?: { tab?: string }
}) {
  const tab = searchParams?.tab === 'workflow' ? 'workflow' : 'pipeline'
  const projects = tab === 'workflow' ? await getProjects() : []

  return (
    <PageShell maxWidth={tab === 'workflow' ? '7xl' : '4xl'}>
      <PageHeader
        title="Workflows"
        subtitle={
          tab === 'workflow'
            ? 'Review guided multi-phase orchestration in one canonical surface.'
            : 'Run the live pipeline with workspace routing, fallbacks, and streaming execution.'
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant={tab === 'pipeline' ? 'default' : 'outline'}>
          <Link href="/pipeline">Live Pipeline</Link>
        </Button>
        <Button asChild size="sm" variant={tab === 'workflow' ? 'default' : 'outline'}>
          <Link href="/pipeline?tab=workflow">Workflow Engine</Link>
        </Button>
        <p className={cn('flex items-center text-xs text-muted-foreground', tab === 'workflow' && 'max-w-lg')}>
          {tab === 'workflow'
            ? 'Use guided orchestration when the founder needs a staged, reviewable workflow.'
            : 'Use the live pipeline for direct dispatch, execution, review, and fallback visibility.'}
        </p>
      </div>

      <Suspense fallback={<PipelineSkeleton />}>
        {tab === 'workflow' ? <WorkflowOrchestrator projects={projects} /> : <PipelineControl />}
      </Suspense>
    </PageShell>
  )
}
