import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/services/openai'

/**
 * GET /api/ai/test-connection - Test OpenAI API connection
 * Public endpoint for debugging (should be protected in production)
 */
export async function GET(request: NextRequest) {
  try {
    // Check if API key is configured
    const hasApiKey = !!process.env.OPENAI_API_KEY
    const apiKeyLength = process.env.OPENAI_API_KEY?.length || 0

    console.log('🔍 OpenAI API Key Check:', {
      hasApiKey,
      keyLength: apiKeyLength,
      keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) + '...',
      nodeEnv: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production'
    })

    if (!hasApiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY environment variable is not set',
        debug: {
          nodeEnv: process.env.NODE_ENV,
          availableEnvVars: Object.keys(process.env).filter(k =>
            k.includes('OPENAI') || k.includes('NEXT_PUBLIC')
          )
        }
      }, { status: 500 })
    }

    // Test actual connection to OpenAI
    const testResult = await aiService.testConnection()

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      debug: {
        hasApiKey,
        keyLength: apiKeyLength,
        keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) + '...',
        nodeEnv: process.env.NODE_ENV,
        models: testResult.models
      }
    })
  } catch (error: any) {
    console.error('❌ OpenAI test connection error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
