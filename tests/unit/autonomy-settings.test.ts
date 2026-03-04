import { describe, expect, it } from 'vitest'
import { resolveEffectiveCoFounderPolicy } from '@/lib/autonomy/settings'

describe('autonomy settings policy resolution', () => {
  it('uses user policy when workspace policy is absent', () => {
    const policy = resolveEffectiveCoFounderPolicy({
      cofounder: {
        mode: 'advisor',
      },
    })

    expect(policy.mode).toBe('advisor')
  })

  it('applies workspace cofounder overrides over user policy', () => {
    const policy = resolveEffectiveCoFounderPolicy(
      {
        cofounder: {
          mode: 'bounded',
          hardLimits: {
            spendCapUsdPerWindow: 300,
            maxExternalMessages: 5,
            maxLiveExperiments: 2,
          },
        },
      },
      {
        cofounder: {
          mode: 'advisor',
          hardLimits: {
            spendCapUsdPerWindow: 50,
          },
        },
      }
    )

    expect(policy.mode).toBe('advisor')
    expect(policy.hardLimits.spendCapUsdPerWindow).toBe(50)
    expect(policy.hardLimits.maxExternalMessages).toBe(5)
  })
})
