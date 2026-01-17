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

    // Get user's workspace IDs first
    const { data: memberData, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)

    if (memberError) {
      return databaseErrorResponse('Failed to fetch workspace memberships', memberError)
    }

    if (!memberData || memberData.length === 0) {
      return successResponse([])
    }

    const workspaceIds = memberData.map(m => m.workspace_id)

    // Fetch milestones for user's workspaces with project info
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        start_date,
        end_date,
        due_date,
        progress_percentage,
        project_id,
        workspace_id,
        created_at,
        updated_at
      `)
      .in('workspace_id', workspaceIds)
      .order('start_date', { ascending: true })

    if (milestonesError) {
      return databaseErrorResponse('Failed to fetch milestones', milestonesError)
    }

    // Get project info for each milestone
    const projectIds = [...new Set((milestones || []).map(m => m.project_id).filter(Boolean))]
    
    let projectMap: Record<string, { name: string; color: string }> = {}
    
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('foco_projects')
        .select('id, name, color')
        .in('id', projectIds)
      
      if (projects) {
        projectMap = projects.reduce((acc, p) => {
          acc[p.id] = { name: p.name, color: p.color || '#6366F1' }
          return acc
        }, {} as Record<string, { name: string; color: string }>)
      }
    }

    // Enrich milestones with project info
    const enrichedMilestones = (milestones || []).map(m => ({
      ...m,
      project: m.project_id ? projectMap[m.project_id] : null
    }))

    return mergeAuthResponse(successResponse(enrichedMilestones), authResponse)
  } catch (err: any) {
    console.error('Milestones API error:', err)
    return mergeAuthResponse(databaseErrorResponse('Failed to fetch milestones', err.message), authResponse)
  }
}
