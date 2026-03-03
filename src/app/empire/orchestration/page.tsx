import { Suspense } from 'react';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { WorkflowOrchestrator } from '@/features/orchestration/components/workflow-orchestrator';
import { supabaseAdmin } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Orchestration | Empire OS',
  description: 'm2c1 12-Phase Workflow Engine - Manage AI orchestration workflows',
};

async function getProjects() {
  if (!supabaseAdmin) {
    return [];
  }

  const { data: projects, error } = await supabaseAdmin
    .from('foco_projects')
    .select('id, name, slug')
    .order('name');

  if (error) {
    console.error('[Orchestration] Error fetching projects:', error);
    return [];
  }

  return projects || [];
}

export default async function OrchestrationPage() {
  const projects = await getProjects();

  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        title="Orchestration"
        subtitle="m2c1 12-Phase Workflow Engine"
      />
      <Suspense fallback={<OrchestrationSkeleton />}>
        <WorkflowOrchestrator projects={projects} />
      </Suspense>
    </PageShell>
  );
}

function OrchestrationSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="h-10 w-48 bg-muted rounded animate-pulse" />
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-96 bg-muted rounded animate-pulse" />
        <div className="lg:col-span-2 h-96 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
