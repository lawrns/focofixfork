import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  successResponse,
  badRequestResponse,
  internalErrorResponse,
  projectNotFoundResponse,
} from '@/lib/api/response-helpers'
import { ProjectRepository } from '@/lib/repositories/project-repository'
import { isError } from '@/lib/repositories/base-repository'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'project'
}

export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  if (!supabaseAdmin) {
    return mergeAuthResponse(internalErrorResponse('DB not available'), authResponse)
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '100')
  const slug = searchParams.get('slug')?.trim() || null

  // Get all workspace memberships for this user (admin client bypasses recursive RLS pitfalls).
  const { data: membershipRows, error: membershipError } = await supabaseAdmin
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
  if (membershipError) {
    return mergeAuthResponse(internalErrorResponse(membershipError.message), authResponse)
  }

  const workspaceIds = Array.from(
    new Set((membershipRows ?? []).map((row: any) => row.workspace_id).filter(Boolean))
  ) as string[]
  const primaryWorkspaceId = workspaceIds[0] ?? null

  // No workspace membership → return empty list (not an error, not a data leak)
  if (workspaceIds.length === 0) {
    return mergeAuthResponse(
      successResponse({ projects: [], workspaceId: null, workspaceIds: [] }),
      authResponse
    )
  }

  let projectsQuery = supabaseAdmin
    .from('foco_projects')
    .select('id, workspace_id, owner_id, name, slug, status, description, color, icon, is_pinned, updated_at, local_path, git_remote, delegation_settings, assigned_agent_pool')
    .in('workspace_id', workspaceIds)
    .is('archived_at', null)

  if (slug) {
    projectsQuery = projectsQuery.eq('slug', slug)
  }

  const { data, error: dbError } = await projectsQuery
    .order('updated_at', { ascending: false })
    .order('name', { ascending: true })
    .limit(limit)

  if (dbError) {
    return mergeAuthResponse(internalErrorResponse(dbError.message), authResponse)
  }

  const projects = data ?? []
  if (projects.length === 0) {
    if (slug) {
      return mergeAuthResponse(projectNotFoundResponse(slug), authResponse)
    }
    return mergeAuthResponse(
      successResponse({ projects: [], workspaceId: primaryWorkspaceId, workspaceIds }),
      authResponse
    )
  }

  const projectIds = projects.map((project: any) => project.id)
  const ownerIds = [...new Set(projects.map((project: any) => project.owner_id).filter(Boolean))]

  const [workItemsResult, runsResult, ownersResult] = await Promise.all([
    supabaseAdmin
      .from('work_items')
      .select('project_id, status, delegation_status')
      .in('project_id', projectIds),
    supabaseAdmin
      .from('runs')
      .select('project_id, status')
      .in('project_id', projectIds)
      .in('status', ['pending', 'running']),
    ownerIds.length > 0
      ? supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .in('id', ownerIds)
      : Promise.resolve({ data: [], error: null } as const),
  ])

  if (workItemsResult.error) {
    return mergeAuthResponse(internalErrorResponse(workItemsResult.error.message), authResponse)
  }
  if (runsResult.error) {
    return mergeAuthResponse(internalErrorResponse(runsResult.error.message), authResponse)
  }
  if (ownersResult.error) {
    return mergeAuthResponse(internalErrorResponse(ownersResult.error.message), authResponse)
  }

  const taskCountsByProject = new Map<string, { total: number; completed: number }>()
  const delegationCountsByProject = new Map<string, { pending: number; delegated: number; running: number; completed: number; failed: number }>()
  for (const item of workItemsResult.data ?? []) {
    const key = item.project_id as string
    if (!taskCountsByProject.has(key)) {
      taskCountsByProject.set(key, { total: 0, completed: 0 })
    }
    if (!delegationCountsByProject.has(key)) {
      delegationCountsByProject.set(key, { pending: 0, delegated: 0, running: 0, completed: 0, failed: 0 })
    }
    const task = taskCountsByProject.get(key)!
    task.total += 1
    if (item.status === 'done') task.completed += 1

    const delegation = delegationCountsByProject.get(key)!
    if (item.delegation_status === 'pending') delegation.pending += 1
    if (item.delegation_status === 'delegated') delegation.delegated += 1
    if (item.delegation_status === 'running') delegation.running += 1
    if (item.delegation_status === 'completed') delegation.completed += 1
    if (item.delegation_status === 'failed') delegation.failed += 1
  }

  const activeRunCountByProject = new Map<string, number>()
  for (const run of runsResult.data ?? []) {
    const key = run.project_id as string
    activeRunCountByProject.set(key, (activeRunCountByProject.get(key) ?? 0) + 1)
  }

  const ownerProfileById = new Map<string, { full_name: string | null; avatar_url: string | null }>()
  for (const owner of ownersResult.data ?? []) {
    ownerProfileById.set(owner.id as string, {
      full_name: owner.full_name ?? null,
      avatar_url: owner.avatar_url ?? null,
    })
  }

  const enrichedProjects = projects.map((project: any) => {
    const taskCounts = taskCountsByProject.get(project.id) ?? { total: 0, completed: 0 }
    const delegationCounts = delegationCountsByProject.get(project.id) ?? { pending: 0, delegated: 0, running: 0, completed: 0, failed: 0 }
    const activeRuns = activeRunCountByProject.get(project.id) ?? 0
    const ownerProfile = ownerProfileById.get(project.owner_id ?? '')
    const risk =
      project.status === 'on_hold'
        ? 'high'
        : taskCounts.total > 5 && taskCounts.completed === 0
          ? 'medium'
          : 'none'

    return {
      ...project,
      tasks_completed: taskCounts.completed,
      total_tasks: taskCounts.total,
      risk,
      owner_name: ownerProfile?.full_name ?? null,
      owner_avatar: ownerProfile?.avatar_url ?? null,
      delegation_counts: delegationCounts,
      active_run_count: activeRuns,
    }
  })

  if (slug) {
    return mergeAuthResponse(
      successResponse({
        project: enrichedProjects[0],
        workspaceId: enrichedProjects[0]?.workspace_id ?? primaryWorkspaceId,
        workspaceIds,
      }),
      authResponse
    )
  }

  return mergeAuthResponse(
    successResponse({ projects: enrichedProjects, workspaceId: primaryWorkspaceId, workspaceIds }),
    authResponse
  )
}

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : null
  const color = typeof body?.color === 'string' ? body.color : undefined
  const icon = typeof body?.icon === 'string' ? body.icon : undefined
  const status = typeof body?.status === 'string' ? body.status : undefined
  const requestedWorkspaceId =
    typeof body?.workspace_id === 'string' ? body.workspace_id : undefined

  if (!name) {
    return mergeAuthResponse(badRequestResponse('Project name is required'), authResponse)
  }

  const membershipsQuery = supabase
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(requestedWorkspaceId ? 50 : 1)

  const { data: memberships, error: membershipError } = await membershipsQuery
  if (membershipError) {
    return mergeAuthResponse(internalErrorResponse(membershipError.message), authResponse)
  }

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id)
  const workspaceId = requestedWorkspaceId ?? workspaceIds[0]

  if (!workspaceId) {
    return mergeAuthResponse(badRequestResponse('No workspace membership found'), authResponse)
  }

  if (requestedWorkspaceId && !workspaceIds.includes(requestedWorkspaceId)) {
    return mergeAuthResponse(badRequestResponse('Invalid workspace for current user'), authResponse)
  }

  const repo = new ProjectRepository(supabaseAdmin || supabase)
  const baseSlug = toSlug(name)

  let created: Awaited<ReturnType<typeof repo.createProject>> | null = null
  for (let attempt = 0; attempt < 50; attempt++) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`
    const slug = `${baseSlug}${suffix}`.slice(0, 80)
    const result = await repo.createProject({
      workspace_id: workspaceId,
      owner_id: user.id,
      name,
      slug,
      description,
      color,
      icon,
      status,
    })
    if (!isError(result)) {
      created = result
      break
    }
    if (result.error.code !== 'DUPLICATE_SLUG') {
      return mergeAuthResponse(internalErrorResponse(result.error.message), authResponse)
    }
  }

  if (!created || isError(created)) {
    return mergeAuthResponse(internalErrorResponse('Failed to create unique project slug'), authResponse)
  }

  return mergeAuthResponse(successResponse(created.data, undefined, 201), authResponse)
}
