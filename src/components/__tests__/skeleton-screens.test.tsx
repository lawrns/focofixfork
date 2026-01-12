import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  ProjectListSkeleton,
  TaskCardSkeleton,
  TaskListSkeleton,
  DashboardSkeleton,
  DashboardWidgetSkeleton,
} from '@/components/skeleton-screens'

describe('Skeleton Screens - Content-Aware Loading States', () => {
  describe('ProjectListSkeleton', () => {
    it('should render correct number of skeleton project cards', () => {
      const { container } = render(<ProjectListSkeleton itemCount={3} />)
      const projectCards = container.querySelectorAll('[data-testid="project-card-skeleton"]')
      expect(projectCards).toHaveLength(3)
    })

    it('should render with default item count of 5', () => {
      const { container } = render(<ProjectListSkeleton />)
      const projectCards = container.querySelectorAll('[data-testid="project-card-skeleton"]')
      expect(projectCards).toHaveLength(5)
    })

    it('should have pulse animation class on all skeletons', () => {
      const { container } = render(<ProjectListSkeleton itemCount={2} />)
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should match project card layout structure', () => {
      const { container } = render(<ProjectListSkeleton itemCount={1} />)
      const projectCard = container.querySelector('[data-testid="project-card-skeleton"]')

      // Should contain title skeleton
      expect(projectCard?.querySelector('[data-testid="project-title-skeleton"]')).toBeTruthy()

      // Should contain description skeleton
      expect(projectCard?.querySelector('[data-testid="project-desc-skeleton"]')).toBeTruthy()

      // Should contain progress bar skeleton
      expect(projectCard?.querySelector('[data-testid="project-progress-skeleton"]')).toBeTruthy()

      // Should contain metadata skeletons
      expect(projectCard?.querySelector('[data-testid="project-meta-skeleton"]')).toBeTruthy()
    })

    it('should have proper spacing between skeleton items', () => {
      const { container } = render(<ProjectListSkeleton itemCount={2} />)
      const wrapper = container.querySelector('[data-testid="project-list-skeleton-wrapper"]')
      expect(wrapper?.className).toContain('space-y-')
    })
  })

  describe('TaskCardSkeleton', () => {
    it('should render task card skeleton with proper structure', () => {
      const { container } = render(<TaskCardSkeleton />)
      const card = container.querySelector('[data-testid="task-card-skeleton"]')
      expect(card).toBeTruthy()
    })

    it('should match actual task card layout', () => {
      const { container } = render(<TaskCardSkeleton />)
      const card = container.querySelector('[data-testid="task-card-skeleton"]')

      // Should have checkbox placeholder
      expect(card?.querySelector('[data-testid="task-checkbox-skeleton"]')).toBeTruthy()

      // Should have title skeleton
      expect(card?.querySelector('[data-testid="task-title-skeleton"]')).toBeTruthy()

      // Should have priority indicator skeleton
      expect(card?.querySelector('[data-testid="task-priority-skeleton"]')).toBeTruthy()

      // Should have due date skeleton
      expect(card?.querySelector('[data-testid="task-due-date-skeleton"]')).toBeTruthy()

      // Should have assignee skeleton
      expect(card?.querySelector('[data-testid="task-assignee-skeleton"]')).toBeTruthy()
    })

    it('should have pulse animation on task skeleton', () => {
      const { container } = render(<TaskCardSkeleton />)
      const card = container.querySelector('[data-testid="task-card-skeleton"]')
      const animatedElements = card?.querySelectorAll('.animate-pulse')
      expect(animatedElements?.length).toBeGreaterThan(0)
    })

    it('should have proper flex layout for task elements', () => {
      const { container } = render(<TaskCardSkeleton />)
      const card = container.querySelector('[data-testid="task-card-skeleton"]')
      expect(card?.className).toContain('flex')
    })
  })

  describe('TaskListSkeleton', () => {
    it('should render correct number of task skeleton items', () => {
      const { container } = render(<TaskListSkeleton itemCount={4} />)
      const taskSkeletons = container.querySelectorAll('[data-testid="task-card-skeleton"]')
      expect(taskSkeletons).toHaveLength(4)
    })

    it('should render with default item count of 5', () => {
      const { container } = render(<TaskListSkeleton />)
      const taskSkeletons = container.querySelectorAll('[data-testid="task-card-skeleton"]')
      expect(taskSkeletons).toHaveLength(5)
    })

    it('should have proper spacing between task items', () => {
      const { container } = render(<TaskListSkeleton itemCount={2} />)
      const wrapper = container.querySelector('[data-testid="task-list-skeleton-wrapper"]')
      expect(wrapper?.className).toContain('space-y-')
    })

    it('should maintain list structure without layout shift', () => {
      const { container } = render(<TaskListSkeleton itemCount={3} />)
      const wrapper = container.querySelector('[data-testid="task-list-skeleton-wrapper"]')

      // Should be a list container
      expect(wrapper).toBeTruthy()
      expect(wrapper?.className).toContain('space-y-')
    })
  })

  describe('DashboardWidgetSkeleton', () => {
    it('should render dashboard widget skeleton', () => {
      const { container } = render(<DashboardWidgetSkeleton />)
      const widget = container.querySelector('[data-testid="dashboard-widget-skeleton"]')
      expect(widget).toBeTruthy()
    })

    it('should match widget layout with title and content', () => {
      const { container } = render(<DashboardWidgetSkeleton />)
      const widget = container.querySelector('[data-testid="dashboard-widget-skeleton"]')

      // Should have widget title skeleton
      expect(widget?.querySelector('[data-testid="widget-title-skeleton"]')).toBeTruthy()

      // Should have widget content skeleton
      expect(widget?.querySelector('[data-testid="widget-content-skeleton"]')).toBeTruthy()
    })

    it('should have card styling with border', () => {
      const { container } = render(<DashboardWidgetSkeleton />)
      const widget = container.querySelector('[data-testid="dashboard-widget-skeleton"]')
      expect(widget?.className).toContain('rounded-lg')
      expect(widget?.className).toContain('border')
    })

    it('should have pulse animation on widget elements', () => {
      const { container } = render(<DashboardWidgetSkeleton />)
      const widget = container.querySelector('[data-testid="dashboard-widget-skeleton"]')
      const animatedElements = widget?.querySelectorAll('.animate-pulse')
      expect(animatedElements?.length).toBeGreaterThan(0)
    })
  })

  describe('DashboardSkeleton', () => {
    it('should render complete dashboard skeleton layout', () => {
      const { container } = render(<DashboardSkeleton />)
      const dashboard = container.querySelector('[data-testid="dashboard-skeleton"]')
      expect(dashboard).toBeTruthy()
    })

    it('should render header skeleton section', () => {
      const { container } = render(<DashboardSkeleton />)
      const header = container.querySelector('[data-testid="dashboard-header-skeleton"]')
      expect(header).toBeTruthy()
    })

    it('should render stats cards skeletons', () => {
      const { container } = render(<DashboardSkeleton />)
      const statCards = container.querySelectorAll('[data-testid="dashboard-stat-card-skeleton"]')
      expect(statCards.length).toBeGreaterThan(0)
    })

    it('should render content sections with proper structure', () => {
      const { container } = render(<DashboardSkeleton />)
      const mainContent = container.querySelector('[data-testid="dashboard-main-content-skeleton"]')
      expect(mainContent).toBeTruthy()
    })

    it('should have proper spacing and grid layout', () => {
      const { container } = render(<DashboardSkeleton />)
      const dashboard = container.querySelector('[data-testid="dashboard-skeleton"]')
      expect(dashboard?.className).toContain('space-y-')
    })

    it('should render all skeletons with pulse animation', () => {
      const { container } = render(<DashboardSkeleton />)
      const animatedElements = container.querySelectorAll('.animate-pulse')
      expect(animatedElements.length).toBeGreaterThan(10)
    })
  })

  describe('Skeleton Animation', () => {
    it('should have consistent pulse animation across all skeleton types', () => {
      const { container: projectContainer } = render(<ProjectListSkeleton itemCount={1} />)
      const { container: taskContainer } = render(<TaskListSkeleton itemCount={1} />)
      const { container: dashContainer } = render(<DashboardSkeleton />)

      const projectAnimated = projectContainer.querySelector('.animate-pulse')
      const taskAnimated = taskContainer.querySelector('.animate-pulse')
      const dashAnimated = dashContainer.querySelector('.animate-pulse')

      // All should have animate-pulse class
      expect(projectAnimated?.className).toContain('animate-pulse')
      expect(taskAnimated?.className).toContain('animate-pulse')
      expect(dashAnimated?.className).toContain('animate-pulse')
    })

    it('should use muted background color for skeleton elements', () => {
      const { container } = render(<TaskCardSkeleton />)
      const skeletons = container.querySelectorAll('[data-testid*="skeleton"]')

      let hasMutedBg = false
      skeletons.forEach(skeleton => {
        if (skeleton.className.includes('bg-muted') || skeleton.className.includes('bg-gray')) {
          hasMutedBg = true
        }
      })

      expect(hasMutedBg).toBe(true)
    })
  })

  describe('Layout Shift Prevention', () => {
    it('should maintain consistent dimensions between skeleton and real content', () => {
      const { container: skeletonContainer } = render(<TaskCardSkeleton />)
      const skeleton = skeletonContainer.querySelector('[data-testid="task-card-skeleton"]')

      // Skeleton should have defined height to prevent shift
      expect(skeleton?.className).toMatch(/h-|p-/)
    })

    it('should have proper padding for content spacing', () => {
      const { container } = render(<ProjectListSkeleton itemCount={1} />)
      const card = container.querySelector('[data-testid="project-card-skeleton"]')
      expect(card?.className).toMatch(/p-\d+/)
    })

    it('should use consistent spacing units across all skeletons', () => {
      const { container: projectContainer } = render(<ProjectListSkeleton itemCount={1} />)
      const { container: taskContainer } = render(<TaskListSkeleton itemCount={1} />)

      const projectSpacing = projectContainer.querySelector('[data-testid="project-list-skeleton-wrapper"]')?.className
      const taskSpacing = taskContainer.querySelector('[data-testid="task-list-skeleton-wrapper"]')?.className

      expect(projectSpacing).toContain('space-y-')
      expect(taskSpacing).toContain('space-y-')
    })
  })
})
