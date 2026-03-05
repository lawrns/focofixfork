import type { SupabaseClient } from '@supabase/supabase-js'
import {
  resolvePivotalQuestion,
  type PivotalResolutionDecision,
  type ResolvePivotalResult,
} from '@/lib/cofounder-mode/pivotal-resolution'

interface PivotalOwnerRow {
  id: string
  user_id: string
  workspace_id: string | null
}

interface UserTelegramSettingsRow {
  [key: string]: unknown
}

export interface TelegramResolutionInput {
  pivotalId: string
  decision: PivotalResolutionDecision
  chatId?: string | null
  callbackQueryId?: string | null
  username?: string | null
  firstName?: string | null
  source: 'telegram_webhook' | 'clawdbot_bridge'
}

export interface TelegramResolutionResult extends ResolvePivotalResult {
  ownerUserId?: string
}

function normalizeChatId(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function resolvePivotalFromTelegram(
  supabase: SupabaseClient,
  input: TelegramResolutionInput
): Promise<TelegramResolutionResult> {
  const { data: row, error: rowError } = await supabase
    .from('cofounder_pivotal_queue')
    .select('id, user_id, workspace_id')
    .eq('id', input.pivotalId)
    .maybeSingle<PivotalOwnerRow>()

  if (rowError) {
    return {
      ok: false,
      code: 'database_error',
      message: rowError.message,
    }
  }

  if (!row) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Pivotal question not found',
    }
  }

  const incomingChatId = normalizeChatId(input.chatId)

  const { data: settings, error: settingsError } = await supabase
    .from('user_notification_settings')
    .select('*')
    .eq('user_id', row.user_id)
    .maybeSingle<UserTelegramSettingsRow>()

  if (settingsError) {
    return {
      ok: false,
      code: 'database_error',
      message: settingsError.message,
    }
  }

  const expectedChatId = normalizeChatId(
    typeof settings?.telegram_chat_id === 'string' ? settings.telegram_chat_id : null
  )
  if (expectedChatId && incomingChatId && expectedChatId !== incomingChatId) {
    return {
      ok: false,
      code: 'forbidden',
      message: 'Telegram chat is not authorized for this pivotal question',
    }
  }

  return resolvePivotalQuestion(supabase, {
    pivotalId: input.pivotalId,
    decision: input.decision,
    resolverChannel: input.source === 'clawdbot_bridge' ? 'clawdbot' : 'telegram',
    resolverUserId: row.user_id,
    resolverMeta: {
      source: input.source,
      telegram: {
        chatId: incomingChatId,
        callbackQueryId: input.callbackQueryId ?? null,
        username: input.username ?? null,
        firstName: input.firstName ?? null,
      },
    },
  })
}
