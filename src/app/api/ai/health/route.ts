import { NextResponse } from 'next/server'
import { getAIRuntimeHealth } from '@/lib/ai/runtime-health'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const health = await getAIRuntimeHealth()
    return NextResponse.json(health, { status: health.ok ? 200 : 503 })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
