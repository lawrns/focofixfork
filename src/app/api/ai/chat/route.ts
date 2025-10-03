import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/services/openai'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    // Check OpenAI connection
    const connectionTest = await aiService.testConnection()
    if (!connectionTest.success) {
      // Return a friendly message instead of error
      return NextResponse.json({
        success: true,
        data: {
          message: `I apologize, but the AI service is currently unavailable. While I'm offline, you can:\n\n• Use the search bar to find tasks and projects\n• Create projects manually from the dashboard\n• Check documentation for help with features\n\nThe AI service will be back online soon!`,
          model: 'fallback'
        }
      })
    }

    // Generate response using OpenAI
    const response = await aiService.chat(message)

    return NextResponse.json({
      success: true,
      data: {
        message: response,
        model: aiService.config.chatModel
      }
    })

  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
