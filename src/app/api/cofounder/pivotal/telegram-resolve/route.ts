import { NextRequest } from 'next/server'
import {
  authRequiredResponse,
  databaseErrorResponse,
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authorizeOpenClawRequest } from '@/lib/security/openclaw-auth'
import { resolvePivotalFromTelegram } from '@/lib/cofounder-mode/telegram-resolution'
import { parsePivotalCallbackData } from '@/lib/services/telegram-hitl'
import { answerTelegramCallbackQuery } from '@/lib/services/telegram'
import type { PivotalResolutionDecision } from '@/lib/cofounder-mode/pivotal-resolution'

export const dynamic = 'force-dynamic'

interface TelegramMetadataInput {
  chat_id?: string | number
  callback_query_id?: string
  username?: string
  first_name?: string
}

function parseDecision(input: Record<string, unknown>): {
  pivotalId: string
  decision: PivotalResolutionDecision
  telegram: TelegramMetadataInput
} | null {
  const telegram: TelegramMetadataInput = input.telegram && typeof input.telegram === 'object'
    ? input.telegram as TelegramMetadataInput
    : {}

  if (typeof input.callback_data === 'string') {
    const parsed = parsePivotalCallbackData(input.callback_data)
    if (parsed) {
      return {
        pivotalId: parsed.pivotalId,
        decision: parsed.decision,
        telegram,
      }
    }
  }

  const pivotalId = typeof input.pivotal_id === 'string'
    ? input.pivotal_id
    : typeof input.pivotalId === 'string'
      ? input.pivotalId
      : null

  const rawDecision = typeof input.resolution === 'string'
    ? input.resolution
    : typeof input.decision === 'string'
      ? input.decision
      : null

  if (!pivotalId || !rawDecision) return null

  const normalizedDecision = rawDecision.trim().toLowerCase()
  const decision = normalizedDecision === 'approve' || normalizedDecision === 'reject' || normalizedDecision === 'defer' || normalizedDecision === 'resolved'
    ? normalizedDecision
    : null

  if (!decision) return null

  return {
    pivotalId: pivotalId.trim(),
    decision,
    telegram,
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  if (!authorizeOpenClawRequest(req, rawBody)) {
    return authRequiredResponse('OpenClaw service authentication required')
  }

  if (!supabaseAdmin) {
    return databaseErrorResponse('Supabase admin client unavailable')
  }

  let body: Record<string, unknown> = {}
  try {
    body = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return validationFailedResponse('Invalid JSON body')
  }

  const parsed = parseDecision(body)
  if (!parsed) {
    return validationFailedResponse('pivotal_id and resolution are required')
  }

  const chatId = parsed.telegram.chat_id !== undefined && parsed.telegram.chat_id !== null
    ? String(parsed.telegram.chat_id)
    : null

  const result = await resolvePivotalFromTelegram(supabaseAdmin, {
    pivotalId: parsed.pivotalId,
    decision: parsed.decision,
    chatId,
    callbackQueryId: parsed.telegram.callback_query_id ?? null,
    username: parsed.telegram.username ?? null,
    firstName: parsed.telegram.first_name ?? null,
    source: 'clawdbot_bridge',
  })

  if (!result.ok) {
    if (result.code === 'not_found') {
      return notFoundResponse('Pivotal question', parsed.pivotalId)
    }
    if (result.code === 'forbidden') {
      return forbiddenResponse(result.message ?? 'Forbidden')
    }
    if (result.code === 'invalid_state') {
      return validationFailedResponse(result.message ?? 'Invalid pivotal state')
    }
    return databaseErrorResponse('Failed to resolve pivotal question', result.message)
  }

  if (parsed.telegram.callback_query_id) {
    await answerTelegramCallbackQuery(
      parsed.telegram.callback_query_id,
      `Pivotal ${parsed.decision} recorded`
    )
  }

  return successResponse({
    item: result.item,
    ownerUserId: result.ownerUserId,
  })
}
