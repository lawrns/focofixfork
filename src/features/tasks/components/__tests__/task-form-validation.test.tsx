import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskForm } from '../task-form'

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

// Mock fetch globally
global.fetch = vi.fn()

describe('TaskForm - Title Validation', () => {
  const mockProjects = [
    { id: 'project-1', name: 'Test Project' },
    { id: 'project-2', name: 'Another Project' }
  ]

  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockClear()
  })

  describe('Submit Button Disabled State', () => {
    it('should disable submit button when title is empty', async () => {
      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const submitButton = screen.getByRole('button', { name: /create task/i })

      // With project selected but no title, button should be disabled
      expect(submitButton).toBeDisabled()
    })

    it('should disable submit button when title is only whitespace', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)
      const submitButton = screen.getByRole('button', { name: /create task/i })

      // Type only spaces
      await user.type(titleInput, '   ')

      // Button should remain disabled
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('should enable submit button when title has content', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)
      const submitButton = screen.getByRole('button', { name: /create task/i })

      // Type a valid title
      await user.type(titleInput, 'Valid Task Title')

      // Button should be enabled
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('should disable submit button when title is cleared after being filled', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)
      const submitButton = screen.getByRole('button', { name: /create task/i })

      // Type a valid title
      await user.type(titleInput, 'Valid Task Title')

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })

      // Clear the title
      await user.clear(titleInput)

      // Button should be disabled again
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })
  })

  describe('Validation Error Display', () => {
    it('should show validation error on blur when title is empty', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)

      // Focus and blur without entering text
      await user.click(titleInput)
      await user.tab()

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/task title is required/i)).toBeInTheDocument()
      })
    })

    it('should show validation error when whitespace-only title loses focus', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)

      // Type only spaces
      await user.type(titleInput, '   ')
      await user.tab()

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/task title is required/i)).toBeInTheDocument()
      })
    })

    it('should clear validation error when valid title is entered', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)

      // Focus and blur to trigger error
      await user.click(titleInput)
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/task title is required/i)).toBeInTheDocument()
      })

      // Enter valid title
      await user.type(titleInput, 'Valid Task Title')
      await user.tab()

      // Error should be gone
      await waitFor(() => {
        expect(screen.queryByText(/task title is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Visual Feedback', () => {
    it('should have aria-invalid attribute when title has error', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)

      // Focus and blur to trigger error
      await user.click(titleInput)
      await user.tab()

      // Should have aria-invalid
      await waitFor(() => {
        expect(titleInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('should have aria-describedby pointing to error message', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)

      // Focus and blur to trigger error
      await user.click(titleInput)
      await user.tab()

      // Should have aria-describedby
      await waitFor(() => {
        const ariaDescribedBy = titleInput.getAttribute('aria-describedby')
        expect(ariaDescribedBy).toBeTruthy()

        // Error message should have matching id
        const errorMessage = screen.getByText(/task title is required/i)
        expect(errorMessage).toHaveAttribute('id', ariaDescribedBy)
      })
    })
  })

  describe('Form Submission Prevention', () => {
    it('should not call API when submitting with empty title', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const submitButton = screen.getByRole('button', { name: /create task/i })

      // Try to submit (button should be disabled, but let's ensure no API call happens)
      expect(submitButton).toBeDisabled()

      // Verify fetch was never called
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should not call API when submitting with whitespace-only title', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)
      const submitButton = screen.getByRole('button', { name: /create task/i })

      // Type only spaces
      await user.type(titleInput, '   ')

      // Button should be disabled
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      // Verify fetch was never called
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should call API when submitting with valid title', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'task-1', title: 'Valid Task Title' })
      })

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)
      const submitButton = screen.getByRole('button', { name: /create task/i })

      // Type valid title
      await user.type(titleInput, 'Valid Task Title')

      // Button should be enabled
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })

      // Click submit
      await user.click(submitButton)

      // Should call API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/tasks',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Valid Task Title')
          })
        )
      })

      // Should call onSuccess
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Project and Title Combined Validation', () => {
    it('should require both project and title for submission', async () => {
      const user = userEvent.setup()

      render(
        <TaskForm
          projects={mockProjects}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)
      const submitButton = screen.getByRole('button', { name: /create task/i })

      // Initially disabled (no project, no title)
      expect(submitButton).toBeDisabled()

      // Add title but no project - still disabled
      await user.type(titleInput, 'Valid Task Title')

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('should enable submit only when both project and title are valid', async () => {
      const user = userEvent.setup()

      // Start with a default project to simplify the test
      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i)
      const submitButton = screen.getByRole('button', { name: /create task/i })

      // With project selected but no title, button should be disabled
      expect(submitButton).toBeDisabled()

      // Add title
      await user.type(titleInput, 'Valid Task Title')

      // Now should be enabled
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })
  })
})
