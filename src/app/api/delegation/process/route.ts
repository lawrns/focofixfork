import { NextRequest, NextResponse } from 'next/server'
import { processDelegationTick } from '@/lib/delegation/engine'
import { processAutoExecutableSuggestions } from '@/lib/crico/auto-executor'

export const dynamic = 'force-dynamic'

const INTERNAL_TOKEN = process.env.DELEGATION_INTERNAL_TOKEN

export async function POST(req: NextRequest) {
  // Secure with internal token
  const authHeader = req.headers.get('Authorization')
  if (INTERNAL_TOKEN && authHeader !== `Bearer ${INTERNAL_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Process CRICO auto-executable suggestions first (creates work items for delegation)
    const autoResult = await processAutoExecutableSuggestions()
    const result = await processDelegationTick()
    return NextResponse.json({ success: true, result, autoExecution: autoResult })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[delegation/process] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
