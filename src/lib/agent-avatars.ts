import type { AgentBackend, AgentNodeStatus } from '@/lib/command-center/types'

// Static avatar mapping: agent nativeId or name pattern -> local image path
const SYSTEM_AGENT_AVATARS: Record<string, string> = {
  'clawdbot-main': '/agents/robot-01.jpg',
  'crico-conductor': '/agents/robot-02.jpg',
  'bosun-scheduler': '/agents/robot-03.jpg',
  'openclaw-relay': '/agents/robot-04.jpg',
}

// Pool for agents without a specific mapping
const AVATAR_POOL = [
  '/agents/robot-05.jpg',
  '/agents/robot-06.jpg',
  '/agents/robot-07.jpg',
  '/agents/robot-08.jpg',
]

export interface SpecialistAdvisor {
  id: string
  name: string
  role: string
  avatarUrl: string
  backend: 'advisor'
  status: AgentNodeStatus
  model: string
  nativeId: string
}

export const SPECIALIST_ADVISORS: SpecialistAdvisor[] = [
  { id: 'advisor::hormozi', nativeId: 'hormozi', name: 'Alex Hormozi', role: 'Growth & Acquisition Strategy', avatarUrl: '/agents/advisors/hormozi.jpg', backend: 'advisor', status: 'idle', model: 'OPUS' },
  { id: 'advisor::gates', nativeId: 'gates', name: 'Bill Gates', role: 'Technology & Philanthropy Strategy', avatarUrl: '/agents/advisors/gates.jpg', backend: 'advisor', status: 'idle', model: 'OPUS' },
  { id: 'advisor::buffett', nativeId: 'buffett', name: 'Warren Buffett', role: 'Investment & Value Analysis', avatarUrl: '/agents/advisors/buffett.jpg', backend: 'advisor', status: 'idle', model: 'OPUS' },
  { id: 'advisor::cuban', nativeId: 'cuban', name: 'Mark Cuban', role: 'Venture & Deal Evaluation', avatarUrl: '/agents/advisors/cuban.jpg', backend: 'advisor', status: 'idle', model: 'OPUS' },
  { id: 'advisor::musk', nativeId: 'musk', name: 'Elon Musk', role: 'Innovation & Moonshot Strategy', avatarUrl: '/agents/advisors/musk.jpg', backend: 'advisor', status: 'idle', model: 'OPUS' },
  { id: 'advisor::bezos', nativeId: 'bezos', name: 'Jeff Bezos', role: 'Operations & Customer Obsession', avatarUrl: '/agents/advisors/bezos.jpg', backend: 'advisor', status: 'idle', model: 'OPUS' },
  { id: 'advisor::zuckerberg', nativeId: 'zuckerberg', name: 'Mark Zuckerberg', role: 'Platform & Social Strategy', avatarUrl: '/agents/advisors/zuckerberg.jpg', backend: 'advisor', status: 'idle', model: 'OPUS' },
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function getAgentAvatar(agent: { name: string; nativeId?: string; backend?: string }): string | undefined {
  // Check specialist advisors
  const advisor = SPECIALIST_ADVISORS.find(
    (a) => a.nativeId === agent.nativeId || a.name === agent.name
  )
  if (advisor) return advisor.avatarUrl

  // Check system agent mapping
  if (agent.nativeId && SYSTEM_AGENT_AVATARS[agent.nativeId]) {
    return SYSTEM_AGENT_AVATARS[agent.nativeId]
  }

  // Assign from pool based on name hash for consistency
  const key = agent.nativeId || agent.name
  const index = hashString(key) % AVATAR_POOL.length
  return AVATAR_POOL[index]
}
