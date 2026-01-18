import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  successResponse,
  authRequiredResponse,
  missingFieldResponse,
  invalidUUIDResponse,
  databaseErrorResponse,
  createPaginationMeta,
  isValidUUID,
  forbiddenResponse,
} from '@/lib/api/response-helpers'
import { CreateProposalSchema } from '@/lib/validation/schemas/proposal-api.schema'

export const dynamic = 'force-dynamic'

/**
 * GET /api/proposals - List proposals with filters
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspace_id')
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')
    const createdBy = searchParams.get('created_by')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate UUIDs if provided
    if (workspaceId && !isValidUUID(workspaceId)) {
      return invalidUUIDResponse('workspace_id', workspaceId)
    }
    if (projectId && !isValidUUID(projectId)) {
      return invalidUUIDResponse('project_id', projectId)
    }
    if (createdBy && !isValidUUID(createdBy)) {
      return invalidUUIDResponse('created_by', createdBy)
    }

    // Build query
    let query = supabaseAdmin
      .from('proposals')
      .select(
        `
        *,
        created_by_user:created_by(id, full_name, email),
        approver:approver_id(id, full_name, email),
        project:project_id(id, name, slug)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    // Apply filters
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (createdBy) {
      query = query.eq('created_by', createdBy)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: proposals, error: dbError, count } = await query

    if (dbError) {
      console.error('Proposals fetch error:', dbError)
      return databaseErrorResponse('Failed to fetch proposals', dbError)
    }

    const meta = createPaginationMeta(count || 0, limit, offset)
    return mergeAuthResponse(successResponse(proposals || [], meta), authResponse)
  } catch (err: any) {
    console.error('Proposals GET error:', err)
    return databaseErrorResponse('Failed to fetch proposals', err)
  }
}

/**
 * POST /api/proposals - Create new proposal
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const body = await req.json()

    // Validate required fields
    if (!body.workspace_id) {
      return missingFieldResponse('workspace_id')
    }
    if (!body.project_id) {
      return missingFieldResponse('project_id')
    }
    if (!body.title) {
      return missingFieldResponse('title')
    }
    if (!body.source_type) {
      return missingFieldResponse('source_type')
    }

    // Validate UUIDs
    if (!isValidUUID(body.workspace_id)) {
      return invalidUUIDResponse('workspace_id', body.workspace_id)
    }
    if (!isValidUUID(body.project_id)) {
      return invalidUUIDResponse('project_id', body.project_id)
    }

    // Validate using Zod schema
    const validation = CreateProposalSchema.safeParse({ body })
    if (!validation.success) {
      return databaseErrorResponse('Validation failed', validation.error.errors)
    }

    // Verify user has access to workspace
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', body.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse(
        `You do not have access to workspace ${body.workspace_id}`
      )
    }

    // Verify project exists and belongs to workspace
    const { data: project } = await supabaseAdmin
      .from('foco_projects')
      .select('id, workspace_id')
      .eq('id', body.project_id)
      .maybeSingle()

    if (!project) {
      return databaseErrorResponse('Project not found', { project_id: body.project_id })
    }

    if (project.workspace_id !== body.workspace_id) {
      return forbiddenResponse('Project does not belong to the specified workspace')
    }

    // Create proposal
    const proposalData = {
      workspace_id: body.workspace_id,
      project_id: body.project_id,
      title: body.title,
      description: body.description || null,
      status: 'draft',
      created_by: user.id,
      source_type: body.source_type,
      source_content: body.source_content || {},
      approval_config: body.approval_config || {
        require_all_items: false,
        auto_approve_threshold: null,
      },
      base_snapshot_at: new Date().toISOString(),
    }

    const { data: proposal, error: createError } = await supabaseAdmin
      .from('proposals')
      .insert(proposalData)
      .select(
        `
        *,
        created_by_user:created_by(id, full_name, email),
        project:project_id(id, name, slug)
      `
      )
      .single()

    if (createError) {
      console.error('Proposal creation error:', createError)
      return databaseErrorResponse('Failed to create proposal', createError)
    }

    return mergeAuthResponse(
      successResponse(proposal, undefined, 201),
      authResponse
    )
  } catch (err: any) {
    console.error('Proposals POST error:', err)
    return databaseErrorResponse('Failed to create proposal', err)
  }
}
