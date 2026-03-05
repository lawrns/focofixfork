import { NextRequest } from 'next/server'
import { authRequiredResponse, successResponse, validationFailedResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { resolvePivotalFromTelegram } from '@/lib/cofounder-mode/telegram-resolution'
import { parsePivotalCallbackData, parsePivotalCommandText } from '@/lib/services/telegram-hitl'
import { answerTelegramCallbackQuery, sendTelegramAlert } from '@/lib/services/telegram'

export const dynamic = 'force-dynamic'

interface TelegramChat {
  id?: string | number
}

interface TelegramMessage {
  text?: string
  chat?: TelegramChat
}

interface TelegramUser {
  username?: string
  first_name?: string
}

interface TelegramCallbackQuery {
  id?: string
  data?: string
  from?: TelegramUser
  message?: TelegramMessage
}

interface TelegramUpdate {
  callback_query?: TelegramCallbackQuery
  message?: TelegramMessage & {
    from?: TelegramUser
  }
}

function webhookAuthorized(req: NextRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected) return true
  const provided = req.headers.get('x-telegram-bot-api-secret-token')
  return provided === expected
}

function chatIdToString(chat: TelegramChat | undefined): string | null {
  if (!chat?.id) return null
  return String(chat.id)
}

export async function POST(req: NextRequest) {
  if (!webhookAuthorized(req)) {
    return authRequiredResponse('Invalid Telegram webhook secret')
  }

  if (!supabaseAdmin) {
    return validationFailedResponse('Supabase admin client unavailable')
  }

  const rawBody = await req.text()
  let body: TelegramUpdate
  try {
    body = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return validationFailedResponse('Invalid Telegram webhook payload')
  }

  const callback = body.callback_query
  if (callback?.data) {
    const parsed = parsePivotalCallbackData(callback.data)
    if (!parsed) {
      if (callback.id) {
        await answerTelegramCallbackQuery(callback.id, 'Unsupported callback action')
      }
      return successResponse({ handled: false, reason: 'unsupported_callback' })
    }

    const result = await resolvePivotalFromTelegram(supabaseAdmin, {
      pivotalId: parsed.pivotalId,
      decision: parsed.decision,
      chatId: chatIdToString(callback.message?.chat),
      callbackQueryId: callback.id ?? null,
      username: callback.from?.username ?? null,
      firstName: callback.from?.first_name ?? null,
      source: 'telegram_webhook',
    })

    if (callback.id) {
      await answerTelegramCallbackQuery(
        callback.id,
        result.ok ? `Pivotal ${parsed.decision} recorded` : (result.message ?? 'Could not record decision')
      )
    }

    return successResponse({
      handled: result.ok,
      result: result.ok ? { item: result.item } : { code: result.code, message: result.message },
    })
  }

  const messageText = body.message?.text
  const parsedCommand = parsePivotalCommandText(messageText)
  if (parsedCommand) {
    const chatId = chatIdToString(body.message?.chat)
    const result = await resolvePivotalFromTelegram(supabaseAdmin, {
      pivotalId: parsedCommand.pivotalId,
      decision: parsedCommand.decision,
      chatId,
      username: body.message?.from?.username ?? null,
      firstName: body.message?.from?.first_name ?? null,
      source: 'telegram_webhook',
    })

    if (chatId) {
      const text = result.ok
        ? `Pivotal ${parsedCommand.pivotalId} marked as ${parsedCommand.decision}.`
        : `Could not process pivotal command: ${result.message ?? 'unknown error'}.`
      await sendTelegramAlert(text, { chatId, parseMode: 'HTML', severity: 'P2' })
    }

    return successResponse({
      handled: result.ok,
      result: result.ok ? { item: result.item } : { code: result.code, message: result.message },
    })
  }

  return successResponse({ handled: false, reason: 'ignored_update' })
}
