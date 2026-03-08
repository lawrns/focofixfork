import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/ai/runtime-health', () => ({
  getAIRuntimeHealth: vi.fn(),
}))

import { getAIRuntimeHealth } from '@/lib/ai/runtime-health'
import { chooseDirectFallbackModel } from '@/lib/pipeline/runtime'

const mockedHealth = vi.mocked(getAIRuntimeHealth)

describe('pipeline runtime fallback selection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('remaps backend-only models to the first healthy direct fallback', async () => {
    mockedHealth.mockResolvedValue({
      ok: true,
      status: 'ready',
      message: 'ok',
      models: [
        { model: 'gpt-5.4-medium', available: true },
        { model: 'glm-5', available: true },
      ],
      runtime_sources: [],
      clawdbot: { reachable: false, reported_models: [] },
    } as any)

    const result = await chooseDirectFallbackModel({
      requestedModel: 'kimi-k2-standard',
      resolvedModel: 'kimi-k2-standard',
      fallbackChain: ['gpt-5.4-medium', 'glm-5'],
    })

    expect(result).toEqual({
      model: 'gpt-5.4-medium',
      remapped: true,
      reason: expect.stringContaining('Remapped from'),
    })
  })

  it('keeps the resolved model when it is directly available', async () => {
    mockedHealth.mockResolvedValue({
      ok: true,
      status: 'ready',
      message: 'ok',
      models: [
        { model: 'gpt-5.4-medium', available: true },
      ],
      runtime_sources: [],
      clawdbot: { reachable: false, reported_models: [] },
    } as any)

    const result = await chooseDirectFallbackModel({
      requestedModel: 'gpt-5.4-medium',
      resolvedModel: 'gpt-5.4-medium',
      fallbackChain: ['glm-5'],
    })

    expect(result).toEqual({ model: 'gpt-5.4-medium', remapped: false, reason: undefined })
  })
})
