import { describe, expect, it } from 'vitest'
import {
  isReadPathAllowedForLane,
  isWritePathAllowedForLane,
  slugifyAgentName,
  validateWriteScopeForLane,
} from '@/lib/agent-ops/lane-policy'

describe('agent ops lane policy', () => {
  it('allows product_ui writes only in UI paths', () => {
    expect(isWritePathAllowedForLane('product_ui', 'src/components/button.tsx')).toBe(true)
    expect(isWritePathAllowedForLane('product_ui', 'supabase/migrations/abc.sql')).toBe(false)
  })

  it('keeps requirements lane docs-only', () => {
    expect(isWritePathAllowedForLane('requirements', 'docs/agent-ops/tasks/product-ui.md')).toBe(true)
    expect(isWritePathAllowedForLane('requirements', 'src/app/api/tasks/route.ts')).toBe(false)
  })

  it('flags scope violations for platform_api', () => {
    const violations = validateWriteScopeForLane('platform_api', [
      'src/app/api/pipeline/route.ts',
      'src/components/ui/button.tsx',
    ])
    expect(violations).toEqual(['src/components/ui/button.tsx'])
  })

  it('normalizes agent names into stable slugs', () => {
    expect(slugifyAgentName(' Alex Hormozi Co-Founder ')).toBe('alex-hormozi-co-founder')
  })

  it('grants broad read access where expected', () => {
    expect(isReadPathAllowedForLane('product_ui', 'src/lib/utils.ts')).toBe(true)
    expect(isReadPathAllowedForLane('platform_api', 'docs/agent-ops/README.md')).toBe(true)
  })
})
