import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic'

// Helper to generate CSV from tasks
function generateCSV(tasks: any[]): string {
  const headers = ['id', 'title', 'description', 'status', 'priority', 'due_date', 'assignee_id', 'tags', 'created_at']
  const headerRow = headers.join(',')

  const rows = tasks.map(task => {
    return headers.map(header => {
      let value = task[header]

      // Handle array fields (tags)
      if (Array.isArray(value)) {
        value = value.join(';')
      }

      // Handle null/undefined
      if (value === null || value === undefined) {
        return ''
      }

      // Escape CSV values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`
      }

      return value
    }).join(',')
  })

  return [headerRow, ...rows].join('\n')
}

// Helper to generate JSON from tasks
function generateJSON(tasks: any[]): string {
  return JSON.stringify(tasks, null, 2)
}

// Helper to generate export filename
function generateExportFilename(projectName: string, format: 'csv' | 'json'): string {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const cleanProjectName = projectName.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  return `tasks-${cleanProjectName}-${date}.${format}`
}

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), authResponse)
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') as 'csv' | 'json'
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assigneeId = searchParams.get('assignee_id')

    // Validate format
    if (!['csv', 'json'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Use csv or json.' },
        { status: 400 }
      )
    }

    // Require project_id
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to project
    const { data: project, error: projectError } = await supabase
      .from('foco_projects')
      .select('id, name, workspace_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Build query for tasks with labels via join table
    let query = supabase
      .from('work_items')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        assignee_id,
        created_at,
        work_item_labels!inner(
          labels(id, name, color)
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (assigneeId) {
      query = query.eq('assignee_id', assigneeId)
    }

    const { data: tasks, error: queryError } = await query

    if (queryError) {
      console.error('Tasks export fetch error:', queryError)
      return NextResponse.json(
        { success: false, error: queryError.message },
        { status: 500 }
      )
    }

    // Generate export content
    const content = format === 'csv' ? generateCSV(tasks || []) : generateJSON(tasks || [])
    const contentType = format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8'
    const filename = generateExportFilename(project.name, format)

    // Return file with appropriate headers
    return mergeAuthResponse(new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }), authResponse)
  } catch (err: any) {
    console.error('Tasks export API error:', err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
