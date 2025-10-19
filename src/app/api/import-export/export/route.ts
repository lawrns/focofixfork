import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ExportData, ExportFormat } from '@/lib/utils/import-export'

export async function POST(request: NextRequest) {
  try {
    const { format, userId, organizationId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    // Fetch user's data
    const [organizationsResult, projectsResult, tasksResult, labelsResult] = await Promise.all([
      // Organizations
      supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // Projects
      supabaseAdmin
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // Tasks
      supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // Labels
      supabaseAdmin
        .from('labels')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ])
    
    if (organizationsResult.error) {
      console.error('Error fetching organizations:', organizationsResult.error)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }
    
    if (projectsResult.error) {
      console.error('Error fetching projects:', projectsResult.error)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }
    
    if (tasksResult.error) {
      console.error('Error fetching tasks:', tasksResult.error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }
    
    if (labelsResult.error) {
      console.error('Error fetching labels:', labelsResult.error)
      return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 })
    }
    
    // Prepare export data
    const exportData: ExportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        format: format as ExportFormat,
        source: 'foco'
      },
      data: {
        organizations: organizationsResult.data || [],
        projects: projectsResult.data || [],
        tasks: tasksResult.data || [],
        labels: labelsResult.data || []
      }
    }
    
    return NextResponse.json({
      success: true,
      data: exportData,
      summary: {
        organizations: organizationsResult.data?.length || 0,
        projects: projectsResult.data?.length || 0,
        tasks: tasksResult.data?.length || 0,
        labels: labelsResult.data?.length || 0
      }
    })
    
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
