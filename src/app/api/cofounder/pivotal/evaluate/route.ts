import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  forbiddenResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { resolveEffectiveCoFounderModeConfig, verifyWorkspaceMembership } from '@/lib/cofounder-mode/config-resolver'
import { evaluatePivotalQuestion } from '@/lib/cofounder-mode/pivotal-questions'
import { sendPivotalTelegramAlert } from '@/lib/services/telegram'

export const dynamic = 'force-dynamic'

type PivotalPriority = 'low' | 'medium' | 'high' | 'critical'
interface UserNotificationSettings {
  [key: string]: unknown
}

function parseInput(body: Record<string, unknown>) {
  if (typeof body.question !== 'string' || body.question.trim().length === 0) {
    return null
  }

  const priority: PivotalPriority =
    body.priority === 'low' || body.priority === 'medium' || body.priority === 'high' || body.priority === 'critical'
      ? body.priority
      : 'medium'

  return {
    question: body.question.trim(),
    workspaceId: typeof body.workspace_id === 'string' ? body.workspace_id : null,
    priority,
    triggers: Array.isArray(body.triggers) ? body.triggers.filter((item): item is string => typeof item === 'string') : [],
    context: body.context && typeof body.context === 'object' ? body.context as Record<string, unknown> : {},
    silentMode: Boolean(body.silentMode),
  }
}

export async function POST(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    if (process.env.COFOUNDER_PIVOTAL_QUESTIONS_ENABLED === 'false') {
      return mergeAuthResponse(
        validationFailedResponse('Pivotal questions are disabled by environment flag'),
        authResponse
      )
    }

    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response

    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const input = parseInput(body)

    if (!input) {
      return mergeAuthResponse(validationFailedResponse('question is required'), authResponse)
    }

    if (input.workspaceId) {
      const isMember = await verifyWorkspaceMembership(supabase, user.id, input.workspaceId)
      if (!isMember) return mergeAuthResponse(forbiddenResponse('Workspace access denied'), authResponse)
    }

    const resolved = await resolveEffectiveCoFounderModeConfig(supabase, user.id, input.workspaceId)

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const startOfHour = new Date()
    startOfHour.setMinutes(0, 0, 0)

    const dailyCountQuery = supabase
      .from('cofounder_pivotal_queue')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfDay.toISOString())

    const hourlyCountQuery = supabase
      .from('cofounder_pivotal_queue')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfHour.toISOString())
      .in('delivery_state', ['notified'])

    const lastAskedQuery = supabase
      .from('cofounder_pivotal_queue')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ created_at: string }>()

    const existingHashesQuery = supabase
      .from('cofounder_pivotal_queue')
      .select('dedupe_hash')
      .eq('user_id', user.id)
      .in('status', ['queued', 'notified'])
      .returns<Array<{ dedupe_hash: string }>>()

    const [{ count: askedToday }, { count: notifiedThisHour }, lastAsked, existingHashes] = await Promise.all([
      dailyCountQuery.then((res) => ({ count: res.count ?? 0 })),
      hourlyCountQuery.then((res) => ({ count: res.count ?? 0 })),
      lastAskedQuery,
      existingHashesQuery,
    ])

    const evaluation = evaluatePivotalQuestion(
      resolved.config,
      {
        question: input.question,
        workspaceId: input.workspaceId,
        priority: input.priority,
        triggers: input.triggers,
        context: input.context,
        silentMode: input.silentMode,
      },
      {
        askedToday,
        notifiedThisHour,
        lastAskedAt: lastAsked.data?.created_at,
        existingHashes: (existingHashes.data ?? []).map((row) => row.dedupe_hash),
      }
    )

    const insertPayload = {
      user_id: user.id,
      workspace_id: input.workspaceId,
      question: input.question,
      context: {
        priority: input.priority,
        ...input.context,
      },
      dedupe_hash: evaluation.dedupeHash,
      trigger_codes: evaluation.matchedTriggers,
      status: evaluation.shouldQueue ? 'queued' : 'suppressed',
      delivery_state: evaluation.shouldNotify ? 'queued' : evaluation.deliveryState,
      next_eligible_at: evaluation.reasonCodes.includes('cooldown_active')
        ? new Date(Date.now() + (resolved.config.pivotalQuestions.cooldownMinutes * 60000)).toISOString()
        : null,
    }

    const { data: row, error: insertError } = await supabase
      .from('cofounder_pivotal_queue')
      .insert(insertPayload)
      .select('id, status, delivery_state, created_at')
      .single<{ id: string; status: string; delivery_state: string; created_at: string }>()

    if (insertError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to persist pivotal question', insertError), authResponse)
    }

    let resolvedRow = row
    let telegram: { success: boolean; skipped: boolean; error?: string } = { success: false, skipped: true }
    if (evaluation.shouldNotify) {
      const { data: notificationSettings } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle<UserNotificationSettings>()

      const chatId = typeof notificationSettings?.telegram_chat_id === 'string'
        ? notificationSettings.telegram_chat_id
        : undefined

      if (!chatId) {
        telegram = { success: false, skipped: false, error: 'telegram_not_configured' }
      } else {
        const sent = await sendPivotalTelegramAlert({
          pivotalId: row.id,
          question: input.question,
          workspaceId: input.workspaceId,
          priority: input.priority,
        }, {
          userId: user.id,
          chatId,
        })

        telegram = {
          success: sent.success,
          skipped: false,
          ...(sent.error ? { error: sent.error } : {}),
        }
      }

      const deliveryState = telegram.success ? 'notified' : 'queued'
      const { data: updatedRow } = await supabase
        .from('cofounder_pivotal_queue')
        .update({
          delivery_state: deliveryState,
          context: {
            priority: input.priority,
            ...input.context,
            telegram: {
              attempted: true,
              sent: telegram.success,
              ...(telegram.error ? { error: telegram.error } : {}),
            },
          },
        })
        .eq('id', row.id)
        .select('id, status, delivery_state, created_at')
        .single<{ id: string; status: string; delivery_state: string; created_at: string }>()

      if (updatedRow) {
        resolvedRow = updatedRow
      }
    }

    await supabase.from('cofounder_decisions_history').insert({
      user_id: user.id,
      workspace_id: input.workspaceId,
      event_type: 'pivotal_question',
      severity: input.priority === 'critical' ? 'warning' : 'info',
      title: input.question.slice(0, 120),
      detail: evaluation.reasonCodes.join(', '),
      payload: {
        evaluation,
        telegram,
      },
    })

    return mergeAuthResponse(
      successResponse({
        item: resolvedRow,
        evaluation,
        telegram,
        configSource: resolved.source,
      }),
      authResponse
    )
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to evaluate pivotal question', error), authResponse)
  }
}
