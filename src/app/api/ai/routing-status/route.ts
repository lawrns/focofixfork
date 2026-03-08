import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { fetchClawdCapabilities } from '@/lib/clawdbot/routing'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { user, error: authError, response } = await getAuthUser(request)
  if (authError || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), response)
  }

  const caps = await fetchClawdCapabilities()
  const routingProfile = caps?.routing_profiles?.[0] ?? null
  const clawdbotProviders: Array<{ id?: string; status?: string }> = (caps as any)?.providers ?? []

  const wsProfile = {
    pipeline_plan: process.env.EMPIRE_PLANNING_MODEL ?? 'claude-opus-4-6',
    pipeline_execute: process.env.EMPIRE_EXECUTION_MODEL ?? 'claude-sonnet-4-6',
    pipeline_review: process.env.EMPIRE_REVIEW_MODEL ?? 'claude-opus-4-6',
  }

  const providerStatus: Record<string, { available: boolean; label: string }> = {
    anthropic: { available: Boolean(process.env.ANTHROPIC_API_KEY), label: 'Anthropic API' },
    openrouter: { available: Boolean(process.env.OPENROUTER_API_KEY), label: 'OpenRouter' },
    kimi: { available: Boolean(process.env.KIMI_API_KEY), label: 'Kimi API' },
    glm: { available: Boolean(process.env.GLM_API_KEY || process.env.ZHIPU_API_KEY), label: 'Z.AI / GLM' },
    openai: { available: Boolean(process.env.OPENAI_API_KEY), label: 'OpenAI API' },
    ollama_proxy: { available: Boolean(process.env.OLLAMA_PROXY_URL && process.env.OLLAMA_PROXY_KEY), label: 'Ollama Proxy (Fallback)' },
  }

  // Merge with ClawdBot's live provider status
  for (const p of clawdbotProviders) {
    if (p?.id && providerStatus[p.id]) {
      providerStatus[p.id].available = p.status === 'up'
    }
  }

  return mergeAuthResponse(
    NextResponse.json({
      clawdbot_reachable: Boolean(caps),
      clawdbot_routing_profile: routingProfile,
      workspace_profile: wsProfile,
      provider_status: providerStatus,
      available_models: (caps as any)?.models ?? [],
    }),
    response,
  )
}
