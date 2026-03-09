import type { SupabaseClient, User } from '@supabase/supabase-js'
import { hasFounderFullAccess } from '@/lib/auth/founder-access'
import { supabaseAdmin } from '@/lib/supabase-server'

export type ProjectAccess = {
  project: {
    id: string
    name: string
    slug: string
    description: string | null
    brief: string | null
    workspace_id: string
    owner_id: string | null
    delegation_settings: Record<string, unknown> | null
    metadata: Record<string, unknown> | null
  }
  membership: {
    role: string
    scope: 'owner' | 'workspace' | 'project'
  }
  canReview: boolean
}

type ProjectAccessClient = Pick<SupabaseClient, 'from'>
const ROLE_PRIORITY = ['guest', 'member', 'admin', 'owner'] as const

function getHighestRole(roles: string[]): string | null {
  let bestRole: string | null = null
  let bestIndex = -1

  for (const role of roles) {
    const index = ROLE_PRIORITY.indexOf(role as (typeof ROLE_PRIORITY)[number])
    if (index > bestIndex) {
      bestRole = role
      bestIndex = index
    }
  }

  return bestRole
}

export async function getProjectAccess(
  projectId: string,
  user: Pick<User, 'id' | 'email'>,
  accessClient?: ProjectAccessClient
): Promise<ProjectAccess | null> {
  const db = supabaseAdmin ?? accessClient
  if (!db) return null

  const { data: project, error: projectError } = await db
    .from('foco_projects')
    .select('id, name, slug, description, brief, workspace_id, owner_id, delegation_settings, metadata')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError || !project) return null

  if (project.owner_id === user.id) {
    return {
      project,
      membership: {
        role: 'owner',
        scope: 'owner',
      },
      canReview: true,
    }
  }

  if (hasFounderFullAccess(user)) {
    return {
      project,
      membership: {
        role: 'owner',
        scope: 'owner',
      },
      canReview: true,
    }
  }

  const [{ data: workspaceMemberships }, { data: projectMemberships }] = await Promise.all([
    db
      .from('foco_workspace_members')
      .select('role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', user.id)
      .limit(10),
    db
      .from('foco_project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .limit(10),
  ])

  const workspaceRole = getHighestRole(
    (workspaceMemberships ?? [])
      .map((item: { role?: unknown }) => item.role)
      .filter((role: unknown): role is string => typeof role === 'string')
  )
  const projectRole = getHighestRole(
    (projectMemberships ?? [])
      .map((item: { role?: unknown }) => item.role)
      .filter((role: unknown): role is string => typeof role === 'string')
  )

  const membership = workspaceRole
    ? {
        role: workspaceRole,
        scope: 'workspace' as const,
      }
    : projectRole
      ? {
          role: projectRole,
          scope: 'project' as const,
        }
      : null

  if (!membership) return null

  return {
    project,
    membership,
    canReview: ['owner', 'admin'].includes(membership.role),
  }
}
