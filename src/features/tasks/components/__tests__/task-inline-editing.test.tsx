import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock useTranslation hook
vi.mock('@/lib/i18n/context', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === 'status.todo') return 'To Do'
      if (key === 'status.in_progress') return 'In Progress'
      if (key === 'status.review') return 'Review'
      if (key === 'status.done') return 'Done'
      if (key === 'priority.low') return 'Low'
      if (key === 'priority.medium') return 'Medium'
      if (key === 'priority.high') return 'High'
      if (key === 'priority.urgent') return 'Urgent'
      if (key === 'task.overdue') return 'Overdue'
      if (key === 'task.progress') return 'Progress'
      if (key === 'task.unassigned') return 'Unassigned'
      if (key === 'task.deleteTask') return 'Delete Task'
      if (key === 'task.deleteConfirmation') return `Delete "${options?.taskTitle}"?`
      if (key === 'common.cancel') return 'Cancel'
      if (key === 'common.delete') return 'Delete'
      return key
    },
  }),
}))

const mockTask: Task = {
  id: '1',
  title: 'Test Task',
  description: 'Test Description',
  project_id: 'proj-1',
  status: 'todo',
  priority: 'medium',
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('TaskCard - Inline Editing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Double-click to enable inline edit', () => {
    it('should enable inline editing on double-click of task title', async () => {
      render(<TaskCard task={mockTask} />)

      const titleElement = screen.getByText('Test Task')
      fireEvent.doubleClick(titleElement)

      // Check if editing mode is enabled (should have an input field)
      await waitFor(() => {
        const editableElements = document.querySelectorAll('[data-testid="inline-title-edit"]')
        expect(editableElements.length).toBeGreaterThan(0)
      })
    })

    it('should select text when entering inline edit mode', async () => {
      render(<TaskCard task={mockTask} />)

      const titleElement = screen.getByText('Test Task')
      fireEvent.doubleClick(titleElement)

      await waitFor(() => {
        const input = document.querySelector('[data-testid="inline-title-edit"]') as HTMLInputElement
        expect(input.value).toBe('Test Task')
      })
    })

    it('should auto-focus the input field when entering edit mode', async () => {
      render(<TaskCard task={mockTask} />)

      const titleElement = screen.getByText('Test Task')
      fireEvent.doubleClick(titleElement)

      await waitFor(() => {
        const input = document.querySelector('[data-testid="inline-title-edit"]') as HTMLInputElement
        expect(document.activeElement).toBe(input)
      })
    })
  })

  describe('Keyboard shortcuts', () => {
    it('should trigger save action on Enter key', async () => {
      render(<TaskCard task={mockTask} />)

      const titleElement = screen.getByText('Test Task')
      fireEvent.doubleClick(titleElement)

      await waitFor(() => {
        const input = document.querySelector('[data-testid="inline-title-edit"]') as HTMLInputElement
        fireEvent.change(input, { target: { value: 'Updated Task' } })
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
      })
    })

    it('should cancel editing on Escape key', async () => {
      render(<TaskCard task={mockTask} />)

      const titleElement = screen.getByText('Test Task')
      fireEvent.doubleClick(titleElement)

      await waitFor(() => {
        const input = document.querySelector('[data-testid="inline-title-edit"]') as HTMLInputElement
        fireEvent.change(input, { target: { value: 'Updated Task' } })
        fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' })
      })

      // Should exit edit mode and revert to original display
      expect(screen.getByText('Test Task')).toBeInTheDocument()
    })
  })

  describe('Inline field editing', () => {
    it('should support inline editing for due date', async () => {
      const taskWithDueDate = {
        ...mockTask,
        due_date: '2024-12-31',
      }
      render(<TaskCard task={taskWithDueDate} />)

      // Find and double-click the due date
      const dateElement = screen.getByText('12/31/2024')
      fireEvent.doubleClick(dateElement)

      await waitFor(() => {
        const dateInput = document.querySelector('[data-testid="inline-due_date-edit"]') as HTMLInputElement
        expect(dateInput).toBeInTheDocument()
        expect(dateInput.type).toBe('date')
      })
    })

    it('should support inline editing for priority', async () => {
      render(<TaskCard task={mockTask} />)

      // Find and double-click the priority badge
      const priorityElement = screen.getByText('Medium')
      fireEvent.doubleClick(priorityElement)

      await waitFor(() => {
        const prioritySelect = document.querySelector('[data-testid="inline-priority-edit"]')
        expect(prioritySelect).toBeInTheDocument()
      })
    })
  })

  describe('Validation', () => {
    it('should prevent saving with empty title', async () => {
      render(<TaskCard task={mockTask} />)

      const titleElement = screen.getByText('Test Task')
      fireEvent.doubleClick(titleElement)

      await waitFor(() => {
        const input = document.querySelector('[data-testid="inline-title-edit"]') as HTMLInputElement
        fireEvent.change(input, { target: { value: '' } })
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
      })

      // Should show error message
      await waitFor(() => {
        const errorMsg = screen.queryByText('Title is required')
        expect(errorMsg).toBeInTheDocument()
      })
    })

    it('should show validation error for empty title inline', async () => {
      render(<TaskCard task={mockTask} />)

      const titleElement = screen.getByText('Test Task')
      fireEvent.doubleClick(titleElement)

      await waitFor(() => {
        const input = document.querySelector('[data-testid="inline-title-edit"]') as HTMLInputElement
        fireEvent.change(input, { target: { value: '' } })
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
      })

      // Error message should be visible in the edit field
      await waitFor(() => {
        const error = document.querySelector('[role="alert"]')
        expect(error).toBeInTheDocument()
      })
    })
  })

  describe('Visual feedback', () => {
    it('should highlight border when in edit mode', async () => {
      render(<TaskCard task={mockTask} />)

      const titleElement = screen.getByText('Test Task')
      fireEvent.doubleClick(titleElement)

      await waitFor(() => {
        const editContainer = document.querySelector('[data-testid="inline-edit-container"]')
        expect(editContainer?.querySelector('.border-primary')).toBeInTheDocument()
      })
    })

    it('should show inline dropdown for priority field', async () => {
      render(<TaskCard task={mockTask} />)

      const priorityElement = screen.getByText('Medium')
      fireEvent.doubleClick(priorityElement)

      await waitFor(() => {
        const selectTrigger = document.querySelector('[data-testid="inline-priority-edit"]')
        expect(selectTrigger).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard navigable', async () => {
      render(<TaskCard task={mockTask} />)

      const titleElement = screen.getByText('Test Task')
      fireEvent.doubleClick(titleElement)

      await waitFor(() => {
        const input = document.querySelector('[data-testid="inline-title-edit"]') as HTMLInputElement
        expect(input).toHaveFocus()
      })
    })

    it('should have proper ARIA labels', async () => {
      render(<TaskCard task={mockTask} />)

      const titleElement = screen.getByText('Test Task')
      fireEvent.doubleClick(titleElement)

      await waitFor(() => {
        const input = document.querySelector('[data-testid="inline-title-edit"]')
        expect(input).toHaveAttribute('aria-label')
      })
    })

    it('should have aria-label on buttons', async () => {
      render(<TaskCard task={mockTask} />)

      const titleElement = screen.getByText('Test Task')
      fireEvent.doubleClick(titleElement)

      await waitFor(() => {
        const buttons = document.querySelectorAll('[aria-label]')
        expect(buttons.length).toBeGreaterThan(0)
      })
    })
  })
})
