import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  appendCofounderHistoryEvent,
  recordCofounderErrorAudit,
  resolveLatestScopeConfigs,
  runInitiativeCheckpointForScope,
} from '@/lib/cofounder-mode/runtime'

export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return true
  const bearer = req.headers.get('authorization')
  const header = req.headers.get('x-cron-secret')
  return bearer === `Bearer ${expected}` || header === expected
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'DB not available' }, { status: 500 })
  }

  try {
    const scopes = await resolveLatestScopeConfigs(supabaseAdmin)
    const results: Array<Record<string, unknown>> = []

    for (const scope of scopes) {
      try {
        const result = await runInitiativeCheckpointForScope(supabaseAdmin, scope)
        results.push({
          userId: scope.user_id,
          workspaceId: scope.workspace_id,
          ...result,
        })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown checkpoint error'
        await recordCofounderErrorAudit(supabaseAdmin, {
          userId: scope.user_id,
          workspaceId: scope.workspace_id,
          errorCode: 'initiative_checkpoint_failed',
          message,
        })

        await appendCofounderHistoryEvent(supabaseAdmin, {
          userId: scope.user_id,
          workspaceId: scope.workspace_id,
          eventType: 'initiative_checkpoint_failed',
          severity: 'error',
          title: 'Initiative checkpoint failed',
          detail: message,
        })

        results.push({
          userId: scope.user_id,
          workspaceId: scope.workspace_id,
          skipped: true,
          reason: 'error',
          error: message,
        })
      }
    }

    return NextResponse.json({
      ok: true,
      processedScopes: scopes.length,
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
