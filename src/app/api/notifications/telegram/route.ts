import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { sendTelegramAlert } from '@/lib/services/telegram'

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(req: NextRequest) {
  // Allow auth via session OR CRON_SECRET header
  const cronHeader = req.headers.get('x-cron-secret')
  const isCronAuth = CRON_SECRET && cronHeader === CRON_SECRET

  if (!isCronAuth) {
    const { user, error: authError, response: authResponse } = await getAuthUser(req)
    if (authError || !user) {
      return mergeAuthResponse(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        authResponse
      )
    }
  }

  try {
    const { message, chatId } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    const result = await sendTelegramAlert(message, { chatId })
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
