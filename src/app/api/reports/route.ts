import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic';import {
  successResponse,
  authRequiredResponse,
  databaseErrorResponse,
} from '@/lib/api/response-helpers'

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return authRequiredResponse()
    }

    const { searchParams } = new URL(req.url)
    const timeRange = searchParams.get('timeRange') || 'week'

    // Get user's workspace IDs
    const { data: memberData, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)

    if (memberError) {
      return databaseErrorResponse('Failed to fetch workspace memberships', memberError)
    }

    if (!memberData || memberData.length === 0) {
      return successResponse({
        metrics: [],
        projectStatus: [],
        recentReports: []
      })
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

    if (projectsError) {
      console.error('Failed to fetch projects for reports:', projectsError)
    }

    // Fetch work items for metrics
    const { data: workItems, error: workItemsError } = await supabase
      .from('work_items')
      .select('id, status, completed_at, created_at')
      .in('workspace_id', workspaceIds)
      .gte('created_at', startDate.toISOString())

    if (workItemsError) {
      console.error('Failed to fetch work items for reports:', workItemsError)
    }

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

    return successResponse({
      metrics,
      projectStatus,
      recentReports: (recentReports || []).map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        date: new Date(r.created_at).toLocaleDateString(),
        aiGenerated: false
      }))
    })
  } catch (err: any) {
    console.error('Reports API error:', err)
    return databaseErrorResponse('Failed to fetch reports', err.message)
  }
}
