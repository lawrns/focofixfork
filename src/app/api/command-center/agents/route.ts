import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { fetchCricoAgents } from '@/lib/command-center/adapters/crico-adapter'
import { fetchClawdbotAgents } from '@/lib/command-center/adapters/clawdbot-adapter'
import { fetchBosunAgents } from '@/lib/command-center/adapters/bosun-adapter'
import { fetchOpenClawAgents } from '@/lib/command-center/adapters/openclaw-adapter'
import { getAgentAvatar, SPECIALIST_ADVISORS, buildSpecialistAdvisorRecord } from '@/lib/agent-avatars'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error: authError, response: authResponse } = await getAuthUser(req)
  if (authError || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
  }
  const baseUrl = req.nextUrl.origin
  const openclawToken = process.env.OPENCLAW_SERVICE_TOKEN
  const bosunToken = process.env.BOSUN_SERVICE_TOKEN

  const results = await Promise.allSettled([
    fetchCricoAgents(baseUrl, openclawToken),
    fetchClawdbotAgents(baseUrl, openclawToken),
    fetchBosunAgents(baseUrl, bosunToken),
    fetchOpenClawAgents(baseUrl),
  ])

  const allAgents = []
  const errors: string[] = []

  const labels = ['crico', 'clawdbot', 'bosun', 'openclaw']
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') {
      allAgents.push(...result.value)
    } else {
      errors.push(`${labels[i]}: ${result.reason?.message ?? 'unknown error'}`)
    }
  }

  // Deduplicate by ID — keep the first occurrence
  const seen = new Set<string>()
  const deduped = allAgents.filter(a => {
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })

  // Merge avatar URLs into agents
  const agents = deduped.map(a => ({
    ...a,
    avatarUrl: a.avatarUrl || getAgentAvatar({ name: a.name, nativeId: a.nativeId, backend: a.backend }),
  }))

  // Append specialist advisor agents
  for (const advisor of SPECIALIST_ADVISORS) {
    if (!seen.has(advisor.id)) {
      const resolvedAdvisor = await buildSpecialistAdvisorRecord(advisor)
      agents.push({
        id: advisor.id,
        backend: advisor.backend,
        nativeId: advisor.nativeId,
        name: advisor.name,
        role: advisor.role,
        status: advisor.status,
        model: advisor.model,
        avatarUrl: resolvedAdvisor.avatarUrl,
        raw: {
          type: 'specialist_advisor',
          description: advisor.description,
          persona_tags: advisor.personaTags,
          system_prompt: advisor.systemPrompt,
        },
      })
    }
  }

  // Enrich agents with trust data if available
  let enrichedAgents = agents
  try {
    if (supabaseAdmin) {
      const { data: trustAgents } = await supabaseAdmin
        .from('agents')
        .select('backend, agent_key, autonomy_tier, agent_trust_scores(score, total_iterations)')

      if (trustAgents && trustAgents.length > 0) {
        const trustMap = new Map<string, { trust_score: number | null; autonomy_tier: string; total_iterations: number }>()
        for (const ta of trustAgents) {
          const key = `${ta.backend}:${ta.agent_key}`
          const scores = ta.agent_trust_scores as Array<{ score: number; total_iterations: number }> | null
          const firstScore = Array.isArray(scores) && scores.length > 0 ? scores[0] : null
          trustMap.set(key, {
            trust_score: firstScore?.score ?? null,
            autonomy_tier: ta.autonomy_tier,
            total_iterations: firstScore?.total_iterations ?? 0,
          })
        }

        enrichedAgents = agents.map((a) => {
          const key = `${a.backend}:${a.nativeId ?? a.name}`
          const trust = trustMap.get(key)
          return trust ? { ...a, trust_score: trust.trust_score, autonomy_tier: trust.autonomy_tier, trust_iterations: trust.total_iterations } : a
        })
      }
    }
  } catch (trustErr) {
    console.error('[CommandCenter] Trust enrichment failed:', trustErr)
  }

  return NextResponse.json({
    agents: enrichedAgents,
    errors,
    timestamp: new Date().toISOString(),
  })
}
