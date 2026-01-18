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
import { UpdateProposalItemSchema } from '@/lib/validation/schemas/proposal-api.schema'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/proposals/[id]/items/[itemId] - Update proposal item (approve/reject)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id, itemId } = params
    const body = await req.json()

    // Validate using Zod schema
    const validation = UpdateProposalItemSchema.safeParse({ body })
    if (!validation.success) {
      return databaseErrorResponse('Validation failed', validation.error.errors)
    }

    // Verify proposal exists and user has access
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('id, workspace_id, created_by, approver_id, status')
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

    // Verify item exists and belongs to proposal
    const { data: existingItem, error: itemError } = await supabaseAdmin
      .from('proposal_items')
      .select('*')
      .eq('id', itemId)
      .eq('proposal_id', id)
      .maybeSingle()

    if (itemError) {
      return databaseErrorResponse('Failed to fetch proposal item', itemError)
    }

    if (!existingItem) {
      return notFoundResponse('Proposal item', itemId)
    }

    // Check permissions based on what's being updated
    const isCreator = proposal.created_by === user.id
    const isApprover = proposal.approver_id === user.id
    const isAdmin = ['owner', 'admin'].includes(membership.role)

    // Approval status changes require approver or admin permissions
    if (body.approval_status !== undefined) {
      if (!isApprover && !isAdmin) {
        return forbiddenResponse(
          'Only the approver or admins can change approval status'
        )
      }

      // Can only approve/reject items in pending_review proposals
      if (proposal.status !== 'pending_review' && proposal.status !== 'partially_approved') {
        return forbiddenResponse(
          'Can only approve/reject items in proposals pending review'
        )
      }
    }

    // Other changes require creator or admin permissions on draft proposals
    if (
      proposal.status === 'draft' &&
      (body.proposed_state !== undefined ||
        body.ai_estimate !== undefined ||
        body.ai_assignment !== undefined)
    ) {
      if (!isCreator && !isAdmin) {
        return forbiddenResponse(
          'Only the creator or admins can modify items in draft proposals'
        )
      }
    }

    // Build update object
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (body.action !== undefined) updateData.action = body.action
    if (body.entity_type !== undefined) updateData.entity_type = body.entity_type
    if (body.entity_id !== undefined) updateData.entity_id = body.entity_id
    if (body.original_state !== undefined)
      updateData.original_state = body.original_state
    if (body.proposed_state !== undefined)
      updateData.proposed_state = body.proposed_state
    if (body.ai_estimate !== undefined) updateData.ai_estimate = body.ai_estimate
    if (body.ai_assignment !== undefined)
      updateData.ai_assignment = body.ai_assignment
    if (body.approval_status !== undefined)
      updateData.approval_status = body.approval_status
    if (body.reviewer_notes !== undefined)
      updateData.reviewer_notes = body.reviewer_notes
    if (body.position !== undefined) updateData.position = body.position

    // Update item
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('proposal_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single()

    if (updateError) {
      return databaseErrorResponse('Failed to update proposal item', updateError)
    }

    return mergeAuthResponse(successResponse(updated), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to update proposal item', message)
  }
}
