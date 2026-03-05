import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/services/ai-service', () => ({
  AIService: class {
    async generate() {
      throw new Error('AI unavailable in unit test')
    }
  },
  aiService: null,
}))

let generateWorkflowProposals: typeof import('@/lib/n8n/project-workflows').generateWorkflowProposals
let ALLOWED_AUGMENTATIONS: typeof import('@/lib/n8n/project-workflows').ALLOWED_AUGMENTATIONS

beforeAll(async () => {
  const module = await import('@/lib/n8n/project-workflows')
  generateWorkflowProposals = module.generateWorkflowProposals
  ALLOWED_AUGMENTATIONS = module.ALLOWED_AUGMENTATIONS
})

describe('project workflow planner', () => {
  it('returns between one and three proposals with template provenance', async () => {
    const proposals = await generateWorkflowProposals({
      project: {
        id: 'project-1',
        name: 'Revenue Ops',
        description: 'Monitor billing and create founder briefings.',
        brief: 'We need reliable recurring visibility with safe callbacks.',
        metadata: null,
        delegation_settings: null,
      },
      tasks: [
        { title: 'Track Stripe movement', description: 'Need alerts and summaries.', status: 'in_progress' },
        { title: 'Prepare morning founder report', description: 'Summarize daily metrics.', status: 'next' },
      ],
    })

    expect(proposals.length).toBeGreaterThanOrEqual(1)
    expect(proposals.length).toBeLessThanOrEqual(3)
    for (const proposal of proposals) {
      expect(proposal.sourceTemplate.id).toBeTruthy()
      expect(proposal.summary.length).toBeGreaterThan(10)
      expect(Array.isArray(proposal.stepLabels)).toBe(true)
    }
  })

  it('keeps add-ons inside the approved safelist', async () => {
    const proposals = await generateWorkflowProposals({
      project: {
        id: 'project-2',
        name: 'Content Ops',
        description: 'Manage content publication workflows.',
        brief: 'Keep auditability and guard external effects.',
        metadata: null,
        delegation_settings: null,
      },
      tasks: [{ title: 'Generate posts', description: 'Create draft posts from source scans.', status: 'next' }],
    })

    const allowed = new Set(ALLOWED_AUGMENTATIONS.map((item) => item.id))
    for (const proposal of proposals) {
      for (const addOn of proposal.suggestedAddOns) {
        expect(allowed.has(addOn.id)).toBe(true)
      }
    }
  })
})
