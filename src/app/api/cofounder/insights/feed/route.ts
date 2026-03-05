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

interface LedgerFeedRow {
  id: string
  type: string
  source: string
  payload: Record<string, unknown> | null
  timestamp: string
}

function parseWindowHours(value: string | null): number {
  if (!value) return 24
  const match = value.match(/^(\d+)(h|d)$/)
  if (!match) return 24
  const amount = Math.max(1, Number(match[1]))
  if (match[2] === 'd') return amount * 24
  return amount
}

function parseLimit(value: string | null): number {
  if (!value) return 200
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 200
  return Math.max(1, Math.min(500, Math.floor(parsed)))
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
    const limit = parseLimit(searchParams.get('limit'))

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
      .limit(limit)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    let ledgerQuery = supabase
      .from('ledger_events')
      .select('id, type, source, payload, timestamp')
      .eq('user_id', user.id)
      .gte('timestamp', since)
      .in('source', ['clawdbot', 'openclaw', 'foco_crons', 'telegram'])
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (workspaceId) {
      ledgerQuery = ledgerQuery.eq('workspace_id', workspaceId)
    }

    const [{ data, error }, { data: ledgerData, error: ledgerError }] = await Promise.all([
      query.returns<FeedRow[]>(),
      ledgerQuery.returns<LedgerFeedRow[]>(),
    ])

    if (error) {
      return mergeAuthResponse(databaseErrorResponse('Failed to load cofounder history feed', error), authResponse)
    }

    if (ledgerError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to load ledger feed', ledgerError), authResponse)
    }

    const historyItems = (data ?? []).map((row) => ({
      id: `history:${row.id}`,
      eventType: row.event_type,
      severity: row.severity,
      title: row.title,
      detail: row.detail,
      payload: row.payload ?? {},
      createdAt: row.created_at,
    }))

    const ledgerItems = (ledgerData ?? []).map((row) => ({
      id: `ledger:${row.id}`,
      eventType: row.type,
      severity: 'info',
      title: `[${row.source}] ${row.type}`,
      detail: '',
      payload: row.payload ?? {},
      createdAt: row.timestamp,
    }))

    const items = [...historyItems, ...ledgerItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)

    return mergeAuthResponse(
      successResponse({
        windowHours,
        source: 'cofounder+ledger',
        items,
      }),
      authResponse
    )
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load cofounder insights feed', error), authResponse)
  }
}
