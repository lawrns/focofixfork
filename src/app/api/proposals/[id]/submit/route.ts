import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  successResponse,
  authRequiredResponse,
  notFoundResponse,
  databaseErrorResponse,
  forbiddenResponse,
  badRequestResponse,
  isValidUUID,
  invalidUUIDResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/proposals/[id]/submit - Submit proposal for review
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))

    // Validate approver_id if provided
    if (body.approver_id && !isValidUUID(body.approver_id)) {
      return invalidUUIDResponse('approver_id', body.approver_id)
    }

    // Fetch existing proposal
    const { data: proposal, error: fetchError } = await supabaseAdmin
      .from('proposals')
      .select('id, workspace_id, project_id, created_by, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return databaseErrorResponse('Failed to fetch proposal', fetchError)
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

    // Check permissions: only creator can submit
    if (proposal.created_by !== user.id) {
      return forbiddenResponse('Only the proposal creator can submit for review')
    }

    // Validate proposal is in draft status
    if (proposal.status !== 'draft') {
      return badRequestResponse(
        `Cannot submit proposal with status '${proposal.status}'. Only draft proposals can be submitted.`
      )
    }

    // Check that proposal has at least one item
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('proposal_items')
      .select('id')
      .eq('proposal_id', id)
      .limit(1)

    if (itemsError) {
      return databaseErrorResponse('Failed to check proposal items', itemsError)
    }

    if (!items || items.length === 0) {
      return badRequestResponse(
        'Cannot submit empty proposal. Please add at least one item.'
      )
    }

    // Verify approver has access to workspace if specified
    let approverId = body.approver_id || null
    if (approverId) {
      const { data: approverMembership } = await supabaseAdmin
        .from('workspace_members')
        .select('id, role')
        .eq('workspace_id', proposal.workspace_id)
        .eq('user_id', approverId)
        .maybeSingle()

      if (!approverMembership) {
        return badRequestResponse(
          'Specified approver does not have access to this workspace'
        )
      }

      // Verify approver has admin/owner role
      if (!['owner', 'admin'].includes(approverMembership.role)) {
        return badRequestResponse(
          'Specified approver must have admin or owner role'
        )
      }
    }

    // Update proposal status
    const updateData = {
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      approver_id: approverId,
    }

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
      return databaseErrorResponse('Failed to submit proposal', updateError)
    }

    return mergeAuthResponse(successResponse(updated), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to submit proposal', message)
  }
}
