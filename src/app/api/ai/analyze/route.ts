import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { AIAnalyzeSchema } from '@/lib/validation/schemas/ai-api.schema'
import { checkRateLimit } from '@/server/utils/rateLimit'
import { aiService } from '@/lib/services/openai'

/**
 * POST /api/ai/analyze - Analyze text using AI
 * Rate limited: 10 AI requests per minute
 */
export async function POST(request: NextRequest) {
  return wrapRoute(AIAnalyzeSchema, async ({ input, user, req, correlationId }) => {
    // AI rate limit: 10 requests per minute
    await checkRateLimit(user.id, req.headers.get('x-forwarded-for'), 'ai')

    const result = await aiService.analyze({
      projectId: input.body.projectId,
      text: input.body.text,
      userId: user.id,
      correlationId
    })

    if (!result.success) {
      const err: any = new Error(result.error || 'AI service failed')
      err.code = 'AI_SERVICE_ERROR'
      err.statusCode = 500
      throw err
    }

    return result.data
  })(request)
}
