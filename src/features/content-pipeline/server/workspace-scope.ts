import { supabaseAdmin } from '@/lib/supabase-server'

export interface WorkspaceScopedProject {
  id: string
  workspace_id: string
  name?: string | null
  slug?: string | null
}

export interface WorkspaceScope {
  workspaceIds: string[]
  projects: WorkspaceScopedProject[]
}

const ROOT_PROJECT_SLUG = 'workspace-root'

export async function resolveWorkspaceScope(userId: string): Promise<{ scope: WorkspaceScope; error: unknown | null }> {
  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)

  if (membershipError) {
    return { scope: { workspaceIds: [], projects: [] }, error: membershipError }
  }

  const workspaceIds = Array.from(
    new Set((memberships ?? []).map((row: any) => row.workspace_id).filter(Boolean))
  ) as string[]

  if (workspaceIds.length === 0) {
    return { scope: { workspaceIds, projects: [] }, error: null }
  }

  const { data: projects, error: projectsError } = await supabaseAdmin
    .from('foco_projects')
    .select('id, workspace_id, name, slug')
    .in('workspace_id', workspaceIds)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })

  if (projectsError) {
    return { scope: { workspaceIds, projects: [] }, error: projectsError }
  }

  return {
    scope: {
      workspaceIds,
      projects: (projects ?? []) as WorkspaceScopedProject[],
    },
    error: null,
  }
}

export function scopeProjectIds(scope: WorkspaceScope): string[] {
  return scope.projects.map((project) => project.id)
}

export function hasProjectAccess(scope: WorkspaceScope, projectId: string): boolean {
  return scope.projects.some((project) => project.id === projectId)
}

export async function ensureWorkspaceRootProject(workspaceId: string, userId: string): Promise<WorkspaceScopedProject> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('foco_projects')
    .select('id, workspace_id, name, slug')
    .eq('workspace_id', workspaceId)
    .eq('slug', ROOT_PROJECT_SLUG)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existing) {
    return existing as WorkspaceScopedProject
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from('foco_projects')
    .insert({
      workspace_id: workspaceId,
      owner_id: userId,
      name: 'Workspace Root',
      slug: ROOT_PROJECT_SLUG,
      description: 'Global workspace project used for cross-codebase social intelligence and automation.',
      color: '#14b8a6',
      icon: 'folder',
      status: 'active',
      is_pinned: true,
    })
    .select('id, workspace_id, name, slug')
    .single()

  if (createError) {
    throw createError
  }

  return created as WorkspaceScopedProject
}
