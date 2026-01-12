'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ProjectForm } from '../project-form'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}))

// Mock useAuth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
  }),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="icon-loader">Loader</span>,
  Calendar: () => <span data-testid="icon-calendar">Calendar</span>,
  X: () => <span data-testid="icon-x">X</span>,
  Check: () => <span data-testid="icon-check">Check</span>,
  Palette: () => <span data-testid="icon-palette">Palette</span>,
}))

const mockOrganizations = [
  { id: 'org-1', name: 'Organization 1' },
  { id: 'org-2', name: 'Organization 2' },
]

const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  slug: 'test-project',
  description: 'Test Description',
  organization_id: 'org-1',
  status: 'active' as const,
  priority: 'medium' as const,
  start_date: '2024-01-01',
  due_date: '2024-12-31',
  progress_percentage: 50,
  color: '#6366F1',
}

describe('ProjectForm - Color Picker Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Color Field Display', () => {
    it('should display color picker in project form', () => {
      render(
        <ProjectForm
          organizations={mockOrganizations}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )

      expect(screen.getByText(/project color/i)).toBeInTheDocument()
    })

    it('should show color palette button in form', () => {
      render(
        <ProjectForm
          organizations={mockOrganizations}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )

      const colorPaletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      expect(colorPaletteButton).toBeInTheDocument()
    })

    it('should display current project color when editing', () => {
      render(
        <ProjectForm
          project={mockProject}
          organizations={mockOrganizations}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )

      const colorPreview = screen.getByTestId('color-preview')
      expect(colorPreview).toHaveStyle({ backgroundColor: '#6366F1' })
    })

    it('should display default indigo color when creating new project', () => {
      render(
        <ProjectForm
          organizations={mockOrganizations}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )

      const colorPreview = screen.getByTestId('color-preview')
      expect(colorPreview).toHaveStyle({ backgroundColor: '#6366F1' })
    })
  })

  describe('Color Selection in Form', () => {
    it('should allow selecting a color from palette', async () => {
      const user = userEvent.setup()

      render(
        <ProjectForm
          organizations={mockOrganizations}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )

      const paletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      await user.click(paletteButton)

      const blueColorButton = screen.getByRole('button', {
        name: /#3B82F6/i,
      })

      await user.click(blueColorButton)

      const colorPreview = screen.getByTestId('color-preview')
      expect(colorPreview).toHaveStyle({ backgroundColor: '#3B82F6' })
    })

    it('should persist color selection when switching between tabs', async () => {
      const user = userEvent.setup()

      render(
        <ProjectForm
          organizations={mockOrganizations}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      )

      const paletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      await user.click(paletteButton)

      const emeraldColorButton = screen.getByRole('button', {
        name: /#10B981/i,
      })

      await user.click(emeraldColorButton)

      // Fill in project name to trigger any state changes
      const nameInput = screen.getByLabelText(/project name/i)
      await user.type(nameInput, 'My Project')

      // Color should still be emerald
      const colorPreview = screen.getByTestId('color-preview')
      expect(colorPreview).toHaveStyle({ backgroundColor: '#10B981' })
    })

    it('should include color in form submission data', async () => {
      const user = userEvent.setup()
      const handleSuccess = vi.fn()

      // Mock fetch for form submission
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      render(
        <ProjectForm
          organizations={mockOrganizations}
          onSuccess={handleSuccess}
          onCancel={vi.fn()}
        />
      )

      // Fill in required fields
      const nameInput = screen.getByLabelText(/project name/i)
      await user.type(nameInput, 'New Project')

      const slugInput = screen.getByLabelText(/^slug/i)
      await user.type(slugInput, 'new-project')

      // Select color
      const paletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      await user.click(paletteButton)

      const redColorButton = screen.getByRole('button', {
        name: /#EF4444/i,
      })

      await user.click(redColorButton)

      // Submit form
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })

      await user.click(submitButton)

      // Wait for fetch call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      // Verify color was included in submission
      const fetchCall = (global.fetch as any).mock.calls[0]
      const payload = JSON.parse(fetchCall[1].body)
      expect(payload.color).toBe('#EF4444')
    })
  })

  describe('Color Persistence', () => {
    it('should maintain color value when editing project', async () => {
      const user = userEvent.setup()
      const handleSuccess = vi.fn()

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      render(
        <ProjectForm
          project={mockProject}
          organizations={mockOrganizations}
          onSuccess={handleSuccess}
          onCancel={vi.fn()}
        />
      )

      // Verify current color is displayed
      const colorPreview = screen.getByTestId('color-preview')
      expect(colorPreview).toHaveStyle({ backgroundColor: '#6366F1' })

      // Change color
      const paletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      await user.click(paletteButton)

      const violetColorButton = screen.getByRole('button', {
        name: /#8B5CF6/i,
      })

      await user.click(violetColorButton)

      // Verify new color is displayed
      expect(colorPreview).toHaveStyle({ backgroundColor: '#8B5CF6' })

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /update project/i,
      })

      await user.click(submitButton)

      // Verify color was sent in update
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
        const fetchCall = (global.fetch as any).mock.calls[0]
        const payload = JSON.parse(fetchCall[1].body)
        expect(payload.color).toBe('#8B5CF6')
      })
    })
  })

  describe('Form Validation', () => {
    it('should not require color field for form submission', async () => {
      const user = userEvent.setup()
      const handleSuccess = vi.fn()

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      render(
        <ProjectForm
          organizations={mockOrganizations}
          onSuccess={handleSuccess}
          onCancel={vi.fn()}
        />
      )

      const nameInput = screen.getByLabelText(/project name/i)
      await user.type(nameInput, 'New Project')

      const slugInput = screen.getByLabelText(/^slug/i)
      await user.type(slugInput, 'new-project')

      // Don't select color - use default
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })

      await user.click(submitButton)

      // Should submit successfully with default color
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
        const fetchCall = (global.fetch as any).mock.calls[0]
        const payload = JSON.parse(fetchCall[1].body)
        expect(payload.color).toBe('#6366F1') // default indigo
      })
    })
  })
})
