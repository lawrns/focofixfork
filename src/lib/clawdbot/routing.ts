export type ClawdPhase = 'plan' | 'execute' | 'review'

export interface ClawdRoutingProfile {
  profile_id: string
  source: 'capabilities' | 'env'
  plan_model: string
  execute_model: string
  review_model: string
  fallback_chain: string[]
}

interface CapabilitiesResponse {
  routing_profiles?: Array<{
    profile_id?: string
    plan_model?: string
    execute_model?: string
    review_model?: string
    fallback_chain?: string[]
  }>
  models?: Array<{
    id?: string
    role_tags?: string[]
    available?: boolean
  }>
}

const CLAWDBOT_BASE = process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794'
const CLAWDBOT_TOKEN = process.env.OPENCLAW_SERVICE_TOKEN ?? ''
const STRICT_CLAWD_ROUTING = (process.env.CLAWD_ROUTING_STRICT ?? 'true').toLowerCase() !== 'false'

function fromEnvProfile(): ClawdRoutingProfile {
  return {
    profile_id: 'env-default',
    source: 'env',
    plan_model: process.env.EMPIRE_PLANNING_MODEL ?? 'claude-opus-4-6',
    execute_model: process.env.EMPIRE_EXECUTION_MODEL ?? 'kimi-k2-standard',
    review_model: process.env.EMPIRE_REVIEW_MODEL ?? 'codex-standard',
    fallback_chain: [process.env.EMPIRE_FALLBACK_MODEL ?? 'glm-5'].filter(Boolean),
  }
}

export async function fetchClawdCapabilities(): Promise<CapabilitiesResponse | null> {
  try {
    const headers: Record<string, string> = {}
    if (CLAWDBOT_TOKEN) headers['Authorization'] = `Bearer ${CLAWDBOT_TOKEN}`

    const res = await fetch(`${CLAWDBOT_BASE}/capabilities`, {
      headers,
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    return (await res.json()) as CapabilitiesResponse
  } catch {
    return null
  }
}

export async function resolveClawdRoutingProfile(
  requestedProfileId?: string | null
): Promise<ClawdRoutingProfile> {
  const caps = await fetchClawdCapabilities()
  const profiles = caps?.routing_profiles ?? []

  if (profiles.length > 0) {
    const preferred = requestedProfileId
      ? profiles.find((p) => p.profile_id === requestedProfileId)
      : null
    const selected = preferred ?? profiles[0]
    if (selected?.plan_model && selected.execute_model && selected.review_model) {
      return {
        profile_id: selected.profile_id ?? 'capabilities-default',
        source: 'capabilities',
        plan_model: selected.plan_model,
        execute_model: selected.execute_model,
        review_model: selected.review_model,
        fallback_chain: selected.fallback_chain ?? [],
      }
    }
  }

  return fromEnvProfile()
}

export function pickPreferredModel(
  profile: ClawdRoutingProfile,
  phase: ClawdPhase,
  requested?: string | null
): string {
  const selected =
    phase === 'plan' ? profile.plan_model : phase === 'execute' ? profile.execute_model : profile.review_model
  if (STRICT_CLAWD_ROUTING) return selected
  return requested?.trim() || selected
}
