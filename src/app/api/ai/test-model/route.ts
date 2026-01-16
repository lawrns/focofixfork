import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/services/ai-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('=== AI Model Test ===')
    
    // Test AI Service configuration
    const aiService = new AIService()
    
    // Test a simple call
    const response = await aiService.chatCompletion([
      { role: 'user', content: 'What model are you using? Respond with just the model name.' }
    ])
    
    return NextResponse.json({ 
      success: true,
      model: process.env.DEEPSEEK_MODEL,
      response: response.trim()
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
