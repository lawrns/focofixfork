import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * AI Health Check Endpoint
 *
 * Used by FloatingAIChat component to verify AI service availability.
 * Returns a simple status indicating the AI service is ready.
 */
export async function GET() {
  try {
    // Check if AI configuration is present
    const hasApiKey = !!(process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY)

    if (!hasApiKey) {
      return NextResponse.json({
        ok: false,
        status: 'unconfigured',
        message: 'AI service not configured - missing API key'
      }, { status: 503 })
    }

    return NextResponse.json({
      ok: true,
      status: 'ready',
      message: 'AI service is available'
    })

  } catch (error) {
    return NextResponse.json({
      ok: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
