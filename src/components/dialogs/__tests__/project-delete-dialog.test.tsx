'use client'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ProjectDeleteDialog from '../project-delete-dialog'
import * as ToastModule from '@/components/toast/toast'

// Mock the toast hook
vi.mock('@/components/toast/toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="icon-alert">Alert</span>,
  Loader2: () => <span data-testid="icon-loader">Loader</span>,
}))

const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'Test Description',
  status: 'active' as const,
  priority: 'high' as const,
  created_at: '2024-01-01T00:00:00Z',
}

describe('ProjectDeleteDialog', () => {
  let mockToast: ReturnType<typeof vi.fn>
  let mockOnDelete: ReturnType<typeof vi.fn>
  let mockOnOpenChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockToast = vi.fn()
    mockOnDelete = vi.fn().mockResolvedValue(undefined)
    mockOnOpenChange = vi.fn()

    vi.mocked(ToastModule.useToast).mockReturnValue({
      toast: mockToast,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Dialog Visibility', () => {
    it('should not render when open is false', () => {
      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={false}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      // Dialog content should not be visible
      expect(screen.queryByText(/delete project/i)).not.toBeInTheDocument()
    })

    it('should not render when project is null', () => {
      render(
        <ProjectDeleteDialog
          project={null}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      // Dialog content should not be visible
      expect(screen.queryByText(/delete project/i)).not.toBeInTheDocument()
    })

    it('should render when open is true and project is provided', () => {
      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      // Dialog should be visible with correct title
      expect(screen.getByText(/delete project/i)).toBeInTheDocument()
    })
  })

  describe('Dialog Content', () => {
    it('should display project name in warning section', () => {
      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      expect(screen.getByText(`Project: ${mockProject.name}`)).toBeInTheDocument()
    })

    it('should display project description if available', () => {
      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      expect(screen.getByText(mockProject.description)).toBeInTheDocument()
    })

    it('should display warning message about permanent deletion', () => {
      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument()
      expect(screen.getByText(/permanently delete the project/i)).toBeInTheDocument()
    })

    it('should display alert icon', () => {
      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      expect(screen.getByTestId('icon-alert')).toBeInTheDocument()
    })
  })

  describe('Cancel Button', () => {
    it('should have a cancel button', () => {
      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('should call onOpenChange(false) when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should not call onDelete when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnDelete).not.toHaveBeenCalled()
    })

    it('should be disabled while deleting', async () => {
      mockOnDelete.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      const user = userEvent.setup()
      await user.click(deleteButton)

      // Cancel button should be disabled while deleting
      await waitFor(() => {
        expect(cancelButton).toBeDisabled()
      })
    })
  })

  describe('Delete Button', () => {
    it('should have a delete button', () => {
      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      expect(deleteButton).toBeInTheDocument()
    })

    it('should call onDelete with project id when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(deleteButton)

      expect(mockOnDelete).toHaveBeenCalledWith(mockProject.id)
    })

    it('should show loading state while deleting', async () => {
      mockOnDelete.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /delete project/i,
      })

      const user = userEvent.setup()
      await user.click(deleteButton)

      // Loader icon should be visible
      await waitFor(() => {
        expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
      })
    })

    it('should be disabled while deleting', async () => {
      mockOnDelete.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /delete project/i,
      })

      const user = userEvent.setup()
      await user.click(deleteButton)

      // Delete button should be disabled while deleting
      await waitFor(() => {
        expect(deleteButton).toBeDisabled()
      })
    })
  })

  describe('Success Flow', () => {
    it('should call onOpenChange(false) on successful deletion', async () => {
      const user = userEvent.setup()
      mockOnDelete.mockResolvedValue(undefined)

      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(deleteButton)

      // Wait for async operations
      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should show success toast on successful deletion', async () => {
      const user = userEvent.setup()
      mockOnDelete.mockResolvedValue(undefined)

      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Project deleted successfully',
        })
      })
    })
  })

  describe('Error Flow', () => {
    it('should show error toast on deletion failure', async () => {
      const user = userEvent.setup()
      mockOnDelete.mockRejectedValue(new Error('Delete failed'))

      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to delete project. Please try again.',
          variant: 'destructive',
        })
      })
    })

    it('should not close dialog on deletion failure', async () => {
      const user = userEvent.setup()
      mockOnDelete.mockRejectedValue(new Error('Delete failed'))

      render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(deleteButton)

      await waitFor(() => {
        // onOpenChange should not be called with false
        expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
      })
    })

    it('should allow retry after deletion failure', async () => {
      const user = userEvent.setup()
      let callCount = 0

      mockOnDelete.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('First attempt failed')
        }
        return undefined
      })

      const { rerender } = render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      // First attempt (fails)
      let deleteButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
          })
        )
      })

      // Reset toast mock and rerender
      mockToast.mockClear()
      mockOnOpenChange.mockClear()

      rerender(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      // Second attempt (succeeds)
      deleteButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Dialog State Management', () => {
    it('should reset loading state after deletion attempt', async () => {
      const user = userEvent.setup()
      mockOnDelete.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50))
      )

      const { rerender } = render(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(deleteButton)

      // Wait for deletion to complete
      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalled()
      }, { timeout: 200 })

      // Reopen dialog and verify delete button is clickable again
      mockOnOpenChange.mockClear()
      mockOnDelete.mockClear()
      mockOnDelete.mockResolvedValue(undefined)

      rerender(
        <ProjectDeleteDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      )

      const newDeleteButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      expect(newDeleteButton).not.toBeDisabled()
    })
  })
})
