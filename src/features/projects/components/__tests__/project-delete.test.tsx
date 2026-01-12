'use client'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ProjectTable from '../ProjectTable'
import * as AuthModule from '@/lib/hooks/use-auth'
import * as ProjectStoreModule from '@/lib/stores/project-store'

// Mock dependencies
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}))

vi.mock('@/lib/hooks/useRealtime', () => ({
  useRealtime: vi.fn(),
}))

vi.mock('@/lib/hooks/useOrganization', () => ({
  useOrganization: vi.fn(() => ({
    organization: { id: 'org-1', name: 'Test Org' },
  })),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

vi.mock('@/lib/services/filtering', () => ({
  FilteringService: {
    filterAndSort: vi.fn((items) => ({
      items,
    })),
  },
  FilterCondition: {},
  SortCondition: {},
}))

vi.mock('@/features/projects/services/projectClientService', () => ({
  ProjectClientService: {
    bulkOperation: vi.fn().mockResolvedValue({
      success: true,
      data: {
        successful: [],
        failed: [],
      },
    }),
  },
}))

vi.mock('@/lib/hooks/use-inline-edit', () => ({
  useInlineEdit: vi.fn(() => ({
    value: 'Test Project',
    isEditing: false,
    inputRef: { current: null },
    startEditing: vi.fn(),
    handleChange: vi.fn(),
    handleKeyDown: vi.fn(),
    handleBlur: vi.fn(),
  })),
}))

vi.mock('@/components/toast/toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
  toast: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  Archive: () => <span>Archive</span>,
  Trash2: () => <span>Trash</span>,
  Users: () => <span>Users</span>,
  ArrowUpDown: () => <span>ArrowUpDown</span>,
  ArrowUp: () => <span>ArrowUp</span>,
  ArrowDown: () => <span>ArrowDown</span>,
  X: () => <span>X</span>,
}))

const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'Test Description',
  status: 'active' as const,
  priority: 'high' as const,
  progress_percentage: 50,
  due_date: '2024-12-31',
  created_at: '2024-01-01T00:00:00Z',
  organization_id: 'org-1',
}

