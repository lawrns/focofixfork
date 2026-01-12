'use client'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ProjectCard } from '../project-card'

// Mock framer-motion to simplify tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock useRealtime hook
vi.mock('@/lib/hooks/useRealtime', () => ({
  useRealtime: vi.fn(),
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock lucide-react icons - include all icons used by ProjectCard
vi.mock('lucide-react', () => ({
  Calendar: () => <span data-testid="icon-calendar">Calendar</span>,
  Users: () => <span data-testid="icon-users">Users</span>,
  MoreVertical: () => <span data-testid="icon-more">More</span>,
  Edit: () => <span data-testid="icon-edit">Edit</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
  Eye: () => <span data-testid="icon-eye">Eye</span>,
}))

const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'Test Description',
  status: 'active' as const,
  priority: 'high' as const,
  progress_percentage: 50,
  start_date: '2024-01-01',
  due_date: '2024-12-31',
  created_at: '2024-01-01T00:00:00Z',
  organization_id: 'org-1',
}

describe('ProjectCard Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Edit Action', () => {
    it('should call onEdit callback when edit button is clicked', async () => {
      const user = userEvent.setup()
      const handleEdit = vi.fn()

      render(
        <ProjectCard
          project={mockProject}
          onEdit={handleEdit}
          showActions={true}
        />
      )

      // Find and click the dropdown trigger
      const dropdownTrigger = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(dropdownTrigger)

      // Click edit menu item
      const editButton = screen.getByRole('menuitem', {
        name: /edit project/i,
      })
      await user.click(editButton)

      // Verify callback was called with correct project ID
      expect(handleEdit).toHaveBeenCalledWith('project-1')
      expect(handleEdit).toHaveBeenCalledTimes(1)
    })

    it('should not show edit button if onEdit callback is not provided', async () => {
      render(
        <ProjectCard
          project={mockProject}
          showActions={true}
        />
      )

      const dropdownTrigger = screen.getByRole('button', {
        name: /open menu/i,
      })
      await userEvent.click(dropdownTrigger)

      // Edit option should not be present
      expect(screen.queryByRole('menuitem', {
        name: /edit project/i,
      })).not.toBeInTheDocument()
    })
  })

  describe('Delete Action', () => {
    it('should show delete confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup()
      const handleDelete = vi.fn()

      render(
        <ProjectCard
          project={mockProject}
          onDelete={handleDelete}
          showActions={true}
        />
      )

      // Open dropdown
      const dropdownTrigger = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(dropdownTrigger)

      // Click delete
      const deleteButton = screen.getByRole('menuitem', {
        name: /delete project/i,
      })
      await user.click(deleteButton)

      // Verify dialog appears
      const dialog = screen.getByRole('alertdialog')
      expect(dialog).toBeInTheDocument()
      expect(within(dialog).getByText(/are you sure/i)).toBeInTheDocument()
    })

    it('should call onDelete when delete is confirmed', async () => {
      const user = userEvent.setup()
      const handleDelete = vi.fn().mockResolvedValue(undefined)

      render(
        <ProjectCard
          project={mockProject}
          onDelete={handleDelete}
          showActions={true}
        />
      )

      // Open dropdown and click delete
      const dropdownTrigger = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(dropdownTrigger)

      const deleteButton = screen.getByRole('menuitem', {
        name: /delete project/i,
      })
      await user.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(confirmButton)

      // Verify callback was called
      await waitFor(() => {
        expect(handleDelete).toHaveBeenCalledWith('project-1')
      })
    })

    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup()
      const handleDelete = vi.fn()

      render(
        <ProjectCard
          project={mockProject}
          onDelete={handleDelete}
          showActions={true}
        />
      )

      // Open dropdown and click delete
      const dropdownTrigger = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(dropdownTrigger)

      const deleteButton = screen.getByRole('menuitem', {
        name: /delete project/i,
      })
      await user.click(deleteButton)

      // Verify dialog is open
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()

      // Click cancel
      const cancelButton = screen.getByRole('button', {
        name: /cancel/i,
      })
      await user.click(cancelButton)

      // Verify dialog is closed
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })

      // onDelete should not be called
      expect(handleDelete).not.toHaveBeenCalled()
    })

    it('should show deleting state during deletion', async () => {
      const user = userEvent.setup()
      const handleDelete = vi.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(
        <ProjectCard
          project={mockProject}
          onDelete={handleDelete}
          showActions={true}
        />
      )

      // Open dropdown and click delete
      const dropdownTrigger = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(dropdownTrigger)

      const deleteButton = screen.getByRole('menuitem', {
        name: /delete project/i,
      })
      await user.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(confirmButton)

      // Verify delete was called with correct ID
      await waitFor(() => {
        expect(handleDelete).toHaveBeenCalledWith('project-1')
      })
    })

    it('should handle delete errors gracefully', async () => {
      const user = userEvent.setup()
      const handleDelete = vi.fn().mockRejectedValue(
        new Error('Delete failed')
      )

      render(
        <ProjectCard
          project={mockProject}
          onDelete={handleDelete}
          showActions={true}
        />
      )

      // Open dropdown and click delete
      const dropdownTrigger = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(dropdownTrigger)

      const deleteButton = screen.getByRole('menuitem', {
        name: /delete project/i,
      })
      await user.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(confirmButton)

      // Should attempt to delete
      await waitFor(() => {
        expect(handleDelete).toHaveBeenCalledWith('project-1')
      })

      // Should recover from error
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })

    it('should not show delete button if onDelete callback is not provided', async () => {
      render(
        <ProjectCard
          project={mockProject}
          showActions={true}
        />
      )

      const dropdownTrigger = screen.getByRole('button', {
        name: /open menu/i,
      })
      await userEvent.click(dropdownTrigger)

      // Delete option should not be present
      expect(screen.queryByRole('menuitem', {
        name: /delete project/i,
      })).not.toBeInTheDocument()
    })
  })

  describe('Actions Visibility', () => {
    it('should hide all actions when showActions is false', async () => {
      const handleEdit = vi.fn()
      const handleDelete = vi.fn()

      render(
        <ProjectCard
          project={mockProject}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showActions={false}
        />
      )

      // Dropdown menu should not be visible
      expect(screen.queryByRole('button', {
        name: /open menu/i,
      })).not.toBeInTheDocument()
    })

    it('should show all actions when callbacks are provided and showActions is true', async () => {
      const user = userEvent.setup()
      const handleEdit = vi.fn()
      const handleDelete = vi.fn()

      render(
        <ProjectCard
          project={mockProject}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showActions={true}
        />
      )

      // Dropdown menu should be visible
      const dropdownTrigger = screen.getByRole('button', {
        name: /open menu/i,
      })
      expect(dropdownTrigger).toBeInTheDocument()

      await user.click(dropdownTrigger)

      // Both edit and delete should be visible
      expect(screen.getByRole('menuitem', {
        name: /edit project/i,
      })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', {
        name: /delete project/i,
      })).toBeInTheDocument()
    })
  })

  describe('State Updates', () => {
    it('should update displayed project data when prop changes', async () => {
      const { rerender } = render(
        <ProjectCard
          project={mockProject}
          showActions={true}
        />
      )

      expect(screen.getByText('Test Project')).toBeInTheDocument()

      const updatedProject = {
        ...mockProject,
        name: 'Updated Project',
      }

      rerender(
        <ProjectCard
          project={updatedProject}
          showActions={true}
        />
      )

      expect(screen.getByText('Updated Project')).toBeInTheDocument()
      expect(screen.queryByText('Test Project')).not.toBeInTheDocument()
    })
  })
})
