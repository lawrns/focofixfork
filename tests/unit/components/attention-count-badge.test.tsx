import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AttentionCountBadge } from '@/components/dashboard/attention-count-badge'

describe('AttentionCountBadge', () => {
  it('returns null when count is 0', () => {
    const { container } = render(<AttentionCountBadge count={0} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows "1 needs attention" for count=1 (singular)', () => {
    render(<AttentionCountBadge count={1} />)
    expect(screen.getByText('1 needs attention')).toBeDefined()
  })

  it('shows "2 need attention" for count=2 (plural)', () => {
    render(<AttentionCountBadge count={2} />)
    expect(screen.getByText('2 need attention')).toBeDefined()
  })

  it('uses amber styling for count 1-2', () => {
    const { container } = render(<AttentionCountBadge count={2} />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('text-amber-500')
    expect(badge.className).toContain('border-amber-500/30')
    expect(badge.className).toContain('bg-amber-500/5')
  })

  it('uses rose styling for count >= 3', () => {
    const { container } = render(<AttentionCountBadge count={3} />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('text-rose-500')
    expect(badge.className).toContain('border-rose-500/30')
    expect(badge.className).toContain('bg-rose-500/5')
  })

  it('uses rose styling for high counts', () => {
    const { container } = render(<AttentionCountBadge count={10} />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('text-rose-500')
  })

  it('applies custom className', () => {
    const { container } = render(<AttentionCountBadge count={1} className="ml-4" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('ml-4')
  })
})
