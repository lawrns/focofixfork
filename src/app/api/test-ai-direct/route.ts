import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/services/ai-service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Test AI Direct Start ===')
    
    // Test AIService directly
    console.log('Creating AIService...')
    const aiService = new AIService()
    
    console.log('Calling chatCompletion...')
    const response = await aiService.chatCompletion([
      { role: 'user', content: 'Say hello in one word' }
    ])
    
    console.log('AI Response:', response)
    
    return NextResponse.json({ 
      success: true,
      response: response
    })
    
  } catch (error) {
    console.error('Test AI Direct Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      details: {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : undefined,
        ...(error as any)
      }
    }, { status: 500 })
  }
}
