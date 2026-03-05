import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import {
  successResponse,
  authRequiredResponse,
  badRequestResponse,
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
      .from('foco_workspace_members')
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
    
    let projectMap: Record<string, { id: string; name: string; color: string; slug: string | null }> = {}
    
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('foco_projects')
        .select('id, name, color, slug')
        .in('id', projectIds)
      
      if (projects) {
        projectMap = projects.reduce((acc, p) => {
          acc[p.id] = { id: p.id, name: p.name, color: p.color || '#6366F1', slug: p.slug ?? null }
          return acc
        }, {} as Record<string, { id: string; name: string; color: string; slug: string | null }>)
      }
    }

    // Enrich milestones with project info
    const enrichedMilestones = (milestones || []).map(m => ({
      ...m,
      project: m.project_id ? projectMap[m.project_id] : null
    }))

    return mergeAuthResponse(successResponse(enrichedMilestones), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(databaseErrorResponse('Failed to fetch milestones', message), authResponse)
  }
}

export async function POST(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const body = await req.json()
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    if (!title) {
      return mergeAuthResponse(badRequestResponse('title is required'), authResponse)
    }

    const { data: memberRow, error: memberError } = await supabase
      .from('foco_workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (memberError || !memberRow?.workspace_id) {
      return mergeAuthResponse(
        databaseErrorResponse('Failed to resolve workspace membership', memberError),
        authResponse
      )
    }

    const insertData = {
      title,
      description: typeof body?.description === 'string' ? body.description : null,
      status: typeof body?.status === 'string' ? body.status : 'planned',
      priority: typeof body?.priority === 'string' ? body.priority : 'medium',
      start_date: typeof body?.start_date === 'string' ? body.start_date : null,
      due_date: typeof body?.due_date === 'string' ? body.due_date : null,
      project_id: typeof body?.project_id === 'string' ? body.project_id : null,
      workspace_id: memberRow.workspace_id,
      created_by: user.id,
    }

    const { data, error: dbError } = await supabase
      .from('milestones')
      .insert(insertData)
      .select('*')
      .single()

    if (dbError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to create milestone', dbError), authResponse)
    }

    return mergeAuthResponse(successResponse(data, undefined, 201), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(databaseErrorResponse('Failed to create milestone', message), authResponse)
  }
}
