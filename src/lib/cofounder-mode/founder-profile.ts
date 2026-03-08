import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import type { StrategicPriority } from '@/lib/cofounder-mode/types'

const FOUNDER_PROFILE_PATH = path.join(process.cwd(), 'FOUNDER_PROFILE.md')
const FRESHNESS_WINDOW_DAYS = 14
const STRATEGY_PRIORITIES = ['revenue', 'growth', 'ops', 'risk', 'brand', 'product_quality'] as const

export type FounderStrategicPriority = (typeof STRATEGY_PRIORITIES)[number]

export interface FounderVenture {
  name: string
  slug: string
  role: 'primary' | 'secondary'
  stage: string
  targetCustomers: string[]
}

export interface FounderOutcome {
  horizon: '30d' | '90d' | '365d'
  outcome: string
}

export interface FounderProfileIssue {
  code: string
  message: string
  severity: 'warning' | 'error'
}

export interface FounderAlignmentScore {
  score: number
  matchedPriorities: FounderStrategicPriority[]
  matchedThemes: string[]
  matchedBottlenecks: string[]
  blockedByAntiGoals: string[]
  reasons: string[]
}

export interface FounderStrategyProfile {
  version: 'v1'
  activeVenture: string | null
  ventures: FounderVenture[]
  northStarOutcomes: FounderOutcome[]
  strategicPriorityOrder: FounderStrategicPriority[]
  priorityWeights: Record<FounderStrategicPriority, number>
  operatingPreferences: string[]
  constraints: string[]
  bottlenecks: string[]
  opportunityThemes: string[]
  antiGoals: string[]
  unknowns: string[]
  nightAutonomyDefaults: string[]
}

