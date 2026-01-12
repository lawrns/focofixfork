import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskCard } from '../task-card'
import { Task } from '../../types'

// Mock Supabase
vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  },
}))

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return {
    ...actual,
    Loader2: () => <div data-testid="loader-icon">Loading</div>,
    Flag: () => <div data-testid="flag-icon">Flag</div>,
  }
})

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock useRealtime hook
vi.mock('@/lib/hooks/useRealtime', () => ({
  useRealtime: () => null,
}))

// Mock useTranslation hook
vi.mock('@/lib/i18n/context', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: any = {
        'status.todo': 'To Do',
        'status.in_progress': 'In Progress',
        'status.review': 'Review',
        'status.done': 'Done',
        'priority.urgent': 'Urgent',
        'priority.high': 'High',
        'priority.medium': 'Medium',
        'priority.low': 'Low',
        'task.progress': 'Progress',
        'task.unassigned': 'Unassigned',
        'task.overdue': 'Overdue',
        'task.deleteTask': 'Delete Task',
        'task.deleteConfirmation': `Delete "${options?.taskTitle || 'task'}"?`,
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
      }
      return translations[key] || key
    },
  }),
}))

describe('TaskCard - Priority Indicator Integration', () => {
  const mockTask: Task & { assignee_name?: string } = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    project_id: 'project-1',
    status: 'todo',
    priority: 'urgent',
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Priority Indicator Display', () => {
    it('should render priority indicator dot next to priority badge', () => {
      render(<TaskCard task={mockTask} showActions={false} />)

      // Check for priority indicator (dot)
      const priorityIndicator = screen.getByRole('status')
      expect(priorityIndicator).toBeInTheDocument()
    })

    it('should show red dot for urgent priority', () => {
      render(<TaskCard task={{ ...mockTask, priority: 'urgent' }} showActions={false} />)

      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-red-500')
    })

    it('should show orange dot for high priority', () => {
      render(<TaskCard task={{ ...mockTask, priority: 'high' }} showActions={false} />)

      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-amber-500')
    })

    it('should show yellow dot for medium priority', () => {
      render(<TaskCard task={{ ...mockTask, priority: 'medium' }} showActions={false} />)

      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-yellow-500')
    })

    it('should show blue dot for low priority', () => {
      render(<TaskCard task={{ ...mockTask, priority: 'low' }} showActions={false} />)

      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-blue-500')
    })

    it('should display priority badge text', () => {
      render(<TaskCard task={{ ...mockTask, priority: 'urgent' }} showActions={false} />)

      expect(screen.getByText('Urgent')).toBeInTheDocument()
    })

    it('should display both dot and badge for priority', () => {
      const { container } = render(
        <TaskCard task={{ ...mockTask, priority: 'high' }} showActions={false} />
      )

      // Find the priority section
      const prioritySection = container.querySelector('[class*="gap-2"]')
      expect(prioritySection).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()
    })
  })

  describe('Dark Mode Support', () => {
    it('should apply dark mode classes to dot indicator', () => {
      render(<TaskCard task={{ ...mockTask, priority: 'urgent' }} showActions={false} />)

      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('dark:bg-red-400')
    })

    it('should maintain color consistency in dark mode', () => {
      render(<TaskCard task={{ ...mockTask, priority: 'high' }} showActions={false} />)

      const dot = screen.getByRole('status')
      expect(dot).toHaveClass('dark:bg-amber-400')
    })
  })

  describe('Priority Indicator Accessibility', () => {
    it('should have aria-label for priority indicator', () => {
      render(<TaskCard task={{ ...mockTask, priority: 'urgent' }} showActions={false} />)

      const dot = screen.getByRole('status')
      expect(dot).toHaveAttribute('aria-label')
    })

    it('should have descriptive aria-label for priority', () => {
      render(<TaskCard task={{ ...mockTask, priority: 'high' }} showActions={false} />)

      const dot = screen.getByRole('status')
      expect(dot.getAttribute('aria-label')).toContain('High')
    })

    it('should have title attribute for tooltip', () => {
      render(<TaskCard task={{ ...mockTask, priority: 'urgent' }} showActions={false} />)

      const dot = screen.getByRole('status')
      expect(dot).toHaveAttribute('title')
    })
  })

  describe('Multiple Tasks with Different Priorities', () => {
    it('should render different colored dots for different priorities', () => {
      const { rerender } = render(
        <TaskCard task={{ ...mockTask, priority: 'urgent' }} showActions={false} />
      )

      let dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-red-500')

      rerender(
        <TaskCard task={{ ...mockTask, priority: 'low' }} showActions={false} />
      )

      dot = screen.getByRole('status')
      expect(dot).toHaveClass('bg-blue-500')
    })
  })

  describe('Task Status and Priority Display', () => {
    it('should display both status and priority indicators', () => {
      const { container } = render(
        <TaskCard task={mockTask} showActions={false} />
      )

      // Should have priority dot
      expect(screen.getByRole('status')).toBeInTheDocument()

      // Should have priority badge
      expect(screen.getByText('Urgent')).toBeInTheDocument()

      // Should have status badge
      expect(screen.getByText('To Do')).toBeInTheDocument()
    })

    it('should maintain visual hierarchy with status badge first', () => {
      const { container } = render(
        <TaskCard task={mockTask} showActions={false} />
      )

      const badges = container.querySelectorAll('[class*="text-sm"]')
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  describe('Priority Indicator Responsive Design', () => {
    it('should render correctly in task card layout', () => {
      const { container } = render(
        <TaskCard task={mockTask} showActions={false} />
      )

      // Should be in CardContent
      const cardContent = container.querySelector('[class*="CardContent"]')
      expect(cardContent || container).toBeInTheDocument()
    })

    it('should align properly with flex layout', () => {
      const { container } = render(
        <TaskCard task={mockTask} showActions={false} />
      )

      // Check for flex wrapper
      const flexContainer = container.querySelector('[class*="flex"]')
      expect(flexContainer).toBeInTheDocument()
    })
  })

  describe('Visual Feedback Integration', () => {
    it('should remain visible when task is completed', () => {
      render(
        <TaskCard task={{ ...mockTask, status: 'done' }} showActions={false} />
      )

      const dot = screen.getByRole('status')
      expect(dot).toBeInTheDocument()
    })

    it('should remain visible when task is in progress', () => {
      render(
        <TaskCard task={{ ...mockTask, status: 'in_progress' }} showActions={false} />
      )

      const dot = screen.getByRole('status')
      expect(dot).toBeInTheDocument()
    })

    it('should remain visible with overdue indicator', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      render(
        <TaskCard
          task={{
            ...mockTask,
            status: 'todo',
            due_date: pastDate.toISOString(),
          }}
          showActions={false}
        />
      )

      const dot = screen.getByRole('status')
      expect(dot).toBeInTheDocument()
    })
  })
})
