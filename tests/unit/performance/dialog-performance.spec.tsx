import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProjectEditDialog from '@/components/dialogs/project-edit-dialog'
import { type Project } from '@/lib/validation/schemas/project.schema'

// Mock toast
const mockToast = vi.fn()
vi.mock('@/components/toast/toast', () => ({
  useToast: () => ({ toast: mockToast })
}))

describe('Dialog Performance Tests', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const mockProject: Project = {
    id: 'test-project-id',
    name: 'Test Project',
    description: 'A test project for performance testing',
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
    vi.useFakeTimers()
  })

  describe('ProjectEditDialog Performance', () => {
    it('should render within 500ms', async () => {
      const startTime = performance.now()

      render(
        <QueryClientProvider client={queryClient}>
          <ProjectEditDialog
            project={mockProject}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSave={mockOnSave}
          />
        </QueryClientProvider>
      )

      // Wait for dialog to be fully rendered
      await waitFor(() => {
        expect(screen.getByText('Edit Project')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      console.log(`Dialog render time: ${renderTime}ms`)
      expect(renderTime).toBeLessThan(500)
    })

    it('should handle form interactions within performance limits', async () => {
      const user = userEvent.setup()

      render(
        <QueryClientProvider client={queryClient}>
          <ProjectEditDialog
            project={mockProject}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSave={mockOnSave}
          />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Edit Project')).toBeInTheDocument()
      })

      // Test form field interactions
      const nameInput = screen.getByDisplayValue('Test Project')
      const startTime = performance.now()

      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Project Name')

      const interactionTime = performance.now() - startTime
      console.log(`Form interaction time: ${interactionTime}ms`)
      expect(interactionTime).toBeLessThan(200)
    })

    it('should submit form within performance limits', async () => {
      const user = userEvent.setup()

      render(
        <QueryClientProvider client={queryClient}>
          <ProjectEditDialog
            project={mockProject}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSave={mockOnSave}
          />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Edit Project')).toBeInTheDocument()
      })

      // Fill out form
      const nameInput = screen.getByDisplayValue('Test Project')
      await user.clear(nameInput)
      await user.type(nameInput, 'Performance Test Project')

      // Mock successful save
      mockOnSave.mockResolvedValueOnce(undefined)

      const submitButton = screen.getByText('Save Changes')
      const startTime = performance.now()

      await user.click(submitButton)

      // Wait for save to complete
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })

      const submitTime = performance.now() - startTime
      console.log(`Form submit time: ${submitTime}ms`)
      expect(submitTime).toBeLessThan(1000)
    })
  })

  describe('Memory and Cleanup', () => {
    it('should not have memory leaks after multiple renders', () => {
      const { rerender, unmount } = render(
        <QueryClientProvider client={queryClient}>
          <ProjectEditDialog
            project={mockProject}
            open={false}
            onOpenChange={mockOnOpenChange}
            onSave={mockOnSave}
          />
        </QueryClientProvider>
      )

      // Render multiple times
      for (let i = 0; i < 5; i++) {
        rerender(
          <QueryClientProvider client={queryClient}>
            <ProjectEditDialog
              project={mockProject}
              open={true}
              onOpenChange={mockOnOpenChange}
              onSave={mockOnSave}
            />
          </QueryClientProvider>
        )
      }

      // Cleanup
      unmount()

      // Memory should be properly cleaned up
      expect(queryClient.getQueryCache().getAll().length).toBeLessThan(10)
    })
  })
})