import { Suspense } from 'react'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { PipelineControl } from '@/components/pipeline/pipeline-control'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'AI Pipeline | Empire OS',
  description: 'Tri-model engineering pipeline: Claude plans · Kimi executes · Codex reviews',
}

export default function PipelinePage() {
  return (
    <PageShell maxWidth="4xl">
      <PageHeader
        title="AI Pipeline"
        subtitle="Claude plans · Kimi executes · Codex reviews + learns"
      />
      <Suspense>
        <PipelineControl />
      </Suspense>
    </PageShell>
  )
}
