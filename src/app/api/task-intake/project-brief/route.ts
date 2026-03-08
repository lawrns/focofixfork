import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createProjectBriefDraft } from '@/features/task-intake'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, sourceText } = body as { projectId?: string; sourceText?: string }

    if (!projectId || !sourceText?.trim()) {
      return NextResponse.json({ error: 'projectId and sourceText are required' }, { status: 400 })
    }

    const { data: project } = await supabaseAdmin
      .from('foco_projects')
      .select('id, workspace_id')
      .eq('id', projectId)
      .maybeSingle()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: membership } = await supabaseAdmin
      .from('foco_workspace_members')
      .select('id')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const draft = await createProjectBriefDraft({
      userId: user.id,
      workspaceId: project.workspace_id,
      projectId,
      sourceText: sourceText.trim(),
    })

    return NextResponse.json({
      draft_id: draft.id,
      draft_plan: draft.draftPlan,
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
