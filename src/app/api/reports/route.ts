import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { supabaseAdmin } from '@/lib/supabase-server'
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
    const projectSlug = searchParams.get('project_slug')
    const projectId = searchParams.get('project_id')
    const generateMode = searchParams.get('generate')

    // Use admin client to bypass RLS recursion on foco_workspace_members
    const adminClient = supabaseAdmin || supabase

    // Get user's workspace IDs
    const { data: memberData, error: memberError } = await adminClient
      .from('foco_workspace_members')
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

    const workspaceIds = memberData.map((m: { workspace_id: string }) => m.workspace_id)

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

    // Fetch projects for status (include null-status projects; neq alone excludes NULLs in PG)
    let projectQuery = supabase
      .from('foco_projects')
      .select('id, slug, name, status, color')
      .in('workspace_id', workspaceIds)
      .or('status.neq.archived,status.is.null')
    if (projectSlug) projectQuery = projectQuery.eq('slug', projectSlug)
    if (projectId) projectQuery = projectQuery.eq('id', projectId)
    const { data: projects, error: projectsError } = await projectQuery

    if (projectsError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch report projects', projectsError), authResponse)
    }
    const projectIds = (projects ?? []).map((project) => project.id)

    // Fetch work items for metrics
    const { data: workItems, error: workItemsError } = await supabase
      .from('work_items')
      .select('id, project_id, status, completed_at, created_at')
      .in('workspace_id', workspaceIds)
      .gte('created_at', startDate.toISOString())

    if (workItemsError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch report work items', workItemsError), authResponse)
    }

    // Calculate metrics
    const completedTasks = (workItems || []).filter(w => w.status === 'done').length
    const totalTasks = (workItems || []).length
    const blockedTasks = (workItems || []).filter(w => w.status === 'blocked').length

    const projectStats = new Map<string, { total: number; completed: number; blocked: number }>()
    for (const item of workItems || []) {
      const key = item.project_id
      if (!key) continue
      if (!projectStats.has(key)) {
        projectStats.set(key, { total: 0, completed: 0, blocked: 0 })
      }
      const stats = projectStats.get(key)!
      stats.total += 1
      if (item.status === 'done') stats.completed += 1
      if (item.status === 'blocked') stats.blocked += 1
    }

    // Build project status
    const projectStatus = (projects || []).map((project) => {
      const stats = projectStats.get(project.id) ?? { total: 0, completed: 0, blocked: 0 }
      const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      const derivedStatus =
        project.status === 'on_hold'
          ? 'at_risk'
          : stats.blocked > 0
            ? 'at_risk'
            : progress < 35 && stats.total > 0
              ? 'behind'
              : 'on_track'

      return {
        id: project.id,
        slug: project.slug,
        name: project.name,
        status: derivedStatus,
        progress,
        tasksCompleted: stats.completed,
        totalTasks: stats.total,
      }
    })

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
    let reportsQuery = supabase
      .from('reports')
      .select('id, title, report_type, created_at, is_ai_generated, project_id')
      .in('workspace_id', workspaceIds)
      .order('created_at', { ascending: false })
      .limit(5)

    if (projectId) {
      reportsQuery = reportsQuery.eq('project_id', projectId)
    } else if (projectSlug && projectIds.length > 0) {
      reportsQuery = reportsQuery.in('project_id', projectIds)
    }

    const { data: recentReports } = await reportsQuery

    return mergeAuthResponse(successResponse({
      metrics,
      projectStatus,
      reportScope: projectSlug || projectId ? 'project' : 'workspace',
      generated: generateMode === 'status',
      recentReports: (recentReports || []).map(r => ({
        id: r.id,
        title: r.title,
        type: r.report_type,
        date: new Date(r.created_at).toLocaleDateString(),
        aiGenerated: Boolean(r.is_ai_generated)
      }))
    }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(databaseErrorResponse('Failed to fetch reports', message), authResponse)
  }
}