export interface FounderProfileContext {
  path: string
  rawContent: string
  excerpt: string
  available: boolean
  parsed: FounderStrategyProfile | null
  issues: FounderProfileIssue[]
  updatedAt: string | null
  stale: boolean
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizePriority(value: string): FounderStrategicPriority | null {
  const normalized = value.toLowerCase().trim().replace(/\s+/g, '_')
  if ((STRATEGY_PRIORITIES as readonly string[]).includes(normalized)) {
    return normalized as FounderStrategicPriority
  }
  return null
}

function splitLines(section: string): string[] {
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseBulletValues(section: string): string[] {
  return splitLines(section)
    .filter((line) => /^-\s+/.test(line))
    .map((line) => line.replace(/^-\s+/, '').trim())
    .filter(Boolean)
}

function parseKeyValueBullets(section: string): Record<string, string> {
  const entries = parseBulletValues(section)
    .map((line) => {
      const separator = line.indexOf(':')
      if (separator === -1) return null
      const key = line.slice(0, separator).trim().toLowerCase().replace(/\s+/g, '_')
      const value = line.slice(separator + 1).trim()
      if (!key || !value) return null
      return [key, value] as const
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry))

  return Object.fromEntries(entries)
}

function parseVentureMap(section: string): { activeVenture: string | null; ventures: FounderVenture[] } {
  const blocks = section
    .split(/^###\s+/m)
    .map((block) => block.trim())
    .filter(Boolean)

  const ventures: FounderVenture[] = []
  let activeVenture: string | null = null

  for (const block of blocks) {
    const [headingLine, ...restLines] = block.split('\n')
    const heading = headingLine.trim()
    const body = restLines.join('\n')
    const fields = parseKeyValueBullets(body)
    const role = fields.role?.toLowerCase() === 'primary' ? 'primary' : 'secondary'
    if (role === 'primary') activeVenture = heading

    ventures.push({
      name: heading,
      slug: slugify(heading),
      role,
      stage: fields.stage ?? 'unspecified',
      targetCustomers: (fields.target_customers ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    })
  }

  return { activeVenture, ventures }
}

function parseOutcomes(section: string): FounderOutcome[] {
  return parseBulletValues(section)
    .map((line) => {
      const separator = line.indexOf(':')
      if (separator === -1) return null
      const horizon = line.slice(0, separator).trim().toLowerCase() as FounderOutcome['horizon']
      const outcome = line.slice(separator + 1).trim()
      if (!['30d', '90d', '365d'].includes(horizon) || !outcome) return null
      return { horizon, outcome }
    })
    .filter((item): item is FounderOutcome => Boolean(item))
}

function parsePriorityOrder(section: string): {
  strategicPriorityOrder: FounderStrategicPriority[]
  priorityWeights: Record<FounderStrategicPriority, number>
} {
  const parsed = parseBulletValues(section)
    .map((line) => {
      const separator = line.indexOf(':')
      if (separator === -1) return null
      const priority = normalizePriority(line.slice(0, separator))
      const rawWeight = Number(line.slice(separator + 1).trim())
      if (!priority || Number.isNaN(rawWeight)) return null
      return { priority, weight: rawWeight }
    })
    .filter((item): item is { priority: FounderStrategicPriority; weight: number } => Boolean(item))
    .sort((a, b) => b.weight - a.weight)

  const order = parsed.map((item) => item.priority)
  const seen = new Set(order)
  const fallbackOrder = STRATEGY_PRIORITIES.filter((priority) => !seen.has(priority))
  const strategicPriorityOrder = [...order, ...fallbackOrder]

  const priorityWeights = Object.fromEntries(
    STRATEGY_PRIORITIES.map((priority, index) => [
      priority,
      parsed.find((item) => item.priority === priority)?.weight ?? Math.max(1, STRATEGY_PRIORITIES.length - index),
    ]),
  ) as Record<FounderStrategicPriority, number>

  return { strategicPriorityOrder, priorityWeights }
}

function extractSectionMap(content: string): Record<string, string> {
  const matches = Array.from(content.matchAll(/^##\s+(.+)$/gm))
  if (matches.length === 0) return {}

  const sections: Record<string, string> = {}
  for (let index = 0; index < matches.length; index += 1) {
    const title = matches[index][1].trim().toLowerCase()
    const start = (matches[index].index ?? 0) + matches[index][0].length
    const end = index + 1 < matches.length ? matches[index + 1].index ?? content.length : content.length
    sections[title] = content.slice(start, end).trim()
  }
  return sections
}

function buildExcerpt(content: string): string {
  return content
    .replace(/^#.*$/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320)
}

function parseFounderProfile(content: string): { parsed: FounderStrategyProfile; issues: FounderProfileIssue[] } {
  const sectionMap = extractSectionMap(content)
  const issues: FounderProfileIssue[] = []

  const ventureMapSection = sectionMap['venture map'] ?? sectionMap['current venture'] ?? ''
  const { activeVenture, ventures } = ventureMapSection
    ? parseVentureMap(ventureMapSection)
    : { activeVenture: null, ventures: [] }

  if (ventures.length === 0) {
    issues.push({
      code: 'missing_venture_map',
      message: 'Founder profile is missing a populated Venture Map section.',
      severity: 'warning',
    })
  }

  const outcomes = parseOutcomes(sectionMap['north star outcomes'] ?? '')
  if (outcomes.length === 0) {
    issues.push({
      code: 'missing_outcomes',
      message: 'Founder profile does not define 30d/90d/365d north-star outcomes.',
      severity: 'warning',
    })
  }

  const { strategicPriorityOrder, priorityWeights } = parsePriorityOrder(sectionMap['strategic priority order'] ?? '')
  if ((sectionMap['strategic priority order'] ?? '').trim().length === 0) {
    issues.push({
      code: 'missing_priority_order',
      message: 'Founder profile does not define weighted strategic priorities.',
      severity: 'warning',
    })
  }

  const unknowns = parseBulletValues(sectionMap['unknowns to confirm'] ?? '')
  if (unknowns.length > 0) {
    issues.push({
      code: 'founder_unknowns_present',
      message: 'Founder profile still contains unresolved unknowns that should lower autonomous confidence.',
      severity: 'warning',
    })
  }

  return {
    parsed: {
      version: 'v1',
      activeVenture,
      ventures,
      northStarOutcomes: outcomes,
      strategicPriorityOrder,
      priorityWeights,
      operatingPreferences: parseBulletValues(sectionMap['operating style'] ?? sectionMap['operating preferences'] ?? ''),
      constraints: parseBulletValues(sectionMap['constraints and non-negotiables'] ?? ''),
      bottlenecks: parseBulletValues(sectionMap['current bottlenecks'] ?? ''),
      opportunityThemes: parseBulletValues(sectionMap['opportunity themes'] ?? ''),
      antiGoals: parseBulletValues(sectionMap['kill criteria / anti-goals'] ?? ''),
      unknowns,
      nightAutonomyDefaults: parseBulletValues(sectionMap['night autonomy defaults'] ?? ''),
    },
    issues,
  }
}

const PRIORITY_KEYWORDS: Record<FounderStrategicPriority, string[]> = {
  revenue: ['revenue', 'pricing', 'sales', 'pipeline', 'conversion', 'retention', 'profit'],
  growth: ['growth', 'acquisition', 'onboarding', 'activation', 'funnel', 'expansion'],
  ops: ['ops', 'operations', 'workflow', 'throughput', 'automation', 'backlog'],
  risk: ['risk', 'security', 'safety', 'compliance', 'failure', 'rollback'],
  brand: ['brand', 'positioning', 'message', 'marketing', 'reputation'],
  product_quality: ['quality', 'reliability', 'stability', 'testing', 'observability', 'ux'],
}

export function scoreTextAgainstFounderProfile(profile: FounderStrategyProfile | null, text: string): FounderAlignmentScore {
  if (!profile) {
    return {
      score: 0,
      matchedPriorities: [],
      matchedThemes: [],
      matchedBottlenecks: [],
      blockedByAntiGoals: [],
      reasons: [],
    }
  }

  const haystack = text.toLowerCase()
  const matchedPriorities: FounderStrategicPriority[] = []
  const matchedThemes = profile.opportunityThemes.filter((theme) => haystack.includes(theme.toLowerCase()))
  const matchedBottlenecks = profile.bottlenecks.filter((theme) => haystack.includes(theme.toLowerCase()))
  const blockedByAntiGoals = profile.antiGoals.filter((theme) => haystack.includes(theme.toLowerCase()))

  let score = 0
  for (const priority of profile.strategicPriorityOrder) {
    const hasKeyword = PRIORITY_KEYWORDS[priority].some((keyword) => haystack.includes(keyword))
    if (!hasKeyword) continue
    matchedPriorities.push(priority)
    score += profile.priorityWeights[priority]
  }

  score += matchedThemes.length * 3
  score += matchedBottlenecks.length * 4
  score -= blockedByAntiGoals.length * 8

  return {
    score,
    matchedPriorities,
    matchedThemes,
    matchedBottlenecks,
    blockedByAntiGoals,
    reasons: [
      ...matchedPriorities.map((item) => `Matches strategic priority: ${item}`),
      ...matchedThemes.map((item) => `Matches opportunity theme: ${item}`),
      ...matchedBottlenecks.map((item) => `Addresses bottleneck: ${item}`),
      ...blockedByAntiGoals.map((item) => `Conflicts with anti-goal: ${item}`),
    ],
  }
}

export function toLegacyStrategicOrder(profile: FounderStrategyProfile | null): StrategicPriority[] {
  if (!profile) return ['risk', 'revenue', 'ops', 'growth', 'brand']
  return profile.strategicPriorityOrder
    .filter((priority): priority is StrategicPriority => priority !== 'product_quality')
}

export async function loadFounderProfile(): Promise<FounderProfileContext | null> {
  try {
    const [content, fileStats] = await Promise.all([
      readFile(FOUNDER_PROFILE_PATH, 'utf8'),
      stat(FOUNDER_PROFILE_PATH),
    ])
    const trimmed = content.trim()
    if (!trimmed) {
      return {
        path: FOUNDER_PROFILE_PATH,
        rawContent: '',
        excerpt: '',
        available: false,
        parsed: null,
        issues: [{
          code: 'empty_profile',
          message: 'Founder profile file is empty.',
          severity: 'warning',
        }],
        updatedAt: fileStats.mtime.toISOString(),
        stale: false,
      }
    }

    const { parsed, issues } = parseFounderProfile(trimmed)
    const updatedAt = fileStats.mtime.toISOString()
    const stale = (Date.now() - fileStats.mtime.getTime()) > (FRESHNESS_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    if (stale) {
      issues.push({
        code: 'stale_profile',
        message: `Founder profile has not been updated in more than ${FRESHNESS_WINDOW_DAYS} days.`,
        severity: 'warning',
      })
    }

    return {
      path: FOUNDER_PROFILE_PATH,
      rawContent: trimmed,
      excerpt: buildExcerpt(trimmed),
      available: true,
      parsed,
      issues,
      updatedAt,
      stale,
    }
  } catch {
    return null
  }
}
