import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/services/ai-service'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Test AIService directly
    const aiService = new AIService()

    const response = await aiService.chatCompletion([
      { role: 'user', content: 'Say hello in one word' }
    ])

    return NextResponse.json({
      success: true,
      response: response
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: message
    }, { status: 500 })
  }
}
