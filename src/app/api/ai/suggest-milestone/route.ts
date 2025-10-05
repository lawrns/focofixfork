import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/services/ai'

export async function POST(request: NextRequest) {
  try {
    const { project_description, existing_milestones } = await request.json()

    if (!project_description || typeof project_description !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Project description is required' },
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
    const suggestions = await aiService.suggestMilestones(project_description, existing_milestones || [])

    return NextResponse.json({
      success: true,
      data: suggestions,
      ai_available: true
    })

  } catch (error) {
    console.error('AI milestone suggestion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate milestone suggestions' },
      { status: 500 }
    )
  }
}