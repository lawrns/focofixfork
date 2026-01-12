/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { KanbanBoard } from '../kanban-board'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'

// Mock the hooks
jest.mock('@/lib/hooks/use-auth')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('KanbanBoard Mobile Responsiveness', () => {
  const mockUser = { id: '1', email: 'test@example.com' }
  const mockRouter = { push: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { data: [] } }),
    })
  })

  describe('Mobile viewport (375px)', () => {
    beforeEach(() => {
      // Set mobile viewport
      global.innerWidth = 375
      global.innerHeight = 667
    })

    it('should render columns with responsive width classes', async () => {
      const { container } = render(<KanbanBoard />)

      // Wait for loading to complete
      await screen.findByRole('region', { name: /kanban board/i })

      // Find all column containers
      const columns = container.querySelectorAll('[class*="flex-shrink-0"]')

      // Each column should have responsive width classes
      columns.forEach((column) => {
        const classList = column.className

        // Should have mobile-friendly width (calc or full width minus padding)
        // Should NOT have fixed w-72 (288px) at mobile breakpoint
        expect(classList).toMatch(/w-\[calc\(100vw-[0-9]+rem\)\]|w-full|sm:w-72/)

        // Desktop class should still be present
        expect(classList).toContain('md:w-80')
      })
    })

    it('should allow horizontal scroll for columns container', async () => {
      const { container } = render(<KanbanBoard />)

      // Wait for loading to complete
      await screen.findByRole('region', { name: /kanban board/i })

      // Find the columns container
      const boardContainer = screen.getByRole('region', { name: /kanban board/i })

      // Container should have overflow-x-auto for horizontal scrolling
      expect(boardContainer).toHaveClass('overflow-x-auto')
    })

    it('should have proper touch scrolling support', async () => {
      const { container } = render(<KanbanBoard />)

      // Wait for loading to complete
      await screen.findByRole('region', { name: /kanban board/i })

      const boardContainer = screen.getByRole('region', { name: /kanban board/i })

      // Should have flex layout for horizontal arrangement
      expect(boardContainer).toHaveClass('flex')

      // Should have gap between columns
      expect(boardContainer.className).toMatch(/gap-[0-9]/)
    })

    it('should ensure at least one full column is visible on mobile', async () => {
      const { container } = render(<KanbanBoard />)

      // Wait for loading to complete
      await screen.findByRole('region', { name: /kanban board/i })

      // Find all column containers
      const columns = container.querySelectorAll('[class*="flex-shrink-0"]')

      columns.forEach((column) => {
        const classList = column.className

        // Mobile width should be less than or equal to viewport minus padding
        // The pattern w-[calc(100vw-3rem)] ensures full width minus 48px (3rem) padding
        // This ensures the column fits within 375px viewport
        const hasResponsiveWidth =
          classList.includes('w-[calc(100vw-3rem)]') ||
          classList.includes('w-full') ||
          classList.includes('sm:w-72')

        expect(hasResponsiveWidth).toBe(true)
      })
    })
  })

  describe('Tablet viewport (640px+)', () => {
    it('should use standard column width at tablet breakpoint', async () => {
      const { container } = render(<KanbanBoard />)

      // Wait for loading to complete
      await screen.findByRole('region', { name: /kanban board/i })

      // Find all column containers
      const columns = container.querySelectorAll('[class*="flex-shrink-0"]')

      columns.forEach((column) => {
        const classList = column.className

        // Should have sm:w-72 for tablet
        expect(classList).toMatch(/sm:w-72/)

        // Should have md:w-80 for desktop
        expect(classList).toContain('md:w-80')
      })
    })
  })

  describe('Desktop viewport (768px+)', () => {
    it('should use wider column width at desktop breakpoint', async () => {
      const { container } = render(<KanbanBoard />)

      // Wait for loading to complete
      await screen.findByRole('region', { name: /kanban board/i })

      // Find all column containers
      const columns = container.querySelectorAll('[class*="flex-shrink-0"]')

      columns.forEach((column) => {
        const classList = column.className

        // Should have md:w-80 for desktop (320px)
        expect(classList).toContain('md:w-80')
      })
    })
  })
})
