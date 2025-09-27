import { NextRequest, NextResponse } from 'next/server'
import { ollamaService } from '@/lib/services/ollama'

/**
 * GET /api/ai/health - Check AI service health and availability
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()

    // Test Ollama connection
    const connectionTest = await ollamaService.testConnection()

    // Test model availability
    let modelsTest: { success: boolean; models: any[]; error: string | null } = { success: false, models: [], error: null }
    if (connectionTest.success) {
      try {
        const models = await ollamaService.listModels()
        modelsTest = { success: true, models, error: null }
      } catch (error: any) {
        modelsTest = { success: false, models: [], error: error.message }
      }
    }

    // Test basic generation capability
    let generationTest: { success: boolean; response_time: number; error: string | null } = { success: false, response_time: 0, error: null }
    if (connectionTest.success && modelsTest.models.length > 0) {
      try {
        const genStartTime = Date.now()
        const response = await ollamaService.generate({
          model: ollamaService.config.defaultModel,
          prompt: 'Say "OK" in exactly 2 words.',
          options: { num_predict: 10, temperature: 0 }
        })
        const genEndTime = Date.now()
        generationTest = {
          success: Boolean(response.response && typeof response.response === 'string' && response.response.length > 0),
          response_time: genEndTime - genStartTime,
          error: null
        }
      } catch (error: any) {
        generationTest = { success: false, response_time: 0, error: error.message }
      }
    }

    const endTime = Date.now()
    const totalResponseTime = endTime - startTime

    const health = {
      status: connectionTest.success ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      response_time: totalResponseTime,
      services: {
        ollama: {
          status: connectionTest.success ? 'connected' : 'disconnected',
          host: ollamaService.config.host,
          message: connectionTest.message,
          models_available: modelsTest.models.length,
          models: modelsTest.models.slice(0, 5), // Limit to first 5 models
          generation_capable: generationTest.success,
          generation_response_time: generationTest.response_time
        }
      },
      capabilities: {
        task_suggestions: connectionTest.success,
        milestone_suggestions: connectionTest.success,
        project_analysis: connectionTest.success,
        code_assistance: connectionTest.success,
        chat_assistance: connectionTest.success && modelsTest.models.some(m => m.name.includes('mistral') || m.name.includes('llama'))
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
          ollama: {
            status: 'error',
            error: error.message
          }
        }
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ai/health - Perform a more comprehensive health check
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { include_performance_test = false, test_model = null } = body

    const startTime = Date.now()

    // Basic health check
    const basicHealth = await GET(request)
    const healthData = await basicHealth.json()

    // Additional performance testing if requested
    if (include_performance_test && healthData.services.ollama.status === 'connected') {
      try {
        const perfStartTime = Date.now()

        // Test with different prompt sizes
        const testPrompts = [
          'Hello',
          'Write a short paragraph about project management.',
          'Analyze this project: {"name": "Test Project", "tasks": [{"title": "Test Task", "status": "todo"}]}'
        ]

        const performanceResults = []

        for (const prompt of testPrompts) {
          const promptStartTime = Date.now()
          const response = await ollamaService.generate({
            model: test_model || ollamaService.config.defaultModel,
            prompt,
            options: { num_predict: 50, temperature: 0.5 }
          })
          const promptEndTime = Date.now()

          performanceResults.push({
            prompt_length: prompt.length,
            response_length: response.response.length,
            response_time: promptEndTime - promptStartTime,
            tokens_per_second: response.eval_count
              ? response.eval_count / ((response.eval_duration || 1) / 1000000000)
              : 0
          })
        }

        const perfEndTime = Date.now()

        healthData.performance_test = {
          duration: perfEndTime - perfStartTime,
          results: performanceResults,
          average_response_time: performanceResults.reduce((sum, r) => sum + r.response_time, 0) / performanceResults.length,
          average_tokens_per_second: performanceResults.reduce((sum, r) => sum + r.tokens_per_second, 0) / performanceResults.length
        }
      } catch (error: any) {
        healthData.performance_test = {
          error: 'Performance test failed',
          details: error.message
        }
      }
    }

    const endTime = Date.now()
    healthData.total_response_time = endTime - startTime

    return NextResponse.json(healthData)

  } catch (error: any) {
    console.error('Extended AI health check error:', error)

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Extended health check failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}