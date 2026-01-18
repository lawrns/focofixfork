import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  successResponse,
  authRequiredResponse,
  notFoundResponse,
  databaseErrorResponse,
  forbiddenResponse,
  missingFieldResponse,
} from '@/lib/api/response-helpers'
import { CreateProposalItemSchema } from '@/lib/validation/schemas/proposal-api.schema'

export const dynamic = 'force-dynamic'

/**
 * GET /api/proposals/[id]/items - List proposal items
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = params
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const entityType = searchParams.get('entity_type')
    const approvalStatus = searchParams.get('approval_status')

    // Verify proposal exists and user has access
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('id, workspace_id')
      .eq('id', id)
      .maybeSingle()

    if (proposalError) {
      return databaseErrorResponse('Failed to fetch proposal', proposalError)
    }

    if (!proposal) {
      return notFoundResponse('Proposal', id)
    }

    // Verify user has access to the workspace
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', proposal.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse('You do not have access to this proposal')
    }

    // Build query
    let query = supabaseAdmin
      .from('proposal_items')
      .select('*')
      .eq('proposal_id', id)
      .order('position', { ascending: true })

    // Apply filters
    if (action) {
      query = query.eq('action', action)
    }
    if (entityType) {
      query = query.eq('entity_type', entityType)
    }
    if (approvalStatus) {
      query = query.eq('approval_status', approvalStatus)
    }

    const { data: items, error: itemsError } = await query

    if (itemsError) {
      return databaseErrorResponse('Failed to fetch proposal items', itemsError)
    }

    return mergeAuthResponse(
      successResponse(items || []),
      authResponse
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to fetch proposal items', message)
  }
}

/**
 * POST /api/proposals/[id]/items - Add proposal item
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = params
    const body = await req.json()

    // Validate required fields
    if (!body.action) {
      return missingFieldResponse('action')
    }
    if (!body.entity_type) {
      return missingFieldResponse('entity_type')
    }
    if (!body.proposed_state) {
      return missingFieldResponse('proposed_state')
    }

    // Validate using Zod schema
    const validation = CreateProposalItemSchema.safeParse({ body })
    if (!validation.success) {
      return databaseErrorResponse('Validation failed', validation.error.errors)
    }

    // Verify proposal exists and user has access
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('id, workspace_id, created_by, status')
      .eq('id', id)
      .maybeSingle()

    if (proposalError) {
      return databaseErrorResponse('Failed to fetch proposal', proposalError)
    }

    if (!proposal) {
      return notFoundResponse('Proposal', id)
    }

    // Verify user has access to the workspace
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', proposal.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse('You do not have access to this proposal')
    }

    // Check permissions: only creator can add items to draft proposals
    const isCreator = proposal.created_by === user.id
    const isAdmin = ['owner', 'admin'].includes(membership.role)

    if (proposal.status === 'draft') {
      if (!isCreator && !isAdmin) {
        return forbiddenResponse(
          'Only the creator or admins can add items to draft proposals'
        )
      }
    } else {
      return forbiddenResponse('Cannot add items to submitted proposals')
    }

    // Create proposal item
    const itemData = {
      proposal_id: id,
      action: body.action,
      entity_type: body.entity_type,
      entity_id: body.entity_id || null,
      original_state: body.original_state || null,
      proposed_state: body.proposed_state,
      ai_estimate: body.ai_estimate || {},
      ai_assignment: body.ai_assignment || {},
      approval_status: 'pending',
      position: body.position ?? 0,
    }

    const { data: item, error: createError } = await supabaseAdmin
      .from('proposal_items')
      .insert(itemData)
      .select()
      .single()

    if (createError) {
      return databaseErrorResponse('Failed to create proposal item', createError)
    }

    return mergeAuthResponse(
      successResponse(item, undefined, 201),
      authResponse
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to create proposal item', message)
  }
}
