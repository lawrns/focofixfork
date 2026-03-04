import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic'

const OPTIMIZER_URL = 'http://127.0.0.1:18795/optimize'

export async function POST(req: NextRequest) {
  const { user, error: authError, response: authResponse } = await getAuthUser(req)
  if (authError || !user) {
    return mergeAuthResponse(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      authResponse
    )
  }

  let body: { raw_prompt?: string; include_codebase_context?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.raw_prompt?.trim()) {
    return NextResponse.json({ error: 'raw_prompt is required' }, { status: 400 })
  }

  try {
    const upstream = await fetch(OPTIMIZER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_prompt: body.raw_prompt,
        include_codebase_context: body.include_codebase_context ?? false,
      }),
      signal: AbortSignal.timeout(90_000),
    })

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      return NextResponse.json(
        { error: `Optimizer returned ${upstream.status}`, detail: text },
        { status: 502 }
      )
    }

    const data = await upstream.json()
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'TimeoutError') {
        return NextResponse.json({ error: 'Optimizer timed out' }, { status: 504 })
      }
      if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
        return NextResponse.json(
          { error: 'Prompt optimizer service is not running' },
          { status: 503 }
        )
      }
    }
    console.error('Prompt optimizer proxy error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 }
    )
  }
}
