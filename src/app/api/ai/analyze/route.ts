import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/services/ai'

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

    // Check AI service health
    const healthCheck = await AIService.checkHealth()
    if (!healthCheck.available) {
      return NextResponse.json({
        success: true,
        data: {
          suggestions: [],
          analysis: 'AI service currently unavailable'
        },
        ai_available: false
      })
    }

    let suggestions: any[] = []
    let analysis = ''

    // Generate context-specific suggestions
    switch (context) {
      case 'project':
        suggestions = await AIService.suggestMilestones(content, project_context?.existing_milestones || [])
        break
      case 'milestone':
        suggestions = await AIService.suggestTasks(content, project_context?.description || '', project_context?.project_name)
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
      const projectAnalysis = await AIService.analyzeProject(project_context)
      analysis = projectAnalysis.summary
    }

    // Save suggestion for tracking (optional)
    try {
      await AIService.saveSuggestion({
        type: 'milestone',
        input_data: { context, content, project_context },
        output_data: { suggestions, analysis },
        user_id: userId
      })
    } catch (error) {
      console.error('Failed to save AI suggestion:', error)
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


