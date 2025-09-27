import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/services/ai'

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

    // Check AI service health
    const healthCheck = await AIService.checkHealth()
    if (!healthCheck.available) {
      // Return fallback suggestions if AI is unavailable
      const suggestions = await AIService.suggestMilestones(project_description, existing_milestones || [])
      return NextResponse.json({
        success: true,
        data: suggestions,
        ai_available: false,
        message: 'Using fallback suggestions - AI service unavailable'
      })
    }

    // Generate AI suggestions
    const suggestions = await AIService.suggestMilestones(project_description, existing_milestones || [])

    // Save suggestion for tracking (optional)
    try {
      await AIService.saveSuggestion({
        type: 'milestone',
        input_data: { project_description, existing_milestones },
        output_data: { suggestions },
        user_id: userId
      })
    } catch (error) {
      // Don't fail the request if tracking fails
      console.error('Failed to save AI suggestion:', error)
    }

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