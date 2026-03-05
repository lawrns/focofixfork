import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-server'

export type ProjectAccess = {
  project: {
    id: string
    name: string
    slug: string
    description: string | null
    brief: string | null
    workspace_id: string
    delegation_settings: Record<string, unknown> | null
    metadata: Record<string, unknown> | null
  }
  membership: {
    role: string
  }
  canReview: boolean
}

export async function getProjectAccess(projectId: string, user: Pick<User, 'id'>): Promise<ProjectAccess | null> {
  if (!supabaseAdmin) return null

  const { data: project, error: projectError } = await supabaseAdmin
    .from('foco_projects')
    .select('id, name, slug, description, brief, workspace_id, delegation_settings, metadata')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError || !project) return null

  const { data: membership } = await supabaseAdmin
    .from('foco_workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return null

  return {
    project,
    membership,
    canReview: ['owner', 'admin'].includes(membership.role),
  }
}
