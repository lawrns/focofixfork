import { NextRequest, NextResponse } from 'next/server'
import { ollamaServerService } from '@/lib/services/ollama-server'

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
    const connectionTest = await ollamaServerService.testConnection()
    if (!connectionTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is currently unavailable',
          details: connectionTest.message
        },
        { status: 503 }
      )
    }

    // Generate response using Ollama
    const response = await ollamaServerService.generate({
      model: ollamaServerService.config.chatModel || 'llama2',
      prompt: `You are a helpful AI assistant for a project management application called Foco. The user's message: ${message}\n\nProvide a helpful, concise response.`,
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
