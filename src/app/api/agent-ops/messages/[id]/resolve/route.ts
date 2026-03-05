import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  notFoundResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { logClawdActionVisibility } from '@/lib/cofounder-mode/clawd-visibility'
import type { AgentOpsMessageRow } from '@/lib/agent-ops/types'

export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ id: string }>
}

const resolveSchema = z.object({
  action: z.enum(['resolve', 'archive']).default('resolve'),
})

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => ({}))
  const parsed = resolveSchema.safeParse(body)
  if (!parsed.success) {
    return mergeAuthResponse(validationFailedResponse('Invalid resolve payload', parsed.error.flatten()), authResponse)
  }

  const { data: existing, error: fetchError } = await supabase
    .from('agent_ops_messages')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle<AgentOpsMessageRow>()

  if (fetchError) return mergeAuthResponse(databaseErrorResponse('Failed to load message', fetchError.message), authResponse)
  if (!existing) return mergeAuthResponse(notFoundResponse('Message', id), authResponse)

  const nextStatus = parsed.data.action === 'archive' ? 'archived' : 'resolved'

  const { data, error: updateError } = await supabase
    .from('agent_ops_messages')
    .update({
      status: nextStatus,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single<AgentOpsMessageRow>()

  if (updateError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to update message', updateError.message), authResponse)
  }

  await logClawdActionVisibility(supabase, {
    userId: user.id,
    workspaceId: data.workspace_id,
    eventType: 'agent_ops_message_resolved',
    title: data.subject,
    detail: `status=${nextStatus}`,
    payload: {
      message_id: data.id,
      status: nextStatus,
    },
    contextId: data.id,
  })

  return mergeAuthResponse(successResponse({ item: data }), authResponse)
}
