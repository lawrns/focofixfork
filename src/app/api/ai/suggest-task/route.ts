import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/services/ai'

export async function POST(request: NextRequest) {
  try {
    const { milestone_name, milestone_description, project_context } = await request.json()

    if (!milestone_name || typeof milestone_name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Milestone name is required' },
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
        data: [],
        ai_available: false,
        message: 'AI service unavailable - no task suggestions available'
      })
    }

    // Generate AI suggestions
    const suggestions = await AIService.suggestTasks(
      milestone_name,
      milestone_description || '',
      project_context
    )

    // Save suggestion for tracking (optional)
    try {
      await AIService.saveSuggestion({
        type: 'task',
        input_data: { milestone_name, milestone_description, project_context },
        output_data: { suggestions },
        user_id: userId
      })
    } catch (error) {
      console.error('Failed to save AI suggestion:', error)
    }

    return NextResponse.json({
      success: true,
      data: suggestions,
      ai_available: true
    })

  } catch (error) {
    console.error('AI task suggestion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate task suggestions' },
      { status: 500 }
    )
  }
}


