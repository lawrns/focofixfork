import { AGENT_LANES, type AgentLane } from '@/lib/agent-ops/types'

export const LANE_WRITE_PREFIXES: Record<AgentLane, string[]> = {
  product_ui: [
    'src/app/',
    'src/components/',
    'public/',
    'tailwind.config.ts',
    'next.config.js',
  ],
  platform_api: [
    'src/app/api/',
    'src/lib/',
    'supabase/',
    'schemas/',
  ],
  requirements: [
    'docs/agent-ops/',
  ],
}

export const LANE_READ_PREFIXES: Record<AgentLane, string[]> = {
  product_ui: ['src/', 'docs/', 'public/', 'schemas/'],
  platform_api: ['src/', 'docs/', 'supabase/', 'schemas/'],
  requirements: ['docs/', 'src/', 'schemas/'],
}

export function isLane(value: unknown): value is AgentLane {
  return typeof value === 'string' && AGENT_LANES.includes(value as AgentLane)
}

export function normalizePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/\/+/g, '/')
}

function matchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => {
    const normalizedPrefix = normalizePath(prefix)
    if (path === normalizedPrefix) return true
    if (normalizedPrefix.endsWith('/')) return path.startsWith(normalizedPrefix)
    return path === normalizedPrefix || path.startsWith(`${normalizedPrefix}/`)
  })
}

export function isWritePathAllowedForLane(lane: AgentLane, path: string): boolean {
  return matchesPrefix(normalizePath(path), LANE_WRITE_PREFIXES[lane])
}

export function isReadPathAllowedForLane(lane: AgentLane, path: string): boolean {
  return matchesPrefix(normalizePath(path), LANE_READ_PREFIXES[lane])
}

export function validateWriteScopeForLane(lane: AgentLane, writeScope: string[]): string[] {
  const violations: string[] = []
  for (const candidate of writeScope) {
    const clean = normalizePath(candidate)
    if (!isWritePathAllowedForLane(lane, clean)) {
      violations.push(clean)
    }
  }
  return violations
}

export function validateReadScopeForLane(lane: AgentLane, readScope: string[]): string[] {
  const violations: string[] = []
  for (const candidate of readScope) {
    const clean = normalizePath(candidate)
    if (!isReadPathAllowedForLane(lane, clean)) {
      violations.push(clean)
    }
  }
  return violations
}

export function slugifyAgentName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}
