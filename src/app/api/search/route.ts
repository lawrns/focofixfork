import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), authResponse)
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type')
    const projectId = searchParams.get('project_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const status = searchParams.get('status')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: true,
        data: { tasks: [], projects: [] }
      })
    }

    const searchQuery = `%${query.trim()}%`
    let projectsData = []
    let tasksData = []

    // Search projects (if type is 'all' or 'project')
    if (!type || type === 'project') {
      let projectQuery = supabase
        .from('foco_projects')
        .select('id, name, slug, description, status')
        .or(`name.ilike.${searchQuery},description.ilike.${searchQuery}`)

      if (status) {
        projectQuery = projectQuery.eq('status', status)
      }

      const { data, error: projectsError } = await projectQuery
        .order('updated_at', { ascending: false })
        .limit(20)

      if (projectsError) {
        console.error('Projects search error:', projectsError)
      } else {
        projectsData = data || []
      }
    }

    // Search tasks (if type is 'all' or 'task')
    if (!type || type === 'task') {
      let taskQuery = supabase
        .from('work_items')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          project:foco_projects(name, slug),
          created_at
        `)
        .or(`title.ilike.${searchQuery},description.ilike.${searchQuery}`)

      // Apply project filter
      if (projectId) {
        taskQuery = taskQuery.eq('project_id', projectId)
      }

      // Apply status filter
      if (status) {
        taskQuery = taskQuery.eq('status', status)
      }

      // Apply date filters
      if (dateFrom) {
        taskQuery = taskQuery.gte('created_at', `${dateFrom}T00:00:00Z`)
      }
      if (dateTo) {
        taskQuery = taskQuery.lte('created_at', `${dateTo}T23:59:59Z`)
      }

      const { data, error: tasksError } = await taskQuery
        .order('created_at', { ascending: false })
        .limit(20)

      if (tasksError) {
        console.error('Tasks search error:', tasksError)
      } else {
        tasksData = data || []
      }
    }

    return mergeAuthResponse(NextResponse.json({
      success: true,
      data: {
        projects: projectsData,
        tasks: tasksData
      }
    }), authResponse)
  } catch (err: any) {
    console.error('Search API error:', err)
    return mergeAuthResponse(NextResponse.json({ success: false, error: err.message }, { status: 500 }), authResponse)
  }
}
