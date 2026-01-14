import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { cachedFetch, generateCacheKey } from '@/lib/cache/redis'
import { CACHE_TTL } from '@/lib/cache/cache-config'

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')
    const assigneeId = searchParams.get('assignee_id')
    const workspaceId = searchParams.get('workspace_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')

    const cacheKey = generateCacheKey('tasks', {
      projectId: projectId || 'all',
      status: status || 'all',
      assigneeId: assigneeId || 'all',
      workspaceId: workspaceId || 'all',
      limit,
      offset,
    })

    const result = await cachedFetch(
      cacheKey,
      async () => {
        // OPTIMIZATION: Select only necessary columns (20-40% data reduction)
        let query = supabase
          .from('work_items')
          .select(`
            id,
            title,
            description,
            status,
            priority,
            type,
            project_id,
            workspace_id,
            assignee_id,
            reporter_id,
            due_date,
            position,
            created_at,
            updated_at
          `, { count: 'exact' })
          .order('position', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (projectId) {
          query = query.eq('project_id', projectId)
        }

        if (status) {
          query = query.eq('status', status)
        }

        if (assigneeId) {
          query = query.eq('assignee_id', assigneeId)
        }

        if (workspaceId) {
          query = query.eq('workspace_id', workspaceId)
        }

        const { data, error: queryError, count } = await query

        if (queryError) {
          console.error('Tasks fetch error:', queryError)
          throw new Error(queryError.message)
        }

        return {
          data: data || [],
          pagination: {
            limit,
            offset,
            total: count || 0,
            hasMore: (count || 0) > offset + limit
          }
        }
      },
      { ttl: CACHE_TTL.TASKS }
    )

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (err: any) {
    console.error('Tasks API error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
    }

    if (!body.project_id) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 })
    }

    // Get workspace_id from project
    const { data: projectData } = await supabase
      .from('foco_projects')
      .select('workspace_id')
      .eq('id', body.project_id)
      .single()

    if (!projectData) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    const taskData = {
      title: body.title,
      description: body.description || null,
      status: body.status || 'backlog',
      priority: body.priority || 'none',
      project_id: body.project_id,
      workspace_id: projectData.workspace_id,
      assignee_id: body.assignee_id || null,
      due_date: body.due_date || null,
      position: body.position || 0,
      reporter_id: user.id,
      type: 'task',
    }

    const { data, error: insertError } = await supabase
      .from('work_items')
      .insert(taskData)
      .select()
      .single()

    if (insertError) {
      console.error('Task create error:', insertError)
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    // OPTIMIZATION: Invalidate related caches after mutation
    const { invalidateCache } = await import('@/lib/cache/redis')
    const { CACHE_INVALIDATION_PATTERNS } = await import('@/lib/cache/cache-config')

    await invalidateCache(
      CACHE_INVALIDATION_PATTERNS.TASK(projectData.workspace_id, body.project_id)
    )

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err: any) {
    console.error('Tasks POST error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
