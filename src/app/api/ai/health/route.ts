import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/services/openai'

/**
 * GET /api/ai/health - Check AI service health and availability
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()

    // Test OpenAI connection
    const connectionTest = await aiService.testConnection()

    const endTime = Date.now()
    const totalResponseTime = endTime - startTime

    const health = {
      status: connectionTest.success ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      response_time: totalResponseTime,
      services: {
        openai: {
          status: connectionTest.success ? 'connected' : 'disconnected',
          message: connectionTest.message,
          models_available: connectionTest.models?.length || 0,
          models: connectionTest.models?.slice(0, 5) || [],
          provider: 'OpenAI API'
        }
      },
      capabilities: {
        task_suggestions: connectionTest.success,
        milestone_suggestions: connectionTest.success,
        project_analysis: connectionTest.success,
        code_assistance: connectionTest.success,
        chat_assistance: connectionTest.success
      }
    }

    // Return appropriate HTTP status
    const httpStatus = connectionTest.success ? 200 : 503 // 503 Service Unavailable

    return NextResponse.json(health, { status: httpStatus })

  } catch (error: any) {
    console.error('AI health check error:', error)

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        details: error.message,
        services: {
          openai: {
            status: 'error',
            error: error.message
          }
        }
      },
      { status: 500 }
    )
  }
}

