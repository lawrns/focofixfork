/**
 * Telegram Bot API client for sending operator alerts.
 *
 * Uses the Telegram Bot API directly (not via OpenClaw gateway).
 * Respects quiet hours when a userId is provided.
 */

import { assertEgressAllowed } from '@/lib/security/egress-filter'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const OPERATOR_CHAT_ID = process.env.TELEGRAM_OPERATOR_CHAT_ID

export interface TelegramSendOptions {
  chatId?: string
  parseMode?: 'HTML' | 'Markdown'
  /** If provided, quiet hours are checked for this user. */
  userId?: string
  /** P0 alerts bypass quiet hours. */
  severity?: 'P0' | 'P1' | 'P2' | 'P3'
}

export interface TelegramResult {
  success: boolean
  error?: string
  quietHoursSuppressed?: boolean
}

export interface TelegramPivotalPayload {
  question: string
  workspaceId?: string | null
  priority?: 'low' | 'medium' | 'high' | 'critical'
}

export async function sendTelegramAlert(
  message: string,
  opts?: TelegramSendOptions
): Promise<TelegramResult> {
  if (!BOT_TOKEN) {
    console.warn('[Telegram] BOT_TOKEN not configured, skipping alert')
    return { success: false, error: 'BOT_TOKEN not configured' }
  }

  const chatId = opts?.chatId ?? OPERATOR_CHAT_ID
  if (!chatId) {
    console.warn('[Telegram] No chat ID available, skipping alert')
    return { success: false, error: 'No chat ID' }
  }

  // Check quiet hours if userId provided (lazy-import to avoid circular deps)
  if (opts?.userId && opts.severity !== 'P0') {
    try {
      const { isQuietHoursActive } = await import('./quiet-hours')
      const quiet = await isQuietHoursActive(opts.userId)
      if (quiet) {
        console.log(`[Telegram] Quiet hours active for user ${opts.userId}, suppressing alert`)
        return { success: true, quietHoursSuppressed: true }
      }
    } catch {
      // quiet-hours module may not exist yet — proceed with send
    }
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
    assertEgressAllowed(url)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: opts?.parseMode ?? 'HTML',
      }),
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[Telegram] API error ${res.status}:`, body)
      return { success: false, error: `HTTP ${res.status}` }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Telegram] Send failed:', msg)
    return { success: false, error: msg }
  }
}

export async function sendPivotalTelegramAlert(
  payload: TelegramPivotalPayload,
  opts?: Omit<TelegramSendOptions, 'severity'>
): Promise<TelegramResult> {
  const priority = (payload.priority ?? 'medium').toUpperCase()
  const workspace = payload.workspaceId ?? 'global'
  const message = [
    '<b>Co-Founder Pivotal Question</b>',
    `Priority: <b>${priority}</b>`,
    `Workspace: <code>${workspace}</code>`,
    '',
    payload.question,
  ].join('\n')

  return sendTelegramAlert(message, {
    ...opts,
    severity: payload.priority === 'critical' ? 'P0' : 'P1',
  })
}
