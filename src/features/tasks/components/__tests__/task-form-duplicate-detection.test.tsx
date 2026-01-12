import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskForm } from '../task-form'
import type { Task } from '../../utils/duplicate-detection'

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return {
    ...actual,
    Loader2: () => <div data-testid="loader-icon">Loading</div>,
  }
})

// Mock the auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' }
  })
}))

// Mock TasksService
vi.mock('../../services/taskService', () => ({
  TasksService: {
    getUserTasks: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'task-1',
          title: 'Design UI components',
          project_id: 'project-1',
        },
        {
          id: 'task-2',
          title: 'Design UI Components',
          project_id: 'project-1',
        },
      ],
    }),
  },
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('TaskForm - Duplicate Detection Integration', () => {
  const mockProjects = [
    { id: 'project-1', name: 'Test Project' },
    { id: 'project-2', name: 'Another Project' }
  ]

  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  const mockProjectTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Design UI components',
      project_id: 'project-1',
    },
    {
      id: 'task-2',
      title: 'Implement authentication',
      project_id: 'project-1',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockClear()
  })

  describe('Duplicate Detection on Title Blur', () => {
    it('should show duplicate warning dialog when similar title is entered and field loses focus', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          projectTasks={mockProjectTasks}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)

      // Enter a similar title to existing task
      await user.type(titleInput, 'Design UI components')

      // Blur the field to trigger duplicate check
      await user.tab()

      // Dialog should appear after a short delay
      await waitFor(() => {
        expect(screen.getByText('Possible Duplicate Task')).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('should not show dialog when title is completely unique', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          projectTasks={mockProjectTasks}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)

      // Enter a unique title
      await user.type(titleInput, 'Completely unique task xyz')

      // Blur the field
      await user.tab()

      // Dialog should not appear
      expect(screen.queryByText('Possible Duplicate Task')).not.toBeInTheDocument()
    })

    it('should not show dialog when field is empty', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          projectTasks={mockProjectTasks}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)

      // Click and blur without entering anything
      await user.click(titleInput)
      await user.tab()

      // Dialog should not appear
      expect(screen.queryByText('Possible Duplicate Task')).not.toBeInTheDocument()
    })

    it('should not show dialog when editing existing task', async () => {
      const user = userEvent.setup()

      const existingTask = {
        id: 'task-1',
        title: 'Design UI components',
        project_id: 'project-1',
      }

      render(
        <TaskForm
          task={existingTask}
          projects={mockProjects}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          projectTasks={mockProjectTasks}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)

      // Keep the same title
      expect(titleInput).toHaveValue('Design UI components')

      // Blur the field
      await user.click(titleInput)
      await user.tab()

      // Dialog should not appear when editing
      expect(screen.queryByText('Possible Duplicate Task')).not.toBeInTheDocument()
    })
  })

  describe('Duplicate Dialog Actions', () => {
    it('should allow user to cancel and keep form open', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          projectTasks={mockProjectTasks}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)

      // Enter a similar title
      await user.type(titleInput, 'Design UI components')
      await user.tab()

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText('Possible Duplicate Task')).toBeInTheDocument()
      }, { timeout: 1000 })

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Dialog should close but form remains
      await waitFor(() => {
        expect(screen.queryByText('Possible Duplicate Task')).not.toBeInTheDocument()
      })

      // Form should still be visible
      expect(screen.getByLabelText(/task title/i)).toBeInTheDocument()
    })

    it('should allow user to create anyway and submit form', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'task-new', title: 'Design UI components' })
      })

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          projectTasks={mockProjectTasks}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)

      // Enter a similar title
      await user.type(titleInput, 'Design UI components')
      await user.tab()

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText('Possible Duplicate Task')).toBeInTheDocument()
      }, { timeout: 1000 })

      // Click create anyway
      const createButton = screen.getByRole('button', { name: /create anyway/i })
      await user.click(createButton)

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Possible Duplicate Task')).not.toBeInTheDocument()
      })

      // Now submit the form
      const submitButton = screen.getByRole('button', { name: /create task/i })
      expect(submitButton).not.toBeDisabled()

      await user.click(submitButton)

      // Should call API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/tasks',
          expect.objectContaining({
            method: 'POST',
          })
        )
      })
    })
  })

  describe('Project-Scoped Detection', () => {
    it('should only check duplicates within selected project', async () => {
      const user = userEvent.setup()

      const multiProjectTasks: Task[] = [
        {
          id: 'task-1',
          title: 'Design UI components',
          project_id: 'project-1',
        },
        {
          id: 'task-2',
          title: 'Design UI components',
          project_id: 'project-2',
        },
      ]

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-2"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          projectTasks={multiProjectTasks}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)

      // Enter the same title
      await user.type(titleInput, 'Design UI components')
      await user.tab()

      // Should show dialog because there's a match in project-2
      await waitFor(() => {
        expect(screen.getByText('Possible Duplicate Task')).toBeInTheDocument()
      }, { timeout: 1000 })
    })
  })

  describe('Integration with Form Submission', () => {
    it('should prevent duplicate submission flow when dialog is open', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          projectTasks={mockProjectTasks}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)

      // Enter a similar title
      await user.type(titleInput, 'Design UI components')
      await user.tab()

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText('Possible Duplicate Task')).toBeInTheDocument()
      }, { timeout: 1000 })

      // Submit button should still be disabled (dialog open)
      const submitButton = screen.getByRole('button', { name: /create task/i })
      expect(submitButton).toBeDisabled()
    })
  })
})
