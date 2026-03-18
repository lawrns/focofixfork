import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from './requireAuth'
import { hasFounderFullAccess } from '@/lib/auth/founder-access'
import { errorResponse } from '@/lib/api/response-helpers'
import { ErrorCode } from '@/lib/api/response-envelope'
import { supabaseAdmin } from '@/lib/supabase-server'

type AccessRole = 'guest' | 'member' | 'admin' | 'owner'
type AccessScope = 'founder' | 'owner' | 'workspace' | 'project'
type AccessFailureReason =
  | 'auth_missing'
  | 'resource_missing'
  | 'workspace_membership_missing'
  | 'project_membership_missing'
  | 'minimum_role_not_met'

type AccessClient = Pick<SupabaseClient, 'from'>

const ROLE_PRIORITY: AccessRole[] = ['guest', 'member', 'admin', 'owner']

function roleMeetsMinimum(role: string, minimumRole: AccessRole): boolean {
  return ROLE_PRIORITY.indexOf(role as AccessRole) >= ROLE_PRIORITY.indexOf(minimumRole)
}

function normalizeRole(role: unknown): AccessRole | null {
  return typeof role === 'string' && ROLE_PRIORITY.includes(role as AccessRole)
    ? role as AccessRole
    : null
}

function highestRole(roles: unknown[]): AccessRole | null {
  let best: AccessRole | null = null
  for (const role of roles) {
    const normalized = normalizeRole(role)
    if (!normalized) continue
    if (!best || ROLE_PRIORITY.indexOf(normalized) > ROLE_PRIORITY.indexOf(best)) {
      best = normalized
    }
  }
  return best
}

function accessDb(): AccessClient {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin is required for access resolution')
  }
  return supabaseAdmin
}

function accessDeniedResponse(status: 401 | 403 | 404, message: string, reason: AccessFailureReason, details?: Record<string, unknown>) {
  const code =
    status === 401
      ? ErrorCode.AUTH_REQUIRED
      : status === 404
        ? ErrorCode.NOT_FOUND
        : ErrorCode.FORBIDDEN

  return errorResponse(code, message, {
    reason,
    ...details,
  })
}

export function accessFailureResponse(result: AccessFailure) {
  return accessDeniedResponse(result.status, result.message, result.reason, result.details)
}

type AccessFailure = {
  ok: false
  status: 401 | 403 | 404
  message: string
  reason: AccessFailureReason
  details?: Record<string, unknown>
}

type AuthContext = Awaited<ReturnType<typeof requireAuth>>

type WorkspaceAccessSuccess = {
  ok: true
  user: AuthContext
  workspace: {
    id: string
    name: string | null
    slug: string | null
  }
  role: AccessRole
  scope: AccessScope
}

type ProjectAccessSuccess = {
  ok: true
  user: AuthContext
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
  role: AccessRole
  scope: AccessScope
  canReview: boolean
}

type TaskAccessSuccess = {
  ok: true
  user: AuthContext
  task: {
    id: string
    workspace_id: string
    project_id: string | null
    title: string
    status: string
    priority: string | null
    delegation_status: string | null
    assigned_agent: string | null
    position: string | number | null
    created_at: string
    updated_at: string
    metadata: Record<string, unknown> | null
  }
  workspaceId: string
  projectId: string | null
  role: AccessRole
  scope: AccessScope
}

export type WorkspaceAccessResult = WorkspaceAccessSuccess | AccessFailure
export type ProjectAccessResult = ProjectAccessSuccess | AccessFailure
export type TaskAccessResult = TaskAccessSuccess | AccessFailure

function isAccessFailure(value: AuthContext | AccessFailure): value is AccessFailure {
  return typeof value === 'object' && value !== null && 'ok' in value && value.ok === false
}

async function getAuthContext(): Promise<AuthContext | AccessFailure> {
  try {
    return await requireAuth()
  } catch {
    return {
      ok: false,
      status: 401,
      message: 'Authentication required',
      reason: 'auth_missing',
    }
  }
}

