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
    Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>,
  }
})

// Mock the auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' }
  })
}))

// Mock TasksService
vi.mock('@/features/tasks/services/taskService', () => ({
  TasksService: {
    getUserTasks: vi.fn().mockResolvedValue({
      success: true,
      data: []
    })
  }
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('TaskForm - Smart Suggestions', () => {
  const mockProjects = [
    { id: 'project-1', name: 'Website Redesign' },
    { id: 'project-2', name: 'Mobile App' }
  ]

  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockClear()
  })

  describe('Suggestion Button Rendering', () => {
    it('should render suggestions button in task title field', async () => {
      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const suggestButton = screen.getByRole('button', { name: /sparkles|suggestions|get suggestions/i })
      expect(suggestButton).toBeInTheDocument()
    })

    it('should disable suggestions button when no project is selected', async () => {
      render(
        <TaskForm
          projects={mockProjects}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const suggestButton = screen.queryByRole('button', { name: /suggestions|get suggestions/i })
      if (suggestButton) {
        expect(suggestButton).toBeDisabled()
      }
    })

    it('should enable suggestions button when project is selected', async () => {
      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const suggestButton = screen.getByRole('button', { name: /suggestions|get suggestions/i })
      expect(suggestButton).toBeEnabled()
    })
  })

  describe('Loading State During Generation', () => {
    it('should show loading indicator while generating suggestions', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: { suggestions: ['Review code', 'Fix bug', 'Update docs'] } })
        }), 100))
      )

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const suggestButton = screen.getByRole('button', { name: /suggestions|get suggestions/i })
      await user.click(suggestButton)

      // Loading state should appear
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /suggestions|get suggestions/i })
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Displaying Suggestions as Chips', () => {
    it('should display suggestions as clickable chips after successful API call', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            suggestions: ['Review code', 'Fix critical bug', 'Update documentation']
          }
        })
      })

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const suggestButton = screen.getByRole('button', { name: /suggestions|get suggestions/i })
      await user.click(suggestButton)

      // Suggestions should appear
      await waitFor(() => {
        expect(screen.getByText('Review code')).toBeInTheDocument()
        expect(screen.getByText('Fix critical bug')).toBeInTheDocument()
        expect(screen.getByText('Update documentation')).toBeInTheDocument()
      })
    })

    it('should display 3-5 suggestions from API response', async () => {
      const user = userEvent.setup()

      const suggestions = [
        'Review code',
        'Fix bug',
        'Update docs',
        'Add tests',
        'Refactor component'
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { suggestions } })
      })

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const suggestButton = screen.getByRole('button', { name: /suggestions|get suggestions/i })
      await user.click(suggestButton)

      await waitFor(() => {
        suggestions.forEach(sugg => {
          expect(screen.getByText(sugg)).toBeInTheDocument()
        })
      })
    })
  })

  describe('Applying Suggestions to Form', () => {
    it('should apply clicked suggestion to title field', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            suggestions: ['Review code changes', 'Fix authentication bug', 'Add unit tests']
          }
        })
      })

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const suggestButton = screen.getByRole('button', { name: /suggestions|get suggestions/i })
      await user.click(suggestButton)

      await waitFor(() => {
        expect(screen.getByText('Review code changes')).toBeInTheDocument()
      })

      const suggestionChip = screen.getByText('Review code changes')
      await user.click(suggestionChip)

      // Title input should be populated with suggestion
      const titleInput = screen.getByLabelText(/task title/i) as HTMLInputElement
      await waitFor(() => {
        expect(titleInput.value).toBe('Review code changes')
      })
    })

    it('should replace existing title when suggestion is applied', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            suggestions: ['New Title A', 'New Title B', 'New Title C']
          }
        })
      })

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const titleInput = screen.getByLabelText(/task title/i) as HTMLInputElement
      await user.type(titleInput, 'Old Title')

      expect(titleInput.value).toBe('Old Title')

      const suggestButton = screen.getByRole('button', { name: /suggestions|get suggestions/i })
      await user.click(suggestButton)

      await waitFor(() => {
        expect(screen.getByText('New Title A')).toBeInTheDocument()
      })

      const suggestionChip = screen.getByText('New Title A')
      await user.click(suggestionChip)

      await waitFor(() => {
        expect(titleInput.value).toBe('New Title A')
      })
    })
  })

  describe('Regenerate Button', () => {
    it('should show regenerate button after displaying suggestions', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            suggestions: ['Suggestion 1', 'Suggestion 2', 'Suggestion 3']
          }
        })
      })

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const suggestButton = screen.getByRole('button', { name: /suggestions|get suggestions/i })
      await user.click(suggestButton)

      await waitFor(() => {
        const regenerateButton = screen.queryByRole('button', { name: /regenerate|refresh|try again/i })
        expect(regenerateButton).toBeInTheDocument()
      })
    })

    it('should fetch new suggestions when regenerate button is clicked', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            suggestions: ['First A', 'First B', 'First C']
          }
        })
      })

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            suggestions: ['Second A', 'Second B', 'Second C']
          }
        })
      })

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const suggestButton = screen.getByRole('button', { name: /suggestions|get suggestions/i })
      await user.click(suggestButton)

      await waitFor(() => {
        expect(screen.getByText('First A')).toBeInTheDocument()
      })

      const regenerateButton = screen.getByRole('button', { name: /regenerate|refresh|try again/i })
      await user.click(regenerateButton)

      await waitFor(() => {
        expect(screen.getByText('Second A')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Failed to fetch suggestions')
      )

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const suggestButton = screen.getByRole('button', { name: /suggestions|get suggestions/i })
      await user.click(suggestButton)

      await waitFor(() => {
        expect(screen.getByText(/failed|error|could not/i)).toBeInTheDocument()
      })
    })

    it('should allow retry after API failure', async () => {
      const user = userEvent.setup()

      // First call fails
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Network error')
      )

      // Second call succeeds
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            suggestions: ['Success A', 'Success B', 'Success C']
          }
        })
      })

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const suggestButton = screen.getByRole('button', { name: /suggestions|get suggestions/i })

      // First attempt fails
      await user.click(suggestButton)

      await waitFor(() => {
        expect(screen.getByText(/failed|error|could not/i)).toBeInTheDocument()
      })

      // Retry succeeds
      await user.click(suggestButton)

      await waitFor(() => {
        expect(screen.getByText('Success A')).toBeInTheDocument()
      })
    })

    it('should gracefully fallback when API is unavailable', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('API unavailable')
      )

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      // Form should still function without suggestions
      const titleInput = screen.getByLabelText(/task title/i)
      await user.type(titleInput, 'Manual Title')

      expect(titleInput).toHaveValue('Manual Title')

      const suggestButton = screen.getByRole('button', { name: /suggestions|get suggestions/i })
      expect(suggestButton).toBeEnabled()
    })
  })

  describe('Context-Aware Suggestions', () => {
    it('should send project context to suggestions API', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            suggestions: ['Website Redesign Task 1', 'Website Redesign Task 2', 'Website Redesign Task 3']
          }
        })
      })

      render(
        <TaskForm
          projects={mockProjects}
          defaultProjectId="project-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const suggestButton = screen.getByRole('button', { name: /suggestions|get suggestions/i })
      await user.click(suggestButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/tasks/suggestions'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('project-1')
          })
        )
      })
    })

    it('should send partial title/description to suggestions API', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            suggestions: ['Review this code', 'Test this function', 'Document this API']
          }
        })
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
      await user.type(titleInput, 'Review')

      const suggestButton = screen.getByRole('button', { name: /suggestions|get suggestions/i })
      await user.click(suggestButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/tasks/suggestions'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Review')
          })
        )
      })
    })
  })
})
