import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/services/ai'

export async function POST(request: NextRequest) {
  try {
    const { project_name, keywords } = await request.json()

    if (!project_name) {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
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

    // Generate description
    const generatedContent = await aiService.generateDescription(project_name, keywords)

    return NextResponse.json({
      success: true,
      data: generatedContent,
      ai_available: true
    })

  } catch (error) {
    console.error('AI content generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}


