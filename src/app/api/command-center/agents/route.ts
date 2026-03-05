import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { fetchCricoAgents } from '@/lib/command-center/adapters/crico-adapter'
import { fetchClawdbotAgents } from '@/lib/command-center/adapters/clawdbot-adapter'
import { fetchBosunAgents } from '@/lib/command-center/adapters/bosun-adapter'
import { fetchOpenClawAgents } from '@/lib/command-center/adapters/openclaw-adapter'
import { getAgentAvatar, SPECIALIST_ADVISORS, buildSpecialistAdvisorRecord } from '@/lib/agent-avatars'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error: authError, response: authResponse } = await getAuthUser(req)
  if (authError || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
  }
  const baseUrl = 'http://127.0.0.1:3001'  // Not used but kept for signature compatibility
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

  return NextResponse.json({
    agents,
    errors,
    timestamp: new Date().toISOString(),
  })
}
