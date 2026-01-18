import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import {
  successResponse,
  authRequiredResponse,
  databaseErrorResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { searchParams } = new URL(req.url)
    const timeRange = searchParams.get('timeRange') || 'week'

    // Get user's workspace IDs
    const { data: memberData, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)

    if (memberError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch workspace memberships', memberError), authResponse)
    }

    if (!memberData || memberData.length === 0) {
      return mergeAuthResponse(successResponse({
        metrics: [],
        projectStatus: [],
        recentReports: []
      }), authResponse)
    }

    const workspaceIds = memberData.map(m => m.workspace_id)

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    if (timeRange === 'week') {
      startDate.setDate(now.getDate() - 7)
    } else if (timeRange === 'month') {
      startDate.setMonth(now.getMonth() - 1)
    } else if (timeRange === 'quarter') {
      startDate.setMonth(now.getMonth() - 3)
    }

    // Fetch projects for status
    const { data: projects, error: projectsError } = await supabase
      .from('foco_projects')
      .select('id, name, status, color')
      .in('workspace_id', workspaceIds)
      .neq('status', 'archived')

    // Silently handle project fetch errors - continue with empty array

    // Fetch work items for metrics
    const { data: workItems, error: workItemsError } = await supabase
      .from('work_items')
      .select('id, status, completed_at, created_at')
      .in('workspace_id', workspaceIds)
      .gte('created_at', startDate.toISOString())

    // Silently handle work items fetch errors - continue with empty array

    // Calculate metrics
    const completedTasks = (workItems || []).filter(w => w.status === 'done').length
    const totalTasks = (workItems || []).length
    const blockedTasks = (workItems || []).filter(w => w.status === 'blocked').length

    // Build project status
    const projectStatus = (projects || []).map(p => ({
      name: p.name,
      status: p.status === 'active' ? 'on_track' : p.status === 'at_risk' ? 'at_risk' : 'on_track',
      progress: 0, // Would need to calculate from work items
      tasksCompleted: 0,
      totalTasks: 0
    }))

    // Build metrics
    const metrics = [
      { 
        label: 'Tasks Completed', 
        value: completedTasks, 
        change: 0, 
        trend: 'up' as const, 
        positive: true 
      },
      { 
        label: 'Total Tasks', 
        value: totalTasks, 
        change: 0, 
        trend: 'stable' as const, 
        positive: true 
      },
      { 
        label: 'Blocked Items', 
        value: blockedTasks, 
        change: 0, 
        trend: blockedTasks > 0 ? 'up' as const : 'stable' as const, 
        positive: blockedTasks === 0 
      },
      { 
        label: 'Completion Rate', 
        value: totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%', 
        change: 0, 
        trend: 'stable' as const, 
        positive: true 
      },
    ]

    // Fetch recent reports from reports table
    const { data: recentReports } = await supabase
      .from('reports')
      .select('id, title, type, created_at')
      .in('workspace_id', workspaceIds)
      .order('created_at', { ascending: false })
      .limit(5)

    return mergeAuthResponse(successResponse({
      metrics,
      projectStatus,
      recentReports: (recentReports || []).map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        date: new Date(r.created_at).toLocaleDateString(),
        aiGenerated: false
      }))
    }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(databaseErrorResponse('Failed to fetch reports', message), authResponse)
  }
}
