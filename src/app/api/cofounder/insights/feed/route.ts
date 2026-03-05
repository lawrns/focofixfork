import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  forbiddenResponse,
  successResponse,
} from '@/lib/api/response-helpers'
import { verifyWorkspaceMembership } from '@/lib/cofounder-mode/config-resolver'

export const dynamic = 'force-dynamic'

interface FeedRow {
  id: string
  event_type: string
  severity: string
  title: string
  detail: string | null
  payload: Record<string, unknown>
  created_at: string
}

function parseWindowHours(value: string | null): number {
  if (!value) return 24
  const match = value.match(/^(\d+)(h|d)$/)
  if (!match) return 24
  const amount = Math.max(1, Number(match[1]))
  if (match[2] === 'd') return amount * 24
  return amount
}

export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response

    if (authError || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspace_id')
    const windowValue = searchParams.get('window')
    const windowHours = parseWindowHours(windowValue)

    if (workspaceId) {
      const isMember = await verifyWorkspaceMembership(supabase, user.id, workspaceId)
      if (!isMember) return mergeAuthResponse(forbiddenResponse('Workspace access denied'), authResponse)
    }

    const since = new Date(Date.now() - (windowHours * 60 * 60 * 1000)).toISOString()

    let query = supabase
      .from('cofounder_decisions_history')
      .select('id, event_type, severity, title, detail, payload, created_at')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    const { data, error } = await query.returns<FeedRow[]>()

    if (error) {
      const fallback = await supabase
        .from('ledger_events')
        .select('id, type, payload, timestamp')
        .eq('source', 'cofounder')
        .gte('timestamp', since)
        .order('timestamp', { ascending: false })
        .limit(100)

      const fallbackItems = (fallback.data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id,
        eventType: row.type,
        severity: 'info',
        title: typeof row.type === 'string' ? row.type : 'cofounder_event',
        detail: '',
        payload: row.payload ?? {},
        createdAt: row.timestamp,
      }))

      return mergeAuthResponse(
        successResponse({
          windowHours,
          source: 'ledger_fallback',
          items: fallbackItems,
        }),
        authResponse
      )
    }

    const items = (data ?? []).map((row) => ({
      id: row.id,
      eventType: row.event_type,
      severity: row.severity,
      title: row.title,
      detail: row.detail,
      payload: row.payload ?? {},
      createdAt: row.created_at,
    }))

    return mergeAuthResponse(
      successResponse({
        windowHours,
        source: 'cofounder_decisions_history',
        items,
      }),
      authResponse
    )
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load cofounder insights feed', error), authResponse)
  }
}
