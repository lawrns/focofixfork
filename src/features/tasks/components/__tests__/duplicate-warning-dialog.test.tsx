import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DuplicateWarningDialog } from '../duplicate-warning-dialog'
import type { DuplicateMatch } from '../../utils/duplicate-detection'

// Mock lucide-react
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return {
    ...actual,
    AlertTriangle: () => <div data-testid="alert-icon">Alert</div>,
  }
})

describe('DuplicateWarningDialog', () => {
  const mockDuplicates: DuplicateMatch[] = [
    {
      task: {
        id: 'existing-task-1',
        title: 'Design UI components',
        project_id: 'project-1',
      },
      similarity: 0.95,
    },
    {
      task: {
        id: 'existing-task-2',
        title: 'Design UI',
        project_id: 'project-1',
      },
      similarity: 0.85,
    },
  ]

  const mockOnCreateAnyway = vi.fn()
  const mockOnCancel = vi.fn()
  const mockOnViewExisting = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Visibility', () => {
    it('should not render when dialog is closed', () => {
      const { container } = render(
        <DuplicateWarningDialog
          isOpen={false}
          title="Design UI components"
          duplicates={mockDuplicates}
          onCreateAnyway={mockOnCreateAnyway}
          onCancel={mockOnCancel}
        />
      )

      // The alert dialog content should not be visible
      expect(container.textContent).not.toContain('Possible Duplicate Task')
    })

    it('should render when dialog is open', () => {
      render(
        <DuplicateWarningDialog
          isOpen={true}
          title="Design UI components"
          duplicates={mockDuplicates}
          onCreateAnyway={mockOnCreateAnyway}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Possible Duplicate Task')).toBeInTheDocument()
    })

    it('should not render when duplicates array is empty', () => {
      const { container } = render(
        <DuplicateWarningDialog
          isOpen={true}
          title="Design UI components"
          duplicates={[]}
          onCreateAnyway={mockOnCreateAnyway}
          onCancel={mockOnCancel}
        />
      )

      expect(container.textContent).not.toContain('Possible Duplicate Task')
    })
  })

  describe('Duplicate Display', () => {
    it('should display all similar tasks with their titles', () => {
      render(
        <DuplicateWarningDialog
          isOpen={true}
          title="Design UI components"
          duplicates={mockDuplicates}
          onCreateAnyway={mockOnCreateAnyway}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Design UI components')).toBeInTheDocument()
      expect(screen.getByText('Design UI')).toBeInTheDocument()
    })

    it('should display similarity scores as percentages', () => {
      render(
        <DuplicateWarningDialog
          isOpen={true}
          title="Design UI components"
          duplicates={mockDuplicates}
          onCreateAnyway={mockOnCreateAnyway}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('95% match')).toBeInTheDocument()
      expect(screen.getByText('85% match')).toBeInTheDocument()
    })

    it('should display similarity scores rounded correctly', () => {
      const duplicatesWithDecimal: DuplicateMatch[] = [
        {
          task: {
            id: 'task-1',
            title: 'Test task',
            project_id: 'project-1',
          },
          similarity: 0.945, // Should round to 95%
        },
      ]

      render(
        <DuplicateWarningDialog
          isOpen={true}
          title="Test task"
          duplicates={duplicatesWithDecimal}
          onCreateAnyway={mockOnCreateAnyway}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('95% match')).toBeInTheDocument()
    })

    it('should indicate project-scoped checking in description', () => {
      render(
        <DuplicateWarningDialog
          isOpen={true}
          title="Design UI components"
          duplicates={mockDuplicates}
          onCreateAnyway={mockOnCreateAnyway}
          onCancel={mockOnCancel}
        />
      )

      expect(
        screen.getByText(/specific to your current project/i)
      ).toBeInTheDocument()
    })
  })

  describe('Button Interactions', () => {
    it('should call onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <DuplicateWarningDialog
          isOpen={true}
          title="Design UI components"
          duplicates={mockDuplicates}
          onCreateAnyway={mockOnCreateAnyway}
          onCancel={mockOnCancel}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should call onCreateAnyway when Create Anyway button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <DuplicateWarningDialog
          isOpen={true}
          title="Design UI components"
          duplicates={mockDuplicates}
          onCreateAnyway={mockOnCreateAnyway}
          onCancel={mockOnCancel}
        />
      )

      const createButton = screen.getByRole('button', { name: /create anyway/i })
      await user.click(createButton)

      expect(mockOnCreateAnyway).toHaveBeenCalled()
    })

    it('should call onViewExisting when View Task button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <DuplicateWarningDialog
          isOpen={true}
          title="Design UI components"
          duplicates={mockDuplicates}
          onCreateAnyway={mockOnCreateAnyway}
          onCancel={mockOnCancel}
          onViewExisting={mockOnViewExisting}
        />
      )

      const viewButtons = screen.getAllByRole('button', { name: /view task/i })
      await user.click(viewButtons[0])

      expect(mockOnViewExisting).toHaveBeenCalledWith('existing-task-1')
    })

    it('should not render View Task buttons when onViewExisting is not provided', () => {
      render(
        <DuplicateWarningDialog
          isOpen={true}
          title="Design UI components"
          duplicates={mockDuplicates}
          onCreateAnyway={mockOnCreateAnyway}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.queryByText(/view task/i)).not.toBeInTheDocument()
    })
  })

  describe('Layout and UX', () => {
    it('should display alert icon in header', () => {
      render(
        <DuplicateWarningDialog
          isOpen={true}
          title="Design UI components"
          duplicates={mockDuplicates}
          onCreateAnyway={mockOnCreateAnyway}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
    })

    it('should handle multiple duplicates with scrollable container', () => {
      const manyDuplicates: DuplicateMatch[] = Array.from({ length: 10 }, (_, i) => ({
        task: {
          id: `task-${i}`,
          title: `Similar task ${i}`,
          project_id: 'project-1',
        },
        similarity: 0.9 - i * 0.01,
      }))

      render(
        <DuplicateWarningDialog
          isOpen={true}
          title="New task"
          duplicates={manyDuplicates}
          onCreateAnyway={mockOnCreateAnyway}
          onCancel={mockOnCancel}
        />
      )

      // All tasks should be visible in scrollable area
      for (let i = 0; i < 10; i++) {
        expect(screen.getByText(`Similar task ${i}`)).toBeInTheDocument()
      }
    })
  })
})
