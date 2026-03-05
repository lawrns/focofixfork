import type {
  CoFounderPolicy,
  CoFounderValidateActionInput,
  CoFounderValidateActionResult,
} from '@/lib/autonomy/types'
import { evaluateActionAgainstCoFounderConfig } from '@/lib/cofounder-mode/decision-engine'
import {
  mapCanonicalConfigToLegacyPolicy,
  mapLegacyAIPolicyToCoFounderModePatch,
  mapLegacyPolicyToCanonicalConfig,
} from '@/lib/cofounder-mode/legacy-map'
import {
  DEFAULT_COFOUNDER_MODE_CONFIG,
  mergeCoFounderModeConfig,
  parseCoFounderModeConfig,
} from '@/lib/cofounder-mode/parse'

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export const DEFAULT_COFOUNDER_POLICY: CoFounderPolicy = mapCanonicalConfigToLegacyPolicy(
  DEFAULT_COFOUNDER_MODE_CONFIG
)

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function isValidTime(value: string): boolean {
  return TIME_RE.test(value)
}

export function resolveCoFounderPolicy(rawAiPolicy: unknown): CoFounderPolicy {
  const aiPolicy = toRecord(rawAiPolicy)
  const canonicalDirect = toRecord(aiPolicy.cofounderMode)
  const canonicalAlias = toRecord(aiPolicy.cofounder_v1)

  let merged = DEFAULT_COFOUNDER_MODE_CONFIG

  if (Object.keys(canonicalDirect).length > 0) {
    merged = mergeCoFounderModeConfig(merged, parseCoFounderModeConfig(canonicalDirect).config)
  }

  if (Object.keys(canonicalAlias).length > 0) {
    merged = mergeCoFounderModeConfig(merged, parseCoFounderModeConfig(canonicalAlias).config)
  }

  merged = mergeCoFounderModeConfig(merged, mapLegacyAIPolicyToCoFounderModePatch(aiPolicy))

  const parsed = parseCoFounderModeConfig(merged).config
  return mapCanonicalConfigToLegacyPolicy(parsed)
}

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map((n) => parseInt(n, 10))
  return (h * 60) + m
}

function getMinutesInTimezone(now: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })
    const parts = formatter.formatToParts(now)
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? NaN)
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? NaN)
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return (hour * 60) + minute
    }
  } catch {
    // Fall back to server-local time when timezone is invalid.
  }

  return now.getHours() * 60 + now.getMinutes()
}

export function isInOvernightWindow(policy: CoFounderPolicy, now: Date = new Date()): boolean {
  if (!policy.overnightWindow.enabled) return true
  if (!isValidTime(policy.overnightWindow.start) || !isValidTime(policy.overnightWindow.end)) return true

  const mins = getMinutesInTimezone(now, policy.overnightWindow.timezone)
  const start = toMinutes(policy.overnightWindow.start)
  const end = toMinutes(policy.overnightWindow.end)
  if (start <= end) return mins >= start && mins < end
  return mins >= start || mins < end
}

export function evaluateActionAgainstPolicy(
  policy: CoFounderPolicy,
  action: CoFounderValidateActionInput
): CoFounderValidateActionResult {
  const canonicalConfig = mapLegacyPolicyToCanonicalConfig(policy)
  const result = evaluateActionAgainstCoFounderConfig(canonicalConfig, action)

  return {
    allowed: result.allowed,
    requiresApproval: result.requiresApproval,
    reasons: result.reasons,
    violatedRules: result.violatedRules,
    effectiveMode: policy.mode,
  }
}
