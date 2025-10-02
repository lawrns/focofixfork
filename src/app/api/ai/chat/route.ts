import { NextRequest, NextResponse } from 'next/server'
import { ollamaService } from '@/lib/services/ollama'

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

    // Check Ollama connection
    const connectionTest = await ollamaService.testConnection()
    if (!connectionTest.success) {
      // Return a friendly message instead of error
      return NextResponse.json({
        success: true,
        data: {
          message: `I apologize, but the AI service is currently offline for maintenance. While I'm unavailable, you can:\n\n• Use the search bar to find tasks and projects\n• Create projects manually from the dashboard\n• Check documentation for help with features\n\nThe AI service will be back online soon!`,
          model: 'fallback'
        }
      })
    }

    // Generate response using Ollama
    const response = await ollamaService.generate({
      model: ollamaService.config.chatModel || 'llama2',
      prompt: `You are a helpful AI assistant for a project management application called Foco. User says: ${message}`,
      options: {
        temperature: 0.7,
        num_predict: 500
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        message: response.response,
        model: response.model
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
