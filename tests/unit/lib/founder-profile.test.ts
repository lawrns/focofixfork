import { describe, expect, it } from 'vitest'

import { loadFounderProfile, scoreTextAgainstFounderProfile } from '@/lib/cofounder-mode/founder-profile'

describe('founder profile loader', () => {
  it('parses the founder profile into structured strategy context', async () => {
    const profile = await loadFounderProfile()

    expect(profile?.available).toBe(true)
    expect(profile?.parsed?.activeVenture).toBe('foco.mx')
    expect(profile?.parsed?.strategicPriorityOrder[0]).toBe('product_quality')
    expect(profile?.parsed?.northStarOutcomes).toHaveLength(3)
  })

  it('scores work text against founder strategy priorities', async () => {
    const profile = await loadFounderProfile()
    const result = scoreTextAgainstFounderProfile(
      profile?.parsed ?? null,
      'Improve night autonomy reliability, audit artifacts, and operator trust with better testing and observability',
    )

    expect(result.score).toBeGreaterThan(0)
    expect(result.matchedPriorities).toContain('product_quality')
    expect(result.reasons.some((reason) => reason.includes('priority'))).toBe(true)
  })
})