async function resolveWorkspaceAccessForUser(user: AuthContext, workspaceId: string, minimumRole: AccessRole): Promise<WorkspaceAccessResult> {
  const db = accessDb()
  const { data: workspace, error: workspaceError } = await db
    .from('foco_workspaces')
    .select('id, name, slug')
    .eq('id', workspaceId)
    .maybeSingle()

  if (workspaceError || !workspace) {
    return {
      ok: false,
      status: 404,
      message: 'Workspace not found',
      reason: 'resource_missing',
      details: { workspaceId },
    }
  }

  if (hasFounderFullAccess(user)) {
    return {
      ok: true,
      user,
      workspace: workspace as WorkspaceAccessSuccess['workspace'],
      role: 'owner',
      scope: 'founder',
    }
  }

  const { data: memberships } = await db
    .from('foco_workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .limit(10)

  const role = highestRole((memberships ?? []).map((membership: { role?: unknown }) => membership.role))
  if (!role) {
    return {
      ok: false,
      status: 403,
      message: 'You do not have access to this workspace',
      reason: 'workspace_membership_missing',
      details: { workspaceId },
    }
  }

  if (!roleMeetsMinimum(role, minimumRole)) {
    return {
      ok: false,
      status: 403,
      message: 'You do not have the required role for this workspace',
      reason: 'minimum_role_not_met',
      details: { workspaceId, role, minimumRole },
    }
  }

  return {
    ok: true,
    user,
    workspace: workspace as WorkspaceAccessSuccess['workspace'],
    role,
    scope: 'workspace',
  }
}

async function resolveProjectAccessForUser(user: AuthContext, projectId: string, minimumRole: AccessRole): Promise<ProjectAccessResult> {
  const db = accessDb()
  const { data: project, error: projectError } = await db
    .from('foco_projects')
    .select('id, name, slug, description, brief, workspace_id, owner_id, delegation_settings, metadata')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError || !project) {
    return {
      ok: false,
      status: 404,
      message: 'Project not found',
      reason: 'resource_missing',
      details: { projectId },
    }
  }

  if (hasFounderFullAccess(user)) {
    return {
      ok: true,
      user,
      project,
      role: 'owner',
      scope: 'founder',
      canReview: true,
    }
  }

  if (project.owner_id === user.id) {
    return {
      ok: true,
      user,
      project,
      role: 'owner',
      scope: 'owner',
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

  const workspaceRole = highestRole((workspaceMemberships ?? []).map((membership: { role?: unknown }) => membership.role))
  const projectRole = highestRole((projectMemberships ?? []).map((membership: { role?: unknown }) => membership.role))
  const role = workspaceRole ?? projectRole
  const scope: AccessScope | null = workspaceRole ? 'workspace' : projectRole ? 'project' : null

  if (!role || !scope) {
    return {
      ok: false,
      status: 403,
      message: 'You do not have access to this project',
      reason: projectRole ? 'project_membership_missing' : 'workspace_membership_missing',
      details: { projectId, workspaceId: project.workspace_id },
    }
  }

  if (!roleMeetsMinimum(role, minimumRole)) {
    return {
      ok: false,
      status: 403,
      message: 'You do not have the required role for this project',
      reason: 'minimum_role_not_met',
      details: { projectId, workspaceId: project.workspace_id, role, minimumRole },
    }
  }

  return {
    ok: true,
    user,
    project,
    role,
    scope,
    canReview: roleMeetsMinimum(role, 'admin'),
  }
}

export async function requireWorkspaceAccess(args: { workspaceId: string; minimumRole?: AccessRole }): Promise<WorkspaceAccessResult> {
  const auth = await getAuthContext()
  if (isAccessFailure(auth)) return auth
  return resolveWorkspaceAccessForUser(auth, args.workspaceId, args.minimumRole ?? 'guest')
}

export async function requireProjectAccess(args: { projectId: string; minimumRole?: AccessRole }): Promise<ProjectAccessResult> {
  const auth = await getAuthContext()
  if (isAccessFailure(auth)) return auth
  return resolveProjectAccessForUser(auth, args.projectId, args.minimumRole ?? 'guest')
}

export async function requireTaskAccess(args: { taskId: string; minimumRole?: AccessRole }): Promise<TaskAccessResult> {
  const auth = await getAuthContext()
  if (isAccessFailure(auth)) return auth

  const db = accessDb()
  const { data: task, error: taskError } = await db
    .from('work_items')
    .select('id, workspace_id, project_id, title, status, priority, delegation_status, assigned_agent, position, created_at, updated_at, metadata')
    .eq('id', args.taskId)
    .maybeSingle()

  if (taskError || !task) {
    return {
      ok: false,
      status: 404,
      message: 'Task not found',
      reason: 'resource_missing',
      details: { taskId: args.taskId },
    }
  }

  if (typeof task.project_id === 'string' && task.project_id.length > 0) {
    const projectAccess = await resolveProjectAccessForUser(auth, task.project_id, args.minimumRole ?? 'guest')
    if (!projectAccess.ok) return projectAccess

    return {
      ok: true,
      user: auth,
      task: task as TaskAccessSuccess['task'],
      workspaceId: task.workspace_id,
      projectId: task.project_id,
      role: projectAccess.role,
      scope: projectAccess.scope,
    }
  }

  const workspaceAccess = await resolveWorkspaceAccessForUser(auth, task.workspace_id, args.minimumRole ?? 'guest')
  if (!workspaceAccess.ok) return workspaceAccess

  return {
    ok: true,
    user: auth,
    task: task as TaskAccessSuccess['task'],
    workspaceId: task.workspace_id,
    projectId: null,
    role: workspaceAccess.role,
    scope: workspaceAccess.scope,
  }
}

export function withAccessJson<T>(data: T, status: number = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}
