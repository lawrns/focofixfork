import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/services/ai'

export async function POST(request: NextRequest) {
  try {
    const { type, context, requirements, tone } = await request.json()

    if (!type || !context) {
      return NextResponse.json(
        { success: false, error: 'Type and context are required' },
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
        data: 'Content generation not available - AI service is offline',
        ai_available: false
      })
    }

    // Generate content
    const contentRequest = {
      type,
      context,
      requirements: requirements || [],
      tone: tone || 'professional'
    }

    const generatedContent = await AIService.generateContent(contentRequest)

    // Save suggestion for tracking (optional)
    try {
      await AIService.saveSuggestion({
        type: 'content',
        input_data: contentRequest,
        output_data: { generated_content: generatedContent },
        user_id: userId
      })
    } catch (error) {
      console.error('Failed to save AI suggestion:', error)
    }

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


