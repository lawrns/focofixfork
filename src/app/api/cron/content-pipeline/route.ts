import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { SourcePoller } from '@/features/content-pipeline/services/source-poller'

export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return true

  const bearer = req.headers.get('authorization')
  const header = req.headers.get('x-cron-secret')
  return bearer === `Bearer ${expected}` || header === expected
}

function isSourceDue(source: {
  poll_interval_minutes?: number | null
  last_checked_at?: string | null
}): boolean {
  const intervalMinutes = Math.max(1, source.poll_interval_minutes ?? 60)
  if (!source.last_checked_at) return true

  const lastCheckedAt = new Date(source.last_checked_at)
  if (Number.isNaN(lastCheckedAt.getTime())) return true

  const nextCheckAt = lastCheckedAt.getTime() + (intervalMinutes * 60 * 1000)
  return Date.now() >= nextCheckAt
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'DB not available' }, { status: 500 })
  }

  try {
    const limit = Number.parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10)
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20

    const { data: sources, error } = await supabaseAdmin
      .from('content_sources')
      .select('*')
      .eq('status', 'active')
      .order('last_checked_at', { ascending: true, nullsFirst: true })
      .limit(200)

    if (error) {
      throw error
    }

    const dueSources = (sources ?? []).filter(isSourceDue).slice(0, safeLimit)
    const results: Array<Record<string, unknown>> = []

    for (const source of dueSources) {
      const result = await SourcePoller.pollSource(source as any)
      results.push({
        source_id: source.id,
        source_name: source.name,
        poll_interval_minutes: source.poll_interval_minutes,
        ...result,
      })
    }

    return NextResponse.json({
      ok: true,
      processed: dueSources.length,
      skipped: Math.max((sources ?? []).length - dueSources.length, 0),
      results,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
