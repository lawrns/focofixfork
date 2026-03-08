import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

export interface LiveClawdbotProbe {
  baseUrl: string
  token: string
  health: Record<string, unknown>
  capabilities: {
    models?: Array<{ id?: string; available?: boolean }>
    routing_profiles?: Array<{
      profile_id?: string
      plan_model?: string
      execute_model?: string
      review_model?: string
      fallback_chain?: string[]
    }>
  }
  models: {
    plan: string
    execute: string
    review: string
  }
  fallbackChain: string[]
}

function readDotEnvLocal(name: string): string | undefined {
  if (!existsSync('.env.local')) return undefined

  const line = readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`))

  if (!line) return undefined
  const value = line.slice(name.length + 1).trim()
  return value.replace(/^['"]|['"]$/g, '') || undefined
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function discoverCandidatePorts(): number[] {
  const ports = [18794]

  try {
    const output = execSync('ss -ltn 2>/dev/null || true', { encoding: 'utf8' })
    for (const match of output.matchAll(/(?:127\.0\.0\.1|0\.0\.0\.0|\*):(\d+)/g)) {
      const port = Number(match[1])
      if (!Number.isNaN(port) && port > 1024) ports.push(port)
    }
  } catch {
    return ports
  }

  return unique(ports)
}

async function fetchJson(url: string, token: string) {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(4_000),
  })

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  return response.json()
}

function chooseModel(candidates: Array<string | undefined>, available: string[], fallback: string): string {
  for (const candidate of candidates) {
    if (candidate && available.includes(candidate)) return candidate
  }
  return available[0] ?? fallback
}

export async function discoverLiveClawdbot(): Promise<LiveClawdbotProbe> {
  const token = process.env.OPENCLAW_SERVICE_TOKEN ?? readDotEnvLocal('OPENCLAW_SERVICE_TOKEN') ?? ''
  const explicitBase = process.env.CLAWDBOT_API_URL ?? readDotEnvLocal('CLAWDBOT_API_URL')
  const candidateBases = unique([
    ...(explicitBase ? [explicitBase] : []),
    ...discoverCandidatePorts().flatMap((port) => [`http://127.0.0.1:${port}`, `http://localhost:${port}`]),
  ])

  let lastError: unknown = null

  for (const baseUrl of candidateBases) {
    try {
      const health = await fetchJson(`${baseUrl}/health`, token)
      if (health?.server !== 'clawdbot-api') continue

      const capabilities = await fetchJson(`${baseUrl}/capabilities`, token)
      const availableModels = Array.isArray(capabilities?.models)
        ? capabilities.models
            .filter((model: { id?: string; available?: boolean }) => model?.available && typeof model.id === 'string')
            .map((model: { id?: string }) => model.id as string)
        : []

      const profile = Array.isArray(capabilities?.routing_profiles)
        ? capabilities.routing_profiles[0]
        : undefined

      return {
        baseUrl,
        token,
        health,
        capabilities,
        models: {
          plan: chooseModel([profile?.plan_model, 'kimi-k2-standard', 'glm-5'], availableModels, 'glm-5'),
          execute: chooseModel([profile?.execute_model, 'kimi-k2-fast', 'kimi-k2-standard', 'glm-5'], availableModels, 'glm-5'),
          review: chooseModel([profile?.review_model, 'glm-5', 'kimi-k2-standard'], availableModels, 'glm-5'),
        },
        fallbackChain: Array.isArray(profile?.fallback_chain) && profile.fallback_chain.length > 0
          ? profile.fallback_chain
          : ['glm-5'],
      }
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(`Unable to discover a live ClawdBot endpoint${lastError instanceof Error ? `: ${lastError.message}` : ''}`)
}

export function parseSseEvents(payload: string): Array<Record<string, any>> {
  return payload
    .split('\n\n')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .flatMap((chunk) => {
      const lines = chunk.split('\n').filter((line) => line.startsWith('data: '))
      if (lines.length === 0) return []

      const data = lines.map((line) => line.slice(6)).join('\n')
      try {
        return [JSON.parse(data) as Record<string, any>]
      } catch {
        return []
      }
    })
}

