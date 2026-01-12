import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriorityIndicator } from '../priority-indicator'

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return {
    ...actual,
    Flag: () => <div data-testid="flag-icon">Flag</div>,
    AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircle</div>,
    AlertTriangle: () => <div data-testid="alert-triangle-icon">AlertTriangle</div>,
  }
})

describe('PriorityIndicator Component', () => {
  describe('Color Coding', () => {
    it('should show red indicator for urgent priority', () => {
      render(<PriorityIndicator priority="urgent" variant="badge" />)
      const indicator = screen.getByRole('status')
      expect(indicator).toHaveClass('bg-red-100')
      expect(indicator).toHaveClass('text-red-900')
    })

    it('should show orange indicator for high priority', () => {
      render(<PriorityIndicator priority="high" variant="badge" />)
      const indicator = screen.getByRole('status')
      expect(indicator).toHaveClass('bg-amber-100')
      expect(indicator).toHaveClass('text-amber-900')
    })

    it('should show yellow indicator for medium priority', () => {
      render(<PriorityIndicator priority="medium" variant="badge" />)
      const indicator = screen.getByRole('status')
      expect(indicator).toHaveClass('bg-yellow-100')
      expect(indicator).toHaveClass('text-yellow-900')
    })

    it('should show blue indicator for low priority', () => {
      render(<PriorityIndicator priority="low" variant="badge" />)
      const indicator = screen.getByRole('status')
      expect(indicator).toHaveClass('bg-blue-100')
      expect(indicator).toHaveClass('text-blue-900')
    })

    it('should show gray indicator for no priority', () => {
      render(<PriorityIndicator priority="none" variant="badge" />)
      const indicator = screen.getByRole('status')
      expect(indicator).toHaveClass('bg-gray-100')
      expect(indicator).toHaveClass('text-gray-900')
    })
  })

  describe('Dot Variant', () => {
    it('should render small dot for dot variant', () => {
      render(<PriorityIndicator priority="urgent" variant="dot" />)
      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('h-2')
      expect(dot).toHaveClass('w-2')
    })

    it('should have red background for urgent dot', () => {
      render(<PriorityIndicator priority="urgent" variant="dot" />)
      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-red-500')
    })

    it('should have orange background for high priority dot', () => {
      render(<PriorityIndicator priority="high" variant="dot" />)
      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-amber-500')
    })

    it('should have yellow background for medium priority dot', () => {
      render(<PriorityIndicator priority="medium" variant="dot" />)
      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-yellow-500')
    })

    it('should have blue background for low priority dot', () => {
      render(<PriorityIndicator priority="low" variant="dot" />)
      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-blue-500')
    })

    it('should have gray background for no priority dot', () => {
      render(<PriorityIndicator priority="none" variant="dot" />)
      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-gray-500')
    })
  })

  describe('Badge Variant', () => {
    it('should render badge with text for badge variant', () => {
      render(<PriorityIndicator priority="urgent" variant="badge" />)
      expect(screen.getByText(/urgent/i)).toBeInTheDocument()
    })

    it('should display priority text in badge', () => {
      render(<PriorityIndicator priority="high" variant="badge" />)
      expect(screen.getByText(/high/i)).toBeInTheDocument()
    })

    it('should display lowercase priority in badge', () => {
      render(<PriorityIndicator priority="medium" variant="badge" />)
      expect(screen.getByText(/medium/i)).toBeInTheDocument()
    })

    it('should capitalize priority text in badge display', () => {
      render(<PriorityIndicator priority="low" variant="badge" />)
      const badge = screen.getByRole('status')
      expect(badge.textContent).toMatch(/Low/i)
    })
  })

  describe('Flag Variant', () => {
    it('should render flag icon for flag variant', () => {
      render(<PriorityIndicator priority="urgent" variant="flag" />)
      expect(screen.getByTestId('flag-icon')).toBeInTheDocument()
    })

    it('should have appropriate styling for urgent flag', () => {
      render(<PriorityIndicator priority="urgent" variant="flag" />)
      const flagContainer = screen.getByRole('status')
      expect(flagContainer).toHaveClass('text-red-500')
    })

    it('should have appropriate styling for high flag', () => {
      render(<PriorityIndicator priority="high" variant="flag" />)
      const flagContainer = screen.getByRole('status')
      expect(flagContainer).toHaveClass('text-amber-500')
    })

    it('should have appropriate styling for medium flag', () => {
      render(<PriorityIndicator priority="medium" variant="flag" />)
      const flagContainer = screen.getByRole('status')
      expect(flagContainer).toHaveClass('text-yellow-500')
    })

    it('should have appropriate styling for low flag', () => {
      render(<PriorityIndicator priority="low" variant="flag" />)
      const flagContainer = screen.getByRole('status')
      expect(flagContainer).toHaveClass('text-blue-500')
    })

    it('should display tooltip with priority text for flag variant', () => {
      render(<PriorityIndicator priority="urgent" variant="flag" />)
      const flagContainer = screen.getByRole('status')
      expect(flagContainer).toHaveAttribute('title', 'Urgent')
    })
  })

  describe('Accessibility', () => {
    it('should have role status for dot variant', () => {
      render(<PriorityIndicator priority="urgent" variant="dot" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have role status for badge variant', () => {
      render(<PriorityIndicator priority="high" variant="badge" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have role status for flag variant', () => {
      render(<PriorityIndicator priority="medium" variant="flag" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have aria-label describing priority', () => {
      render(<PriorityIndicator priority="urgent" variant="badge" />)
      const indicator = screen.getByRole('status')
      expect(indicator).toHaveAttribute('aria-label')
      expect(indicator.getAttribute('aria-label')).toContain('Urgent')
    })

    it('should have aria-label for dot variant', () => {
      render(<PriorityIndicator priority="high" variant="dot" />)
      const dot = screen.getByRole('status')
      expect(dot).toHaveAttribute('aria-label', 'High priority')
    })

    it('should render without errors when priority is none', () => {
      const { container } = render(<PriorityIndicator priority="none" variant="badge" />)
      expect(container).toBeInTheDocument()
    })
  })

  describe('Dark Mode Support', () => {
    it('should have dark mode classes in badge variant', () => {
      render(<PriorityIndicator priority="urgent" variant="badge" />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('dark:bg-red-900')
      expect(badge).toHaveClass('dark:text-red-100')
    })

    it('should have dark mode classes for high priority badge', () => {
      render(<PriorityIndicator priority="high" variant="badge" />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('dark:bg-amber-900')
      expect(badge).toHaveClass('dark:text-amber-100')
    })

    it('should have dark mode classes for dot variant', () => {
      render(<PriorityIndicator priority="urgent" variant="dot" />)
      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('dark:bg-red-400')
    })
  })

  describe('Optional Tooltip Prop', () => {
    it('should display custom tooltip when provided', () => {
      render(<PriorityIndicator priority="urgent" variant="badge" tooltip="Critical issue" />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveAttribute('title', 'Critical issue')
    })

    it('should use default tooltip when not provided', () => {
      render(<PriorityIndicator priority="urgent" variant="badge" />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveAttribute('title', 'Urgent')
    })

    it('should not show tooltip for dot variant without custom tooltip', () => {
      render(<PriorityIndicator priority="urgent" variant="dot" />)
      const dot = screen.getByRole('status')
      expect(dot).toHaveAttribute('aria-label', 'Urgent priority')
    })
  })

  describe('Task Card Integration', () => {
    it('should render priority indicator in task card context', () => {
      const { container } = render(
        <div className="task-card">
          <PriorityIndicator priority="high" variant="dot" />
        </div>
      )
      expect(container.querySelector('.task-card')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should render multiple priority indicators', () => {
      render(
        <>
          <div data-testid="task-1">
            <PriorityIndicator priority="urgent" variant="dot" />
          </div>
          <div data-testid="task-2">
            <PriorityIndicator priority="low" variant="dot" />
          </div>
        </>
      )
      const indicators = screen.getAllByRole('status')
      expect(indicators).toHaveLength(2)
    })
  })

  describe('Task List Integration', () => {
    it('should render badge variant in list context', () => {
      render(
        <ul>
          <li>
            <PriorityIndicator priority="high" variant="badge" />
          </li>
        </ul>
      )
      expect(screen.getByText(/high/i)).toBeInTheDocument()
    })

    it('should render consistent styling across multiple items', () => {
      render(
        <>
          <div>
            <PriorityIndicator priority="urgent" variant="badge" />
          </div>
          <div>
            <PriorityIndicator priority="urgent" variant="badge" />
          </div>
        </>
      )
      const badges = screen.getAllByRole('status')
      expect(badges).toHaveLength(2)
      badges.forEach((badge) => {
        expect(badge).toHaveClass('bg-red-100')
      })
    })
  })

  describe('Task Detail View Integration', () => {
    it('should render flag variant in detail context', () => {
      render(
        <div className="task-detail">
          <PriorityIndicator priority="high" variant="flag" />
        </div>
      )
      expect(screen.getByTestId('flag-icon')).toBeInTheDocument()
    })

    it('should render badge with text in detail context', () => {
      render(
        <div className="task-detail">
          <div className="priority-section">
            <label>Priority:</label>
            <PriorityIndicator priority="urgent" variant="badge" />
          </div>
        </div>
      )
      expect(screen.getByText(/urgent/i)).toBeInTheDocument()
    })
  })
})
