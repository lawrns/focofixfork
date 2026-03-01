import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/critter/swarm-event
 * Thin proxy that forwards UI swarm completion events to /api/openclaw/events,
 * adding the server-side OPENCLAW_SERVICE_TOKEN so it never has to be exposed
 * as a NEXT_PUBLIC_ variable.
 */
export async function POST(req: NextRequest) {
  const token = process.env.OPENCLAW_SERVICE_TOKEN ?? process.env.BOSUN_SERVICE_TOKEN ?? ''

  if (!token) {
    // No token configured — swarm events are optional, just skip silently
    return NextResponse.json({ ok: true, skipped: true })
  }

  const body = await req.json()

  const base = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3001}`

  const res = await fetch(`${base}/api/openclaw/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  }).catch(() => null)

  if (!res?.ok) {
    // Non-critical — return 200 so client never sees an error
    return NextResponse.json({ ok: true, forwarded: false })
  }

  return NextResponse.json({ ok: true, forwarded: true })
}
