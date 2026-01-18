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

export const dynamic = 'force-dynamic'

/**
 * GET /api/proposals/[id]/impact - Get impact summary
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

    // Verify proposal exists and user has access
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('id, workspace_id, project_id')
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

    // Fetch proposal items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('proposal_items')
      .select('*')
      .eq('proposal_id', id)

    if (itemsError) {
      return databaseErrorResponse('Failed to fetch proposal items', itemsError)
    }

    // Calculate impact metrics
    let totalTasksAdded = 0
    let totalTasksModified = 0
    let totalTasksRemoved = 0
    let totalHoursAdded = 0
    let totalHoursRemoved = 0

    const workloadShifts: Array<{
      user_id: string
      user_name?: string
      hours_added: number
      current_utilization?: number
      new_utilization?: number
      delta?: number
    }> = []

    const assigneeWorkload: Record<string, number> = {}

    for (const item of items || []) {
      if (item.entity_type === 'task') {
        if (item.action === 'add') {
          totalTasksAdded++

          // Extract hours from AI estimate
          const estimatedHours = item.ai_estimate?.hours || 0
          totalHoursAdded += estimatedHours

          // Track assignee workload
          const assigneeId =
            item.ai_assignment?.assignee_id || item.proposed_state?.assignee_id

          if (assigneeId) {
            assigneeWorkload[assigneeId] =
              (assigneeWorkload[assigneeId] || 0) + estimatedHours
          }
        } else if (item.action === 'modify') {
          totalTasksModified++

          // Calculate hour delta if available
          const originalHours = item.original_state?.estimate_hours || 0
          const newHours =
            item.proposed_state?.estimate_hours || item.ai_estimate?.hours || 0
          const delta = newHours - originalHours

          if (delta > 0) {
            totalHoursAdded += delta
          } else if (delta < 0) {
            totalHoursRemoved += Math.abs(delta)
          }

          // Track assignee changes
          const newAssigneeId =
            item.ai_assignment?.assignee_id || item.proposed_state?.assignee_id
          if (newAssigneeId) {
            assigneeWorkload[newAssigneeId] =
              (assigneeWorkload[newAssigneeId] || 0) + Math.max(delta, 0)
          }
        } else if (item.action === 'remove') {
          totalTasksRemoved++

          // Remove hours
          const removedHours = item.original_state?.estimate_hours || 0
          totalHoursRemoved += removedHours
        }
      }
    }

    // Convert assignee workload to workload shifts
    // TODO: Fetch current workload from database for accurate utilization
    for (const [userId, hoursAdded] of Object.entries(assigneeWorkload)) {
      if (hoursAdded > 0) {
        // Fetch user profile
        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id, full_name')
          .eq('id', userId)
          .maybeSingle()

        workloadShifts.push({
          user_id: userId,
          user_name: userProfile?.full_name || undefined,
          hours_added: hoursAdded,
          current_utilization: undefined, // TODO: Calculate from existing tasks
          new_utilization: undefined, // TODO: Calculate projected utilization
          delta: undefined, // TODO: Calculate delta
        })
      }
    }

    // Identify resource conflicts
    const resourceConflicts: Array<{
      user_id: string
      user_name?: string
      reason: string
      severity: 'low' | 'medium' | 'high'
    }> = []

    // TODO: Implement conflict detection based on capacity_hours_per_week

    // Calculate risk score (0-10)
    let riskScore = 0

    // Add risk based on hours added
    if (totalHoursAdded > 40) riskScore += 3
    else if (totalHoursAdded > 20) riskScore += 2
    else if (totalHoursAdded > 10) riskScore += 1

    // Add risk based on tasks removed
    if (totalTasksRemoved > 5) riskScore += 2
    else if (totalTasksRemoved > 2) riskScore += 1

    // Add risk based on conflicts
    riskScore += resourceConflicts.length

    // Cap at 10
    riskScore = Math.min(riskScore, 10)

    // Build impact summary
    const impactSummary = {
      proposal_id: id,
      total_tasks_added: totalTasksAdded,
      total_tasks_modified: totalTasksModified,
      total_tasks_removed: totalTasksRemoved,
      total_hours_added: totalHoursAdded,
      total_hours_removed: totalHoursRemoved,
      workload_shifts: workloadShifts,
      deadline_impacts: [], // TODO: Implement deadline impact analysis
      resource_conflicts: resourceConflicts,
      risk_score: riskScore,
      calculated_at: new Date().toISOString(),
    }

    // Optionally save to proposal_impact_summary table
    try {
      await supabaseAdmin
        .from('proposal_impact_summary')
        .upsert(
          {
            proposal_id: id,
            ...impactSummary,
          },
          { onConflict: 'proposal_id' }
        )
    } catch {
      // Non-critical error, continue
    }

    return mergeAuthResponse(successResponse(impactSummary), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to calculate impact summary', message)
  }
}
