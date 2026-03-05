import { createHash } from 'node:crypto'
import type {
  CoFounderModeConfigV1,
  CoFounderPivotalEvaluationInput,
  CoFounderPivotalEvaluationResult,
  CoFounderPivotalWindowState,
} from '@/lib/cofounder-mode/types'

function minutesSince(lastAskedAt: string | null | undefined, now: Date): number {
  if (!lastAskedAt) return Number.POSITIVE_INFINITY
  const parsed = new Date(lastAskedAt)
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY
  return (now.getTime() - parsed.getTime()) / 60000
}

export function createPivotalDedupeHash(input: Pick<CoFounderPivotalEvaluationInput, 'question' | 'workspaceId'>): string {
  const normalized = `${(input.workspaceId ?? 'global').trim()}::${input.question.trim().toLowerCase()}`
  return createHash('sha256').update(normalized).digest('hex')
}

export function evaluatePivotalQuestion(
  config: CoFounderModeConfigV1,
  input: CoFounderPivotalEvaluationInput,
  state: CoFounderPivotalWindowState
): CoFounderPivotalEvaluationResult {
  const now = input.now ?? new Date()
  const dedupeHash = createPivotalDedupeHash({ question: input.question, workspaceId: input.workspaceId })
  const matchedTriggers = (input.triggers ?? []).filter((trigger) => config.pivotalQuestions.triggerRules.includes(trigger))

  const reasonCodes: string[] = []
  if (!config.pivotalQuestions.enabled) {
    reasonCodes.push('pivotal_disabled')
    return {
      shouldQueue: false,
      shouldNotify: false,
      deliveryState: 'suppressed',
      reasonCodes,
      dedupeHash,
      matchedTriggers,
    }
  }

  if ((state.existingHashes ?? []).includes(dedupeHash)) {
    reasonCodes.push('dedupe_hash_match')
    return {
      shouldQueue: false,
      shouldNotify: false,
      deliveryState: 'suppressed',
      reasonCodes,
      dedupeHash,
      matchedTriggers,
    }
  }

  const cooldownAgeMinutes = minutesSince(state.lastAskedAt, now)
  if (cooldownAgeMinutes < config.pivotalQuestions.cooldownMinutes) {
    reasonCodes.push('cooldown_active')
    return {
      shouldQueue: true,
      shouldNotify: false,
      deliveryState: 'queued',
      reasonCodes,
      dedupeHash,
      matchedTriggers,
    }
  }

  if (state.askedToday >= config.pivotalQuestions.maxPivotalQuestionsPerDay) {
    reasonCodes.push('daily_budget_exhausted')
    return {
      shouldQueue: true,
      shouldNotify: false,
      deliveryState: 'queued',
      reasonCodes,
      dedupeHash,
      matchedTriggers,
    }
  }

  if (state.notifiedThisHour >= config.pivotalQuestions.maxNotificationsPerHour) {
    reasonCodes.push('hourly_budget_exhausted')
    return {
      shouldQueue: true,
      shouldNotify: false,
      deliveryState: 'queued',
      reasonCodes,
      dedupeHash,
      matchedTriggers,
    }
  }

  if ((input.triggers ?? []).length > 0 && matchedTriggers.length === 0) {
    reasonCodes.push('trigger_not_matched')
    return {
      shouldQueue: true,
      shouldNotify: false,
      deliveryState: 'queued',
      reasonCodes,
      dedupeHash,
      matchedTriggers,
    }
  }

  const silentMode = Boolean(input.silentMode)
  if (silentMode) {
    if (config.pivotalQuestions.silentModeQueue) {
      reasonCodes.push('silent_mode_queue')
      return {
        shouldQueue: true,
        shouldNotify: false,
        deliveryState: 'queued',
        reasonCodes,
        dedupeHash,
        matchedTriggers,
      }
    }

    reasonCodes.push('silent_mode_suppressed')
    return {
      shouldQueue: false,
      shouldNotify: false,
      deliveryState: 'suppressed',
      reasonCodes,
      dedupeHash,
      matchedTriggers,
    }
  }

  reasonCodes.push('notify_now')
  return {
    shouldQueue: true,
    shouldNotify: true,
    deliveryState: 'notified',
    reasonCodes,
    dedupeHash,
    matchedTriggers,
  }
}

export function formatPivotalTelegramMessage(input: CoFounderPivotalEvaluationInput): string {
  const priority = (input.priority ?? 'medium').toUpperCase()
  const workspace = input.workspaceId ?? 'global'
  return [
    `<b>Co-Founder Pivotal Question</b>`,
    `Priority: <b>${priority}</b>`,
    `Workspace: <code>${workspace}</code>`,
    '',
    input.question,
  ].join('\n')
}
