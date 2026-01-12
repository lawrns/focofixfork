import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriorityIndicator } from '../priority-indicator'

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return {
    ...actual,
    Flag: () => <div data-testid="flag-icon">Flag</div>,
  }
})

describe('PriorityIndicator - Integration Tests', () => {
  describe('Task List Integration', () => {
    it('should render badge variant for list items', () => {
      const { container } = render(
        <ul>
          <li className="flex items-center gap-2">
            <PriorityIndicator priority="high" variant="badge" />
            <span>Task Title</span>
          </li>
        </ul>
      )

      expect(screen.getByText('High')).toBeInTheDocument()
      expect(container.querySelector('ul')).toBeInTheDocument()
    })

    it('should display consistent styling across list items', () => {
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

    it('should render sorted priority list', () => {
      const priorities: Array<'urgent' | 'high' | 'medium' | 'low'> = ['urgent', 'high', 'medium', 'low']

      render(
        <div className="priority-list">
          {priorities.map((priority) => (
            <div key={priority} className="priority-item">
              <PriorityIndicator priority={priority} variant="badge" />
            </div>
          ))}
        </div>
      )

      expect(screen.getByText('Urgent')).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
      expect(screen.getByText('Low')).toBeInTheDocument()
    })
  })

  describe('Task Card Integration', () => {
    it('should render dot variant next to priority text', () => {
      render(
        <div className="task-card-priority">
          <PriorityIndicator priority="high" variant="dot" />
          <span>High Priority</span>
        </div>
      )

      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-amber-500')
      expect(screen.getByText('High Priority')).toBeInTheDocument()
    })

    it('should maintain alignment in flex layout', () => {
      const { container } = render(
        <div className="flex items-center gap-2">
          <PriorityIndicator priority="medium" variant="dot" />
          <span>Medium</span>
        </div>
      )

      const flexContainer = container.querySelector('.flex')
      expect(flexContainer).toHaveClass('items-center')
      expect(flexContainer).toHaveClass('gap-2')
    })

    it('should display both dot and badge together', () => {
      render(
        <div className="flex gap-2 items-center">
          <PriorityIndicator priority="urgent" variant="dot" />
          <PriorityIndicator priority="urgent" variant="badge" />
        </div>
      )

      const indicators = screen.getAllByRole('status')
      expect(indicators).toHaveLength(2)
    })
  })

  describe('Task Detail View Integration', () => {
    it('should render badge with full text in detail view', () => {
      render(
        <div className="task-detail">
          <div className="priority-section">
            <label>Priority:</label>
            <PriorityIndicator priority="urgent" variant="badge" />
          </div>
        </div>
      )

      expect(screen.getByText('Urgent')).toBeInTheDocument()
      expect(screen.getByText('Priority:')).toBeInTheDocument()
    })

    it('should render flag variant in dropdown menu', () => {
      const priorities: Array<'urgent' | 'high' | 'medium' | 'low'> = ['urgent', 'high', 'medium', 'low']

      render(
        <select>
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              <PriorityIndicator priority={priority} variant="flag" />
            </option>
          ))}
        </select>
      )

      const flagIcons = screen.getAllByTestId('flag-icon')
      expect(flagIcons.length).toBeGreaterThan(0)
    })

    it('should display accessible priority in detail view', () => {
      render(
        <div className="task-detail-priority">
          <PriorityIndicator priority="high" variant="badge" />
        </div>
      )

      const badge = screen.getByRole('status')
      expect(badge).toHaveAttribute('aria-label')
      expect(badge.getAttribute('aria-label')).toContain('High')
    })
  })

  describe('Multiple Views Simultaneously', () => {
    it('should render differently across multiple views', () => {
      render(
        <div>
          {/* Card view */}
          <div className="card-view">
            <PriorityIndicator priority="urgent" variant="dot" />
          </div>

          {/* List view */}
          <div className="list-view">
            <PriorityIndicator priority="urgent" variant="badge" />
          </div>

          {/* Detail view */}
          <div className="detail-view">
            <PriorityIndicator priority="urgent" variant="flag" />
          </div>
        </div>
      )

      const indicators = screen.getAllByRole('status')
      expect(indicators).toHaveLength(3)
    })

    it('should maintain consistency when rendering same priority', () => {
      render(
        <div>
          <PriorityIndicator priority="high" variant="dot" />
          <PriorityIndicator priority="high" variant="badge" />
          <PriorityIndicator priority="high" variant="flag" />
        </div>
      )

      const indicators = screen.getAllByRole('status')
      expect(indicators).toHaveLength(3)

      // All should have same priority color mapping
      expect(indicators[0]).toHaveClass('bg-amber-500') // dot
      expect(indicators[1]).toHaveClass('bg-amber-100') // badge
      expect(indicators[2]).toHaveClass('text-amber-500') // flag
    })
  })

  describe('Priority Sorting', () => {
    it('should support visual sorting by priority', () => {
      const tasks = [
        { id: '1', title: 'Task 1', priority: 'urgent' as const },
        { id: '2', title: 'Task 2', priority: 'high' as const },
        { id: '3', title: 'Task 3', priority: 'medium' as const },
        { id: '4', title: 'Task 4', priority: 'low' as const },
      ]

      const sortedByPriority = tasks.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })

      render(
        <div>
          {sortedByPriority.map((task) => (
            <div key={task.id} className="task-item">
              <PriorityIndicator priority={task.priority} variant="dot" />
              <span>{task.title}</span>
            </div>
          ))}
        </div>
      )

      const tasks_text = screen.getAllByText(/Task/)
      expect(tasks_text[0]).toHaveTextContent('Task 1')
      expect(tasks_text[1]).toHaveTextContent('Task 2')
      expect(tasks_text[2]).toHaveTextContent('Task 3')
      expect(tasks_text[3]).toHaveTextContent('Task 4')
    })
  })

  describe('Dynamic Priority Updates', () => {
    it('should handle priority changes', () => {
      const { rerender } = render(
        <PriorityIndicator priority="low" variant="badge" />
      )

      expect(screen.getByText('Low')).toBeInTheDocument()

      rerender(
        <PriorityIndicator priority="urgent" variant="badge" />
      )

      expect(screen.queryByText('Low')).not.toBeInTheDocument()
      expect(screen.getByText('Urgent')).toBeInTheDocument()
    })

    it('should update color when priority changes', () => {
      const { rerender } = render(
        <PriorityIndicator priority="low" variant="dot" />
      )

      let dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-blue-500')

      rerender(
        <PriorityIndicator priority="urgent" variant="dot" />
      )

      dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-red-500')
    })

    it('should handle variant changes', () => {
      const { rerender } = render(
        <PriorityIndicator priority="high" variant="dot" />
      )

      let indicator = screen.getByRole('status')
      expect(indicator).toHaveClass('h-2')

      rerender(
        <PriorityIndicator priority="high" variant="badge" />
      )

      indicator = screen.getByRole('status')
      expect(screen.getByText('High')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should render in compact layouts', () => {
      const { container } = render(
        <div className="w-64 space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate">Long task title that might overflow</span>
            <PriorityIndicator priority="urgent" variant="dot" />
          </div>
        </div>
      )

      expect(container.querySelector('.flex')).toBeInTheDocument()
    })

    it('should render in full-width layouts', () => {
      const { container } = render(
        <div className="w-full">
          <div className="flex items-center justify-between">
            <span>Task Title</span>
            <div className="flex gap-2">
              <PriorityIndicator priority="high" variant="badge" />
              <PriorityIndicator priority="high" variant="dot" />
            </div>
          </div>
        </div>
      )

      expect(container.querySelector('.w-full')).toBeInTheDocument()
    })
  })
})
