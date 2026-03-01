import { NextRequest, NextResponse } from 'next/server'
import { fetchCricoAgents } from '@/lib/command-center/adapters/crico-adapter'
import { fetchClawdbotAgents } from '@/lib/command-center/adapters/clawdbot-adapter'
import { fetchBosunAgents } from '@/lib/command-center/adapters/bosun-adapter'
import { fetchOpenClawAgents } from '@/lib/command-center/adapters/openclaw-adapter'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const baseUrl = 'http://127.0.0.1:3001'  // Not used but kept for signature compatibility
  const openclawToken = process.env.OPENCLAW_SERVICE_TOKEN
  const bosunToken = process.env.BOSUN_SERVICE_TOKEN

  const results = await Promise.allSettled([
    fetchCricoAgents(baseUrl, openclawToken),
    fetchClawdbotAgents(baseUrl, openclawToken),
    fetchBosunAgents(baseUrl, bosunToken),
    fetchOpenClawAgents(baseUrl),
  ])

  const agents = []
  const errors: string[] = []

  const labels = ['crico', 'clawdbot', 'bosun', 'openclaw']
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') {
      agents.push(...result.value)
    } else {
      errors.push(`${labels[i]}: ${result.reason?.message ?? 'unknown error'}`)
    }
  }

  return NextResponse.json({
    agents,
    errors,
    timestamp: new Date().toISOString(),
  })
}
