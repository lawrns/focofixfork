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
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/proposals/[id]/merge - Merge approved items into real tasks
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
    const force = body.force || false

    // Fetch existing proposal
    const { data: proposal, error: fetchError } = await supabaseAdmin
      .from('proposals')
      .select('id, workspace_id, project_id, created_by, status, approver_id')
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
      .select('id, role')
      .eq('workspace_id', proposal.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse('You do not have access to this proposal')
    }

    // Check permissions: only approver or admins can merge
    const isApprover = proposal.approver_id === user.id
    const isAdmin = ['owner', 'admin'].includes(membership.role)

    if (!isApprover && !isAdmin) {
      return forbiddenResponse('Only the approver or admins can merge proposals')
    }

    // Validate proposal is in correct status
    if (!force && proposal.status !== 'pending_review') {
      return badRequestResponse(
        `Cannot merge proposal with status '${proposal.status}'. Only proposals pending review can be merged.`
      )
    }

    // Fetch approved items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('proposal_items')
      .select('*')
      .eq('proposal_id', id)
      .eq('approval_status', 'approved')
      .order('position', { ascending: true })

    if (itemsError) {
      return databaseErrorResponse('Failed to fetch proposal items', itemsError)
    }

    if (!items || items.length === 0) {
      return badRequestResponse(
        'No approved items to merge. Please approve at least one item.'
      )
    }

    const mergeResults = {
      tasks_created: 0,
      tasks_updated: 0,
      tasks_deleted: 0,
      errors: [] as any[],
    }

    // Process each approved item
    for (const item of items) {
      try {
        if (item.entity_type === 'task') {
          if (item.action === 'add') {
            // Create new task
            const taskData = {
              workspace_id: proposal.workspace_id,
              project_id: proposal.project_id,
              reporter_id: proposal.created_by,
              ...item.proposed_state,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            const { error: createError } = await supabaseAdmin
              .from('work_items')
              .insert(taskData)

            if (createError) {
              mergeResults.errors.push({
                item_id: item.id,
                action: 'add',
                error: createError.message,
              })
            } else {
              mergeResults.tasks_created++
            }
          } else if (item.action === 'modify' && item.entity_id) {
            // Update existing task
            const updateData = {
              ...item.proposed_state,
              updated_at: new Date().toISOString(),
            }

            const { error: updateError } = await supabaseAdmin
              .from('work_items')
              .update(updateData)
              .eq('id', item.entity_id)

            if (updateError) {
              mergeResults.errors.push({
                item_id: item.id,
                action: 'modify',
                entity_id: item.entity_id,
                error: updateError.message,
              })
            } else {
              mergeResults.tasks_updated++
            }
          } else if (item.action === 'remove' && item.entity_id) {
            // Delete task
            const { error: deleteError } = await supabaseAdmin
              .from('work_items')
              .delete()
              .eq('id', item.entity_id)

            if (deleteError) {
              mergeResults.errors.push({
                item_id: item.id,
                action: 'remove',
                entity_id: item.entity_id,
                error: deleteError.message,
              })
            } else {
              mergeResults.tasks_deleted++
            }
          }
        }
        // TODO: Handle other entity types (milestone, assignment, dependency)
      } catch (itemError: any) {
        mergeResults.errors.push({
          item_id: item.id,
          error: itemError.message,
        })
      }
    }

    // Update proposal status
    const finalStatus =
      mergeResults.errors.length > 0 ? 'partially_approved' : 'approved'

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('proposals')
      .update({
        status: finalStatus,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
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
      return databaseErrorResponse(
        'Failed to update proposal status',
        updateError
      )
    }

    return mergeAuthResponse(
      successResponse({
        proposal: updated,
        merge_results: mergeResults,
      }),
      authResponse
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to merge proposal', message)
  }
}
