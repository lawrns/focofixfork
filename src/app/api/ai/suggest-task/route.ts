import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/services/ai'

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

    // Generate AI suggestions
    const context = project_context ? `${milestone_description || ''}\nProject context: ${project_context}` : milestone_description || ''
    const suggestions = await aiService.suggestTasks(milestone_name, context)

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