describe('ProjectTable Delete Functionality', () => {
  let mockProjectStore: any
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockProjectStore = {
      subscribe: vi.fn((callback) => {
        callback([mockProject])
        return vi.fn()
      }),
      getProjects: vi.fn(() => [mockProject]),
      refreshProjects: vi.fn().mockResolvedValue(undefined),
      setProjects: vi.fn(),
      addProject: vi.fn(),
      updateProject: vi.fn(),
      removeProject: vi.fn(),
      startOperation: vi.fn(),
      endOperation: vi.fn(),
      isOperationInProgress: vi.fn(() => false),
    }

    vi.mocked(ProjectStoreModule.projectStore as any).subscribe =
      mockProjectStore.subscribe
    vi.mocked(ProjectStoreModule.projectStore as any).getProjects =
      mockProjectStore.getProjects
    vi.mocked(ProjectStoreModule.projectStore as any).refreshProjects =
      mockProjectStore.refreshProjects
    vi.mocked(ProjectStoreModule.projectStore as any).setProjects =
      mockProjectStore.setProjects
    vi.mocked(ProjectStoreModule.projectStore as any).removeProject =
      mockProjectStore.removeProject
    vi.mocked(ProjectStoreModule.projectStore as any).startOperation =
      mockProjectStore.startOperation
    vi.mocked(ProjectStoreModule.projectStore as any).endOperation =
      mockProjectStore.endOperation
    vi.mocked(ProjectStoreModule.projectStore as any).isOperationInProgress =
      mockProjectStore.isOperationInProgress

    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    })

    global.fetch = mockFetch as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Delete Button Accessibility', () => {
    it('should render delete button in project actions', async () => {
      render(<ProjectTable />)

      // Wait for table to load
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      // Find and click the quick actions button
      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })
      expect(quickActionsButton).toBeInTheDocument()

      const user = userEvent.setup()
      await user.click(quickActionsButton)

      // Delete option should be visible
      const deleteOption = screen.queryByRole('menuitem', {
        name: /delete/i,
      })
      expect(deleteOption).toBeInTheDocument()
    })

    it('should have proper aria labels for delete button', async () => {
      render(<ProjectTable />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })

      const user = userEvent.setup()
      await user.click(quickActionsButton)

      const deleteOption = screen.queryByRole('menuitem', {
        name: /delete/i,
      })
      expect(deleteOption).toHaveAttribute('role', 'menuitem')
    })
  })

  describe('Delete Confirmation Dialog', () => {
    it('should open delete confirmation dialog when delete is clicked', async () => {
      render(<ProjectTable />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Open quick actions menu
      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(quickActionsButton)

      // Click delete option
      const deleteOption = screen.getByRole('menuitem', {
        name: /delete/i,
      })
      await user.click(deleteOption)

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/delete project/i)).toBeInTheDocument()
      })
    })

    it('should display project details in confirmation dialog', async () => {
      render(<ProjectTable />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Open quick actions menu
      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(quickActionsButton)

      // Click delete option
      const deleteOption = screen.getByRole('menuitem', {
        name: /delete/i,
      })
      await user.click(deleteOption)

      // Dialog should show project name
      await waitFor(() => {
        expect(
          screen.getByText(`Project: ${mockProject.name}`)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Cancel Delete', () => {
    it('should close dialog when cancel is clicked', async () => {
      render(<ProjectTable />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Open quick actions menu
      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(quickActionsButton)

      // Click delete option
      const deleteOption = screen.getByRole('menuitem', {
        name: /delete/i,
      })
      await user.click(deleteOption)

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText(/delete project/i)).toBeInTheDocument()
      })

      // Click cancel
      const cancelButton = screen.getByRole('button', {
        name: /cancel/i,
      })
      await user.click(cancelButton)

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText(/this action cannot be undone/i)).not.toBeInTheDocument()
      })
    })

    it('should not delete project when cancel is clicked', async () => {
      render(<ProjectTable />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Open quick actions menu
      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(quickActionsButton)

      // Click delete option
      const deleteOption = screen.getByRole('menuitem', {
        name: /delete/i,
      })
      await user.click(deleteOption)

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText(/delete project/i)).toBeInTheDocument()
      })

      // Click cancel
      const cancelButton = screen.getByRole('button', {
        name: /cancel/i,
      })
      await user.click(cancelButton)

      // API should not be called
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/project-1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('should preserve project in list when cancel is clicked', async () => {
      render(<ProjectTable />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Open quick actions menu
      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(quickActionsButton)

      // Click delete option
      const deleteOption = screen.getByRole('menuitem', {
        name: /delete/i,
      })
      await user.click(deleteOption)

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText(/delete project/i)).toBeInTheDocument()
      })

      // Click cancel
      const cancelButton = screen.getByRole('button', {
        name: /cancel/i,
      })
      await user.click(cancelButton)

      // Project should still be visible
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })
    })
  })

  describe('Confirm Delete', () => {
    it('should call API with DELETE method when confirm is clicked', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })

      render(<ProjectTable />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Open quick actions menu
      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(quickActionsButton)

      // Click delete option
      const deleteOption = screen.getByRole('menuitem', {
        name: /delete/i,
      })
      await user.click(deleteOption)

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText(/delete project/i)).toBeInTheDocument()
      })

      // Click confirm delete
      const confirmButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(confirmButton)

      // API should be called with DELETE
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/projects/project-1'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })

    it('should remove project from store on successful deletion', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })

      render(<ProjectTable />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Open quick actions menu
      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(quickActionsButton)

      // Click delete option
      const deleteOption = screen.getByRole('menuitem', {
        name: /delete/i,
      })
      await user.click(deleteOption)

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText(/delete project/i)).toBeInTheDocument()
      })

      // Click confirm delete
      const confirmButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(confirmButton)

      // Project should be removed from store
      await waitFor(() => {
        expect(mockProjectStore.removeProject).toHaveBeenCalledWith('project-1')
      })
    })

    it('should close dialog after successful deletion', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })

      render(<ProjectTable />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Open quick actions menu
      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(quickActionsButton)

      // Click delete option
      const deleteOption = screen.getByRole('menuitem', {
        name: /delete/i,
      })
      await user.click(deleteOption)

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText(/delete project/i)).toBeInTheDocument()
      })

      // Click confirm delete
      const confirmButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(confirmButton)

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText(/this action cannot be undone/i)).not.toBeInTheDocument()
      })
    })

    it('should handle 404 error gracefully when project already deleted', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Project not found' }),
      })

      render(<ProjectTable />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Open quick actions menu
      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(quickActionsButton)

      // Click delete option
      const deleteOption = screen.getByRole('menuitem', {
        name: /delete/i,
      })
      await user.click(deleteOption)

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText(/delete project/i)).toBeInTheDocument()
      })

      // Click confirm delete
      const confirmButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(confirmButton)

      // Should still remove from store even with 404
      await waitFor(() => {
        expect(mockProjectStore.removeProject).toHaveBeenCalledWith('project-1')
      })
    })
  })

  describe('Delete Error Handling', () => {
    it('should show error message on deletion failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })

      const mockToast = vi.fn()
      vi.mocked(ToastModule.useToast as any).mockReturnValue({
        toast: mockToast,
      })

      render(<ProjectTable />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Open quick actions menu
      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(quickActionsButton)

      // Click delete option
      const deleteOption = screen.getByRole('menuitem', {
        name: /delete/i,
      })
      await user.click(deleteOption)

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText(/delete project/i)).toBeInTheDocument()
      })

      // Click confirm delete
      const confirmButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(confirmButton)

      // Dialog should remain open on error
      await waitFor(() => {
        expect(screen.getByText(/delete project/i)).toBeInTheDocument()
      })
    })

    it('should not remove project on deletion failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })

      render(<ProjectTable />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Open quick actions menu
      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(quickActionsButton)

      // Click delete option
      const deleteOption = screen.getByRole('menuitem', {
        name: /delete/i,
      })
      await user.click(deleteOption)

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText(/delete project/i)).toBeInTheDocument()
      })

      // Click confirm delete
      const confirmButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(confirmButton)

      // removeProject should not be called
      expect(mockProjectStore.removeProject).not.toHaveBeenCalled()
    })
  })

  describe('Optimistic UI', () => {
    it('should track operation state during deletion', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })

      render(<ProjectTable />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Open quick actions menu
      const quickActionsButton = screen.getByRole('button', {
        name: /open menu/i,
      })
      await user.click(quickActionsButton)

      // Click delete option
      const deleteOption = screen.getByRole('menuitem', {
        name: /delete/i,
      })
      await user.click(deleteOption)

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText(/delete project/i)).toBeInTheDocument()
      })

      // Click confirm delete
      const confirmButton = screen.getByRole('button', {
        name: /delete project/i,
      })
      await user.click(confirmButton)

      // Should start operation tracking
      await waitFor(() => {
        expect(mockProjectStore.startOperation).toHaveBeenCalledWith('project-1')
      })
    })
  })
})

// Import ToastModule for typing
import * as ToastModule from '@/components/toast/toast'
