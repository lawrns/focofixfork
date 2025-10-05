import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/services/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { context, content, project_context } = body

    if (!context || !content) {
      return NextResponse.json(
        { success: false, error: 'Context and content are required' },
        { status: 400 }
      )
    }

    // Get user ID from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    let suggestions: any[] = []
    let analysis = ''

    // Generate context-specific suggestions
    switch (context) {
      case 'project':
        suggestions = await aiService.suggestMilestones(content, project_context?.existing_milestones)
        break
      case 'milestone':
        suggestions = await aiService.suggestTasks(content, project_context?.description || '')
        break
      case 'task':
        // Could add task-specific suggestions here
        suggestions = []
        break
      default:
        suggestions = []
    }

    // Generate analysis if project context is available
    if (project_context && context === 'project') {
      analysis = await aiService.analyzeProject(project_context)
    }

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        analysis
      },
      ai_available: true
    })
  } catch (error) {
    console.error('AI analyze API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        fallback_message: 'AI service temporarily unavailable'
      },
      { status: 500 }
    )
  }
}


