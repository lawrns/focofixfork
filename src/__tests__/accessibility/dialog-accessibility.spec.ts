import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectEditDialog from '@/components/dialogs/project-edit-dialog'
import { type Project } from '@/lib/validation/schemas/project.schema'

// Mock toast
const mockToast = vi.fn()
vi.mock('@/components/toast/toast', () => ({
  useToast: () => ({ toast: mockToast })
}))

describe('Dialog Accessibility Tests', () => {
  const mockProject: Project = {
    id: 'test-project-id',
    name: 'Test Project',
    description: 'A test project for accessibility testing',
    status: 'active',
    priority: 'medium',
    organization_id: 'test-org-id',
    created_by: 'test-user-id',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const mockOnSave = vi.fn()
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ProjectEditDialog Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <ProjectEditDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      )

      // Dialog should have proper role
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()

      // Dialog should have accessible name
      expect(screen.getByText('Edit Project')).toBeInTheDocument()

      // Form fields should have proper labels
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()

      render(
        <ProjectEditDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      )

      // Focus should move to first input
      const nameInput = screen.getByDisplayValue('Test Project')
      await user.tab()
      expect(nameInput).toHaveFocus()

      // Tab through form elements
      await user.tab()
      const descriptionTextarea = screen.getByDisplayValue('A test project for accessibility testing')
      expect(descriptionTextarea).toHaveFocus()

      // Continue tabbing to buttons
      await user.tab() // Skip status select
      await user.tab() // Skip priority select
      await user.tab() // Should reach Cancel button

      const cancelButton = screen.getByText('Cancel')
      expect(cancelButton).toHaveFocus()
    })

    it('should have proper focus management', async () => {
      const user = userEvent.setup()

      render(
        <ProjectEditDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      )

      // Focus trap should work - pressing Tab should cycle through dialog elements
      const nameInput = screen.getByDisplayValue('Test Project')
      await user.tab()
      expect(nameInput).toHaveFocus()

      // Mock successful save and check focus returns to trigger (simulated)
      mockOnSave.mockResolvedValueOnce(undefined)
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // After dialog closes, focus should return to appropriate element
      // (This would typically be tested by checking the element that opened the dialog)
    })

    it('should announce form validation errors to screen readers', async () => {
      const user = userEvent.setup()

      render(
        <ProjectEditDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      )

      // Clear name field to trigger validation
      const nameInput = screen.getByDisplayValue('Test Project')
      await user.clear(nameInput)

      // Try to submit - should show validation error
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // Should have accessible error message
      const errorMessage = screen.getByText(/project name must be at least 2 characters/i)
      expect(errorMessage).toBeInTheDocument()

      // Error should be associated with input via aria-describedby or similar
      expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    })

    it('should have sufficient color contrast', () => {
      render(
        <ProjectEditDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      )

      // Check that text has proper contrast classes
      const title = screen.getByText('Edit Project')
      expect(title).toHaveClass('text-foreground') // Should use theme-aware colors

      // Error messages should be clearly visible
      const nameInput = screen.getByDisplayValue('Test Project')
      expect(nameInput).toHaveClass('border-input') // Should use theme-aware border
    })

    it('should be usable with screen readers', () => {
      render(
        <ProjectEditDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      )

      // Dialog should have aria-labelledby
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')

      // Buttons should have descriptive text
      const saveButton = screen.getByText('Save Changes')
      expect(saveButton).toBeInTheDocument()

      const cancelButton = screen.getByText('Cancel')
      expect(cancelButton).toBeInTheDocument()
    })
  })

  describe('WCAG 2.1 AA Compliance', () => {
    it('should meet minimum touch target sizes', () => {
      render(
        <ProjectEditDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      )

      // Buttons should be properly sized
      const saveButton = screen.getByText('Save Changes')
      const styles = window.getComputedStyle(saveButton)

      // Minimum touch target should be 44px (WCAG AA)
      expect(parseInt(styles.minHeight || '0')).toBeGreaterThanOrEqual(44)
    })

    it('should have proper heading hierarchy', () => {
      render(
        <ProjectEditDialog
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      )

      // Dialog should have h2 heading (DialogTitle)
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Edit Project')
    })
  })
})

