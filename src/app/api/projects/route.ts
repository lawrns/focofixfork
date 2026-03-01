import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { ProjectRepository } from '@/lib/repositories/project-repository'
import type { CreateProjectData } from '@/lib/repositories/project-repository'
import { isError } from '@/lib/repositories/base-repository'
import { authRequiredResponse, successResponse, databaseErrorResponse, createPaginationMeta, missingFieldResponse, duplicateSlugResponse, isValidUUID, workspaceNotFoundResponse, forbiddenResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

async function enrichProjects(supabase: any, projects: any[]) {
  if (!projects.length) return projects

  const projectIds = projects.map((p: Record<string, unknown>) => p.id as string)

  // Task counts grouped by project
  const { data: taskRows } = await supabase
    .from('work_items')
    .select('project_id, status')
    .in('project_id', projectIds)

  const countMap: Record<string, { total: number; done: number }> = {}
  for (const t of taskRows ?? []) {
    const pid = t.project_id as string
    if (!countMap[pid]) countMap[pid] = { total: 0, done: 0 }
    countMap[pid].total++
    if (t.status === 'done') countMap[pid].done++
  }

  // Delegation status breakdown
  const { data: delegationRows } = await supabase
    .from('work_items')
    .select('project_id, delegation_status')
    .in('project_id', projectIds)
    .neq('delegation_status', 'none')

  const delegationMap: Record<string, Record<string, number>> = {}
  for (const r of delegationRows ?? []) {
    if (!r.project_id || !r.delegation_status) continue
    if (!delegationMap[r.project_id]) delegationMap[r.project_id] = {}
    delegationMap[r.project_id][r.delegation_status] = (delegationMap[r.project_id][r.delegation_status] ?? 0) + 1
  }

  // Active run count
  const { data: runRows } = await supabase
    .from('runs')
    .select('project_id')
    .in('project_id', projectIds)
    .in('status', ['pending', 'running'])

  const runCountMap: Record<string, number> = {}
  for (const r of runRows ?? []) {
    if (!r.project_id) continue
    runCountMap[r.project_id] = (runCountMap[r.project_id] ?? 0) + 1
  }

  // Owner display names
  const ownerIds = [...new Set(projects.map(p => p.owner_id as string).filter(Boolean))]
  const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {}
  if (ownerIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', ownerIds)
    for (const p of profiles ?? []) {
      profileMap[p.id as string] = { display_name: p.display_name as string | null, avatar_url: p.avatar_url as string | null }
    }
  }

  return projects.map(p => {
    const pid = p.id as string
    const counts = countMap[pid] ?? { total: 0, done: 0 }
    const ownerProfile = profileMap[p.owner_id as string]
    return {
      ...p,
      total_tasks: counts.total,
      tasks_completed: counts.done,
      owner_name: ownerProfile?.display_name ?? null,
      owner_avatar: ownerProfile?.avatar_url ?? null,
      delegation_counts: delegationMap[pid] ?? {},
      active_run_count: runCountMap[pid] ?? 0,
    }
  })
}

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspace_id')
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const archived = searchParams.get('archived')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const repo = new ProjectRepository(supabase)

    // If id provided, fetch single project
    if (id) {
      if (!isValidUUID(id)) {
        return missingFieldResponse('Invalid project ID format')
      }
      
      const result = await repo.findById(id)
      
      if (isError(result)) {
        return databaseErrorResponse(result.error.message, result.error.details)
      }
      
      if (!result.data) {
        return mergeAuthResponse(NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        ), authResponse)
      }
      
      return mergeAuthResponse(successResponse(result.data), authResponse)
    }

    // If workspace_id provided, use workspace-scoped query
    if (workspaceId) {
      const result = await repo.findByWorkspace(workspaceId, {
        status: status as 'active' | 'on_hold' | 'completed' | 'cancelled' | undefined,
        archived: archived === 'true' ? true : archived === 'false' ? false : undefined,
        limit,
        offset,
      })

      if (isError(result)) {
        return databaseErrorResponse(result.error.message, result.error.details)
      }

      const enriched = await enrichProjects(supabase, result.data ?? [])
      const meta = createPaginationMeta(result.meta?.count ?? 0, limit, offset)
      return mergeAuthResponse(successResponse(enriched, meta), authResponse)
    }

    // Otherwise, use generic findMany with filters
    const filters: Record<string, string> = {}
    if (status) filters.status = status

    const result = await repo.findMany(filters, { limit, offset })

    if (isError(result)) {
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    const enriched = await enrichProjects(supabase, result.data ?? [])
    const meta = createPaginationMeta(result.meta?.count ?? 0, limit, offset)
    return mergeAuthResponse(successResponse(enriched, meta), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to fetch projects', message)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const body = await req.json()

    // Validate required fields
    if (!body.name) {
      return missingFieldResponse('name')
    }

    if (!body.workspace_id) {
      return missingFieldResponse('workspace_id')
    }

    // Validate workspace_id format
    if (!isValidUUID(body.workspace_id)) {
      return workspaceNotFoundResponse(body.workspace_id)
    }

    // CRITICAL: Verify user has admin or owner role in the workspace before creating projects
    // Check workspace_members for user's role
    const { data: memberData, error: memberError } = await supabase
      .from('foco_workspace_members')
      .select('role')
      .eq('workspace_id', body.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberError) {
      return databaseErrorResponse('Failed to verify workspace membership', memberError)
    }

    if (!memberData) {
      return forbiddenResponse('You must be a member of this workspace to create projects')
    }

    // Check if user has admin or owner role
    const userRole = memberData.role
    const ROLE_LEVELS: Record<string, number> = {
      owner: 4,
      admin: 3,
      member: 2,
      guest: 1,
    }

    if ((ROLE_LEVELS[userRole] || 0) < ROLE_LEVELS.admin) {
      return forbiddenResponse(
        `Project creation requires admin or owner role. Your role: ${userRole}`
      )
    }

    // Generate slug from name if not provided
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const repo = new ProjectRepository(supabase)

    const projectData: CreateProjectData = {
      workspace_id: body.workspace_id,
      name: body.name,
      slug,
      description: body.description || null,
      brief: body.brief || null,
      color: body.color,
      icon: body.icon,
      status: body.status,
      owner_id: user.id,
    }

    const result = await repo.createProject(projectData)

    if (isError(result)) {
      // Handle specific error codes
      if (result.error.code === 'DUPLICATE_SLUG') {
        return duplicateSlugResponse(slug)
      }
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return mergeAuthResponse(successResponse(result.data, undefined, 201), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to create project', message)
  }
}
