import { describe, expect, it } from 'vitest'
import { createPivotalDedupeHash, evaluatePivotalQuestion } from '@/lib/cofounder-mode/pivotal-questions'
import { DEFAULT_COFOUNDER_MODE_CONFIG } from '@/lib/cofounder-mode/parse'

describe('pivotal questions', () => {
  it('creates stable dedupe hashes', () => {
    const a = createPivotalDedupeHash({ question: 'Ship this now?', workspaceId: 'ws-1' })
    const b = createPivotalDedupeHash({ question: 'ship this now?', workspaceId: 'ws-1' })
    expect(a).toBe(b)
  })

  it('suppresses duplicate questions', () => {
    const hash = createPivotalDedupeHash({ question: 'Raise budget?', workspaceId: 'ws-1' })
    const result = evaluatePivotalQuestion(
      DEFAULT_COFOUNDER_MODE_CONFIG,
      {
        question: 'Raise budget?',
        workspaceId: 'ws-1',
      },
      {
        askedToday: 0,
        notifiedThisHour: 0,
        existingHashes: [hash],
      }
    )

    expect(result.shouldQueue).toBe(false)
    expect(result.reasonCodes).toContain('dedupe_hash_match')
  })

  it('queues when cooldown is active', () => {
    const now = new Date('2026-03-04T10:00:00.000Z')
    const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000)).toISOString()

    const result = evaluatePivotalQuestion(
      DEFAULT_COFOUNDER_MODE_CONFIG,
      {
        question: 'Do we trigger fallback?',
        now,
      },
      {
        askedToday: 0,
        notifiedThisHour: 0,
        lastAskedAt: fiveMinutesAgo,
      }
    )

    expect(result.shouldQueue).toBe(true)
    expect(result.shouldNotify).toBe(false)
    expect(result.reasonCodes).toContain('cooldown_active')
  })

  it('queues when hourly budget is exhausted', () => {
    const config = {
      ...DEFAULT_COFOUNDER_MODE_CONFIG,
      pivotalQuestions: {
        ...DEFAULT_COFOUNDER_MODE_CONFIG.pivotalQuestions,
        maxNotificationsPerHour: 1,
      },
    }

    const result = evaluatePivotalQuestion(
      config,
      {
        question: 'Do we proceed?',
        triggers: ['high_divergence'],
      },
      {
        askedToday: 0,
        notifiedThisHour: 1,
      }
    )

    expect(result.reasonCodes).toContain('hourly_budget_exhausted')
    expect(result.shouldNotify).toBe(false)
  })
})
