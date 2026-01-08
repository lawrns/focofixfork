import { describe, it, expect } from 'vitest'
import { FeatureFlagsService } from '@/lib/feature-flags/feature-flags'

describe('FeatureFlagsService.isEnabled', () => {
  it('returns false when flag is disabled', () => {
    const service = FeatureFlagsService.getInstance()
    service.setFlag('voice_capture_enabled', { enabled: false, rollout_percentage: 0, user_ids: [], organization_ids: [], environments: [] })
    const enabled = service.isEnabled('voice_capture_enabled', { environment: 'development' })
    expect(enabled).toBe(false)
  })

  it('handles undefined arrays and environment safely', () => {
    const service = FeatureFlagsService.getInstance()
    service.setFlag('ui_modernization', { enabled: true, rollout_percentage: 100, user_ids: [] as any, organization_ids: [] as any, environments: [] as any })
    const enabled = service.isEnabled('ui_modernization')
    expect(enabled).toBe(true)
  })

  it('applies rollout percentage when userId provided', () => {
    const service = FeatureFlagsService.getInstance()
    service.setFlag('ai_gpt4_integration', { enabled: true, rollout_percentage: 0, user_ids: [], organization_ids: [], environments: ['development'] })
    const enabledNoUser = service.isEnabled('ai_gpt4_integration', { environment: 'development' })
    expect(enabledNoUser).toBe(false)
    const enabledWithUser = service.isEnabled('ai_gpt4_integration', { environment: 'development', userId: '00000000-0000-0000-0000-000000000001' })
    expect(typeof enabledWithUser).toBe('boolean')
  })
})

