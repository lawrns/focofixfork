import { describe, expect, it } from 'vitest'
import { DEFAULT_COFOUNDER_POLICY, evaluateActionAgainstPolicy, isInOvernightWindow, resolveCoFounderPolicy } from '@/lib/autonomy/policy'

describe('autonomy policy', () => {
  it('blocks production deploys by default', () => {
    const result = evaluateActionAgainstPolicy(DEFAULT_COFOUNDER_POLICY, {
      actionType: 'deployment',
      domain: 'ops',
      productionImpact: true,
      confidence: 0.95,
    })

    expect(result.allowed).toBe(false)
    expect(result.violatedRules).toContain('blocked_action_type')
    expect(result.violatedRules).toContain('production_deploy_blocked')
  })

  it('requires approval when confidence is below threshold', () => {
    const result = evaluateActionAgainstPolicy(DEFAULT_COFOUNDER_POLICY, {
      actionType: 'emailCampaign',
      domain: 'growth',
      confidence: 0.4,
    })

    expect(result.allowed).toBe(true)
    expect(result.requiresApproval).toBe(true)
  })

  it('applies configured overrides from aiPolicy.cofounder', () => {
    const policy = resolveCoFounderPolicy({
      cofounder: {
        mode: 'advisor',
        hardLimits: {
          spendCapUsdPerWindow: 500,
        },
      },
    })

    expect(policy.mode).toBe('advisor')
    expect(policy.hardLimits.spendCapUsdPerWindow).toBe(500)
    expect(policy.hardLimits.maxExternalMessages).toBe(DEFAULT_COFOUNDER_POLICY.hardLimits.maxExternalMessages)
  })

  it('detects overnight window crossing midnight', () => {
    const inWindow = isInOvernightWindow(DEFAULT_COFOUNDER_POLICY, new Date('2026-03-03T23:30:00'))
    const outWindow = isInOvernightWindow(DEFAULT_COFOUNDER_POLICY, new Date('2026-03-03T14:00:00'))

    expect(inWindow).toBe(true)
    expect(outWindow).toBe(false)
  })

  it('evaluates overnight window using configured timezone', () => {
    const policy = resolveCoFounderPolicy({
      cofounder: {
        overnightWindow: {
          enabled: true,
          timezone: 'UTC',
          start: '22:00',
          end: '07:00',
        },
      },
    })

    expect(isInOvernightWindow(policy, new Date('2026-03-03T23:30:00Z'))).toBe(true)
    expect(isInOvernightWindow(policy, new Date('2026-03-03T14:00:00Z'))).toBe(false)
  })
})
