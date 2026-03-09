import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, forbiddenResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getProjectAccess } from '@/lib/projects/access'
import { generateWorkflowProposals, insertWorkflowProposals } from '@/lib/n8n/project-workflows'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { id: projectId } = await params
  const access = await getProjectAccess(projectId, user, supabase)
  if (!access) return mergeAuthResponse(forbiddenResponse('You do not have access to this project'), authResponse)
  if (!access.canReview) return mergeAuthResponse(forbiddenResponse('Only project reviewers can generate workflow proposals'), authResponse)

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
    return mergeAuthResponse(NextResponse.json({ ok: true, data: { proposals: inserted } }), authResponse)
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : 'Failed to generate workflow proposals'
    return mergeAuthResponse(NextResponse.json({ ok: false, error: { message } }, { status: 500 }), authResponse)
  }
}
