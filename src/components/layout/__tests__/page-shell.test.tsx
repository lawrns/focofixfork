import { render, screen } from '@testing-library/react'
import { PageShell } from '../page-shell'

describe('PageShell', () => {
  it('renders children correctly', () => {
    render(
      <PageShell>
        <div>Test Content</div>
      </PageShell>
    )
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies correct max-width class', () => {
    const { container } = render(
      <PageShell maxWidth="4xl">
        <div>Content</div>
      </PageShell>
    )
    expect(container.firstChild).toHaveClass('max-w-4xl')
  })

  it('applies custom className', () => {
    const { container } = render(
      <PageShell className="custom-class">
        <div>Content</div>
      </PageShell>
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
