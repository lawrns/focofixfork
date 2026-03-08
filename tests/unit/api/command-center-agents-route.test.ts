import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const {
  mockGetAuthUser,
  mockMergeAuthResponse,
  mockFetchCricoAgents,
  mockFetchClawdbotAgents,
  mockFetchBosunAgents,
  mockFetchOpenClawAgents,
  mockSearchBraveImage,
} = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockMergeAuthResponse: vi.fn((response: NextResponse) => response),
  mockFetchCricoAgents: vi.fn(),
  mockFetchClawdbotAgents: vi.fn(),
  mockFetchBosunAgents: vi.fn(),
  mockFetchOpenClawAgents: vi.fn(),
  mockSearchBraveImage: vi.fn(),
}))

vi.mock('@/lib/api/auth-helper', () => ({
  getAuthUser: mockGetAuthUser,
  mergeAuthResponse: mockMergeAuthResponse,
}))

vi.mock('@/lib/command-center/adapters/crico-adapter', () => ({
  fetchCricoAgents: mockFetchCricoAgents,
}))

vi.mock('@/lib/command-center/adapters/clawdbot-adapter', () => ({
  fetchClawdbotAgents: mockFetchClawdbotAgents,
}))

vi.mock('@/lib/command-center/adapters/bosun-adapter', () => ({
  fetchBosunAgents: mockFetchBosunAgents,
}))

vi.mock('@/lib/command-center/adapters/openclaw-adapter', () => ({
  fetchOpenClawAgents: mockFetchOpenClawAgents,
}))

vi.mock('@/lib/brave-image-search', () => ({
  searchBraveImage: mockSearchBraveImage,
}))

import { GET } from '@/app/api/command-center/agents/route'

describe('/api/command-center/agents route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetAuthUser.mockResolvedValue({
      user: { id: 'user-1' },
      error: null,
      response: NextResponse.next(),
    })

    mockFetchCricoAgents.mockResolvedValue([])
    mockFetchClawdbotAgents.mockResolvedValue([])
    mockFetchBosunAgents.mockResolvedValue([])
    mockFetchOpenClawAgents.mockResolvedValue([])
    mockSearchBraveImage.mockResolvedValue('https://imgs.search.brave.com/example-thumb')
  })

  test('returns specialist advisors with Brave-backed thumbnails and visible prompt metadata', async () => {
    const res = await GET(new NextRequest('http://localhost:4000/api/command-center/agents'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.errors).toEqual([])

    const taleb = body.agents.find((agent: { nativeId: string }) => agent.nativeId === 'taleb')
    expect(taleb).toBeDefined()
    expect(taleb.avatarUrl).toContain('brave.com')
    expect(taleb.raw.type).toBe('specialist_advisor')
    expect(taleb.raw.system_prompt).toContain('Symptoms I notice first:')
    expect(taleb.raw.persona_tags).toContain('risk')
  })
})
