import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { generateWorkflowProposals, insertWorkflowProposals } from '@/lib/n8n/project-workflows'
import { accessFailureResponse, requireProjectAccess } from '@/server/auth/access'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params
  const access = await requireProjectAccess({ projectId, minimumRole: 'admin' })
  if (!access.ok) return accessFailureResponse(access)

  try {
    const { data: tasks } = await supabaseAdmin
      .from('work_items')
      .select('title, description, status')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(30)

    const proposals = await generateWorkflowProposals({
      project: access.project,
      tasks: tasks ?? [],
    })

    const inserted = await insertWorkflowProposals(projectId, access.project.workspace_id, proposals)
    return NextResponse.json({ ok: true, data: { proposals: inserted } })
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : 'Failed to generate workflow proposals'
    return NextResponse.json({ ok: false, error: { message } }, { status: 500 })
  }
}
