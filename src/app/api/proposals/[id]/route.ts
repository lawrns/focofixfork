import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  successResponse,
  authRequiredResponse,
  notFoundResponse,
  databaseErrorResponse,
  forbiddenResponse,
} from '@/lib/api/response-helpers'
import { UpdateProposalSchema } from '@/lib/validation/schemas/proposal-api.schema'

export const dynamic = 'force-dynamic'

/**
 * GET /api/proposals/[id] - Get single proposal with items
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

    // Fetch proposal with related data
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select(
        `
        *,
        created_by_user:created_by(id, full_name, email),
        approver:approver_id(id, full_name, email),
        project:project_id(id, name, slug, color),
        items:proposal_items(*)
      `
      )
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

    return mergeAuthResponse(successResponse(proposal), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to fetch proposal', message)
  }
}

/**
 * PATCH /api/proposals/[id] - Update proposal
 */
export async function PATCH(
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

    // Validate using Zod schema
    const validation = UpdateProposalSchema.safeParse({ body })
    if (!validation.success) {
      return databaseErrorResponse('Validation failed', validation.error.errors)
    }

    // Fetch existing proposal
    const { data: existingProposal, error: fetchError } = await supabaseAdmin
      .from('proposals')
      .select('id, workspace_id, created_by, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return databaseErrorResponse('Failed to fetch proposal', fetchError)
    }

    if (!existingProposal) {
      return notFoundResponse('Proposal', id)
    }

    // Verify user has access to the workspace
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', existingProposal.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse('You do not have access to this proposal')
    }

    // Check permissions: only creator can edit draft proposals
    // Admins can edit any proposal
    const isCreator = existingProposal.created_by === user.id
    const isAdmin = ['owner', 'admin'].includes(membership.role)

    if (existingProposal.status === 'draft') {
      if (!isCreator && !isAdmin) {
        return forbiddenResponse('Only the creator or admins can edit draft proposals')
      }
    } else {
      // For submitted proposals, only admins can modify status
      if (body.status && !isAdmin) {
        return forbiddenResponse('Only admins can modify submitted proposals')
      }
    }

    // Build update object
    const updateData: Record<string, string | object> = {
      updated_at: new Date().toISOString(),
    }

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.status !== undefined) updateData.status = body.status
    if (body.approval_config !== undefined)
      updateData.approval_config = body.approval_config

    // Update proposal
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('proposals')
      .update(updateData)
      .eq('id', id)
      .select(
        `
        *,
        created_by_user:created_by(id, full_name, email),
        approver:approver_id(id, full_name, email),
        project:project_id(id, name, slug, color)
      `
      )
      .single()

    if (updateError) {
      return databaseErrorResponse('Failed to update proposal', updateError)
    }

    return mergeAuthResponse(successResponse(updated), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to update proposal', message)
  }
}

/**
 * DELETE /api/proposals/[id] - Delete proposal
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = params

    // Fetch existing proposal
    const { data: existingProposal, error: fetchError } = await supabaseAdmin
      .from('proposals')
      .select('id, workspace_id, created_by, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return databaseErrorResponse('Failed to fetch proposal', fetchError)
    }

    if (!existingProposal) {
      return notFoundResponse('Proposal', id)
    }

    // Verify user has access to the workspace
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', existingProposal.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse('You do not have access to this proposal')
    }

    // Check permissions: only creator or admins can delete
    const isCreator = existingProposal.created_by === user.id
    const isAdmin = ['owner', 'admin'].includes(membership.role)

    if (!isCreator && !isAdmin) {
      return forbiddenResponse('Only the creator or admins can delete proposals')
    }

    // Prevent deletion of merged proposals
    if (existingProposal.status === 'approved') {
      return forbiddenResponse('Cannot delete approved/merged proposals')
    }

    // Delete proposal (cascade will delete items)
    const { error: deleteError } = await supabaseAdmin
      .from('proposals')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return databaseErrorResponse('Failed to delete proposal', deleteError)
    }

    return mergeAuthResponse(successResponse({ deleted: true }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to delete proposal', message)
  }
}
