import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  successResponse,
  badRequestResponse,
  internalErrorResponse,
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

  // Get user's workspace
  const { data: memberRow } = await supabaseAdmin
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const workspaceId = memberRow?.workspace_id as string | undefined

  // No workspace membership → return empty list (not an error, not a data leak)
  if (!workspaceId) {
    return mergeAuthResponse(
      successResponse({ projects: [], workspaceId: null }),
      authResponse
    )
  }

  const { data, error: dbError } = await supabaseAdmin
    .from('foco_projects')
    .select('id, name, slug, status, description, color, icon, is_pinned, updated_at, local_path, git_remote')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true })
    .limit(limit)

  if (dbError) {
    return mergeAuthResponse(internalErrorResponse(dbError.message), authResponse)
  }

  return mergeAuthResponse(
    successResponse({ projects: data ?? [], workspaceId }),
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
