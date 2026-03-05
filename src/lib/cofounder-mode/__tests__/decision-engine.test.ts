import { describe, expect, it } from 'vitest'
import { evaluateActionAgainstCoFounderConfig } from '@/lib/cofounder-mode/decision-engine'
import { DEFAULT_COFOUNDER_MODE_CONFIG } from '@/lib/cofounder-mode/parse'

describe('cofounder decision engine', () => {
  it('blocks action when weighted votes reject it', () => {
    const result = evaluateActionAgainstCoFounderConfig(DEFAULT_COFOUNDER_MODE_CONFIG, {
      actionType: 'pricingChange',
      domain: 'revenue',
      confidence: 0.95,
      agentVotes: [
        { agentId: 'ceo', approve: false, confidence: 0.9, weight: 1 },
        { agentId: 'cto', approve: false, confidence: 0.9, weight: 1 },
        { agentId: 'cfo', approve: true, confidence: 0.9, weight: 1 },
      ],
    })

    expect(result.allowed).toBe(false)
    expect(result.violatedRules).toContain('vote_rejected')
    expect(result.meta.resolution).toBe('blocked')
  })

  it('requires approval for irreversible actions', () => {
    const result = evaluateActionAgainstCoFounderConfig(DEFAULT_COFOUNDER_MODE_CONFIG, {
      actionType: 'deployment',
      domain: 'ops',
      confidence: 0.95,
      irreversible: true,
    })

    expect(result.allowed).toBe(false)
    expect(result.reasons.some((reason) => reason.includes('Irreversible action'))).toBe(true)
  })

  it('blocks writes for read-only integrations', () => {
    const config = {
      ...DEFAULT_COFOUNDER_MODE_CONFIG,
      integrations: [
        {
          key: 'github',
          access: 'read_only' as const,
          allowReads: true,
          allowWrites: false,
          requiresApprovalForWrites: false,
        },
      ],
    }

    const result = evaluateActionAgainstCoFounderConfig(config, {
      actionType: 'repoUpdate',
      domain: 'ops',
      confidence: 0.9,
      integrationKey: 'github',
      actionKind: 'write',
    })

    expect(result.allowed).toBe(false)
    expect(result.violatedRules).toContain('integration_read_only')
  })

  it('forces approval when divergence exceeds threshold', () => {
    const config = {
      ...DEFAULT_COFOUNDER_MODE_CONFIG,
      decisionEngine: {
        ...DEFAULT_COFOUNDER_MODE_CONFIG.decisionEngine,
        divergenceThreshold: 0.1,
      },
    }

    const result = evaluateActionAgainstCoFounderConfig(config, {
      actionType: 'strategyShift',
      domain: 'growth',
      confidence: 0.9,
      agentVotes: [
        { agentId: 'ceo', approve: true, confidence: 0.9, weight: 1 },
        { agentId: 'cto', approve: false, confidence: 0.9, weight: 1 },
      ],
    })

    expect(result.requiresApproval).toBe(true)
    expect(result.reasons).toContain('Agent divergence exceeded threshold')
  })
})
