import type { PivotalResolutionDecision } from '@/lib/cofounder-mode/pivotal-resolution'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DECISIONS = new Set<PivotalResolutionDecision>(['approve', 'reject', 'defer', 'resolved'])

export interface TelegramPivotalCommand {
  pivotalId: string
  decision: PivotalResolutionDecision
}

function normalizeDecision(value: string | undefined): PivotalResolutionDecision | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (!DECISIONS.has(normalized as PivotalResolutionDecision)) return null
  return normalized as PivotalResolutionDecision
}

export function parsePivotalCallbackData(data: string | null | undefined): TelegramPivotalCommand | null {
  if (!data) return null
  const match = data.trim().match(/^piv:([^:]+):(approve|reject|defer|resolved)$/i)
  if (!match) return null
  if (!UUID_REGEX.test(match[1])) return null

  const decision = normalizeDecision(match[2])
  if (!decision) return null

  return {
    pivotalId: match[1],
    decision,
  }
}

export function parsePivotalCommandText(text: string | null | undefined): TelegramPivotalCommand | null {
  if (!text) return null
  const trimmed = text.trim()
  const match = trimmed.match(/^\/(?:pivotal|resolve_pivotal)\s+([0-9a-f-]{36})\s+(approve|reject|defer|resolved)\s*$/i)
  if (!match) return null
  if (!UUID_REGEX.test(match[1])) return null

  const decision = normalizeDecision(match[2])
  if (!decision) return null

  return {
    pivotalId: match[1],
    decision,
  }
}
