import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: true,
        data: { tasks: [], projects: [] }
      })
    }

    const searchQuery = `%${query.trim()}%`

    // Search projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('foco_projects')
      .select('id, name, slug, description, status')
      .or(`name.ilike.${searchQuery},description.ilike.${searchQuery}`)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (projectsError) {
      console.error('Projects search error:', projectsError)
    }

    // Search tasks (work_items)
    const { data: tasksData, error: tasksError } = await supabase
      .from('work_items')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        project:foco_projects(name, slug)
      `)
      .or(`title.ilike.${searchQuery},description.ilike.${searchQuery}`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (tasksError) {
      console.error('Tasks search error:', tasksError)
    }

    return NextResponse.json({
      success: true,
      data: {
        projects: projectsData || [],
        tasks: tasksData || []
      }
    })
  } catch (err: any) {
    console.error('Search API error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
