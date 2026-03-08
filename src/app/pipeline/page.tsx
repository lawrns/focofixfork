import { Suspense } from 'react'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { PipelineControl } from '@/components/pipeline/pipeline-control'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'AI Pipeline',
  description: 'Workspace-routed engineering pipeline with planning, execution, and review phases.',
}

export default function PipelinePage() {
  return (
    <PageShell maxWidth="4xl">
      <PageHeader
        title="AI Pipeline"
        subtitle="Workspace-routed planning, execution, and review with live fallback visibility"
      />
      <Suspense>
        <PipelineControl />
      </Suspense>
    </PageShell>
  )
}
