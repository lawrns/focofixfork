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

interface QueueRow {
  id: string
  question: string
  context: Record<string, unknown>
  trigger_codes: string[]
  status: string
  delivery_state: string
  resolution: string | null
  created_at: string
  updated_at: string
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

    if (workspaceId) {
      const isMember = await verifyWorkspaceMembership(supabase, user.id, workspaceId)
      if (!isMember) return mergeAuthResponse(forbiddenResponse('Workspace access denied'), authResponse)
    }

    let query = supabase
      .from('cofounder_pivotal_queue')
      .select('id, question, context, trigger_codes, status, delivery_state, resolution, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    const { data, error } = await query.returns<QueueRow[]>()

    if (error) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch pivotal queue', error), authResponse)
    }

    return mergeAuthResponse(successResponse({ items: data ?? [] }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to fetch pivotal queue', error), authResponse)
  }
}
