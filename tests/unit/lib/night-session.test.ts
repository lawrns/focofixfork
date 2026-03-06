import { describe, expect, it } from 'vitest'

import { buildNightBranchName, isProtectedBranch, sanitizeBranchSegment } from '@/lib/autonomy/night-session'

describe('night session helpers', () => {
  it('detects protected branches', () => {
    expect(isProtectedBranch('main')).toBe(true)
    expect(isProtectedBranch('MASTER')).toBe(true)
    expect(isProtectedBranch('feature/autonomy')).toBe(false)
  })

  it('sanitizes branch segments for git-safe naming', () => {
    expect(sanitizeBranchSegment('Chief Agent !!!')).toBe('chief-agent')
    expect(sanitizeBranchSegment('////')).toBe('night')
  })

  it('builds dated branch names from prefix and agent name', () => {
    const branch = buildNightBranchName(
      { id: 'agent-1', name: 'Night Operator' },
      { branchPrefix: 'autonomy' },
      new Date('2026-03-06T05:00:00.000Z'),
    )

    expect(branch).toBe('autonomy/night-operator/20260306')
  })
})
