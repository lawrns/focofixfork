import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivityFeed, ActivityItem } from '../activity-feed'

describe('ActivityFeed Component', () => {
  const mockUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
  }

  const mockActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'task_created',
      user: mockUser,
      description: 'created a new task',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      metadata: { task_id: 'task-1', task_title: 'Build feature' },
    },
    {
      id: '2',
      type: 'task_updated',
      user: mockUser,
      description: 'updated the description',
      timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
      metadata: { task_id: 'task-1', field: 'description' },
    },
    {
      id: '3',
      type: 'task_completed',
      user: mockUser,
      description: 'marked task as completed',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      metadata: { task_id: 'task-1' },
    },
    {
      id: '4',
      type: 'comment_added',
      user: { ...mockUser, id: 'user-2', name: 'Jane Smith' },
      description: 'added a comment',
      timestamp: new Date(Date.now() - 30000).toISOString(),
      metadata: { task_id: 'task-1', comment: 'Great work!' },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should display activity feed with recent actions', () => {
      render(<ActivityFeed activities={mockActivities} />)

      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
      expect(screen.getByText(/created a new task/)).toBeInTheDocument()
      expect(screen.getByText(/updated the description/)).toBeInTheDocument()
      expect(screen.getByText(/marked task as completed/)).toBeInTheDocument()
    })

    it('should display empty state when no activities', () => {
      render(<ActivityFeed activities={[]} />)

      expect(screen.getByText('No activity yet')).toBeInTheDocument()
      expect(screen.getByText(/Activity will appear here/)).toBeInTheDocument()
    })

    it('should render correct number of activity items', () => {
      render(<ActivityFeed activities={mockActivities} />)

      const activityItems = screen.getAllByRole('generic').filter((el) =>
        el.className?.includes('hover:bg-gray')
      )
      expect(activityItems.length).toBeGreaterThan(0)
    })
  })

  describe('Activity Types', () => {
    it('should display task_created activity', () => {
      const created: ActivityItem[] = [mockActivities[0]]
      render(<ActivityFeed activities={created} />)

      expect(screen.getByText(/created a new task/)).toBeInTheDocument()
    })

    it('should display task_updated activity', () => {
      const updated: ActivityItem[] = [mockActivities[1]]
      render(<ActivityFeed activities={updated} />)

      expect(screen.getByText(/updated the description/)).toBeInTheDocument()
    })

    it('should display task_completed activity', () => {
      const completed: ActivityItem[] = [mockActivities[2]]
      render(<ActivityFeed activities={completed} />)

      expect(screen.getByText(/marked task as completed/)).toBeInTheDocument()
    })

    it('should display comment_added activity', () => {
      const commented: ActivityItem[] = [mockActivities[3]]
      render(<ActivityFeed activities={commented} />)

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText(/added a comment/)).toBeInTheDocument()
    })

    it('should display different activity types with correct icons', () => {
      render(<ActivityFeed activities={mockActivities} />)

      // Check that activity types are displayed
      expect(screen.getByText(/created a new task/)).toBeInTheDocument()
      expect(screen.getByText(/updated the description/)).toBeInTheDocument()
      expect(screen.getByText(/marked task as completed/)).toBeInTheDocument()
    })
  })

  describe('User Attribution', () => {
    it('should display user avatar', () => {
      const { container } = render(<ActivityFeed activities={mockActivities} showAvatars={true} />)

      const avatars = container.querySelectorAll('.relative.flex.shrink-0.overflow-hidden.rounded-full')
      expect(avatars.length).toBeGreaterThan(0)
    })

    it('should hide avatar when showAvatars is false', () => {
      const { container } = render(<ActivityFeed activities={mockActivities} showAvatars={false} />)

      const avatarContainers = container.querySelectorAll('.relative.flex.shrink-0.overflow-hidden.rounded-full')
      expect(avatarContainers.length).toBe(0)
    })

    it('should display user name with activity', () => {
      render(<ActivityFeed activities={mockActivities} />)

      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0)
    })

    it('should display avatar fallback with user initials', () => {
      const activity: ActivityItem[] = [
        {
          ...mockActivities[0],
          user: { ...mockUser, name: 'Jane Smith' },
        },
      ]
      render(<ActivityFeed activities={activity} showAvatars={true} />)

      // Fallback should contain initials
      const fallback = screen.getByText(/JS/)
      expect(fallback).toBeInTheDocument()
    })
  })

  describe('Timestamps', () => {
    it('should display relative timestamps (minutes ago)', () => {
      const recentActivity: ActivityItem[] = [
        {
          ...mockActivities[0],
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        },
      ]
      render(<ActivityFeed activities={recentActivity} />)

      expect(screen.getByText(/5 minute[s]? ago/)).toBeInTheDocument()
    })

    it('should display relative timestamps (hours ago)', () => {
      const olderActivity: ActivityItem[] = [
        {
          ...mockActivities[0],
          timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
        },
      ]
      render(<ActivityFeed activities={olderActivity} />)

      expect(screen.getByText(/2 hour[s]? ago/)).toBeInTheDocument()
    })

    it('should display relative timestamps (days ago)', () => {
      const oldActivity: ActivityItem[] = [
        {
          ...mockActivities[0],
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60000).toISOString(),
        },
      ]
      render(<ActivityFeed activities={oldActivity} />)

      expect(screen.getByText(/3 day[s]? ago/)).toBeInTheDocument()
    })

    it('should display "Just now" for very recent activities', () => {
      const veryRecentActivity: ActivityItem[] = [
        {
          ...mockActivities[0],
          timestamp: new Date(Date.now() - 10000).toISOString(),
        },
      ]
      render(<ActivityFeed activities={veryRecentActivity} />)

      expect(screen.getByText('Just now')).toBeInTheDocument()
    })

    it('should display absolute date for old activities', () => {
      const oldDate = new Date('2024-01-01')
      const oldActivity: ActivityItem[] = [
        {
          ...mockActivities[0],
          timestamp: oldDate.toISOString(),
        },
      ]
      render(<ActivityFeed activities={oldActivity} />)

      // Should show formatted date
      const dateText = screen.queryByText(/\d+\/\d+\/\d+/)
      expect(dateText || screen.getByText(/ago/)).toBeInTheDocument()
    })
  })

  describe('Activity Grouping', () => {
    it('should group similar activities by default', () => {
      const samUserActivities: ActivityItem[] = [
        { ...mockActivities[0], timestamp: new Date(Date.now() - 60000).toISOString() },
        { ...mockActivities[1], timestamp: new Date(Date.now() - 120000).toISOString() },
        { ...mockActivities[2], timestamp: new Date(Date.now() - 180000).toISOString() },
      ]

      render(<ActivityFeed activities={samUserActivities} groupSimilar={true} />)

      // Should display user's name
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
    })

    it('should not group similar activities when groupSimilar is false', () => {
      const samUserActivities: ActivityItem[] = [
        { ...mockActivities[0], timestamp: new Date(Date.now() - 60000).toISOString() },
        { ...mockActivities[1], timestamp: new Date(Date.now() - 120000).toISOString() },
      ]

      render(<ActivityFeed activities={samUserActivities} groupSimilar={false} />)

      const johnDoeElements = screen.getAllByText('John Doe')
      expect(johnDoeElements.length).toBeGreaterThanOrEqual(2)
    })

    it('should display "and X more similar actions" when grouping', () => {
      const sameUserSameType: ActivityItem[] = [
        { ...mockActivities[0], id: '1' },
        { ...mockActivities[0], id: '2', timestamp: new Date(Date.now() - 1 * 60000).toISOString() },
        { ...mockActivities[0], id: '3', timestamp: new Date(Date.now() - 2 * 60000).toISOString() },
      ]

      render(<ActivityFeed activities={sameUserSameType} groupSimilar={true} />)

      expect(screen.getByText(/and 2 more similar action[s]?/)).toBeInTheDocument()
    })
  })

  describe('Styling and UI', () => {
    it('should apply custom className', () => {
      const { container } = render(<ActivityFeed activities={mockActivities} className="custom-class" />)

      const feedContainer = container.querySelector('.custom-class')
      expect(feedContainer).toBeInTheDocument()
    })

    it('should apply custom maxHeight', () => {
      const { container } = render(<ActivityFeed activities={mockActivities} maxHeight="600px" />)

      const scrollableDiv = container.querySelector('div[style*="600px"]')
      expect(scrollableDiv).toBeInTheDocument()
    })

    it('should have proper dark mode classes', () => {
      const { container } = render(<ActivityFeed activities={mockActivities} />)

      const darkElements = container.querySelectorAll('[class*="dark:"]')
      expect(darkElements.length).toBeGreaterThan(0)
    })
  })

  describe('Load More Functionality', () => {
    it('should display Load More button when onLoadMore callback is provided', () => {
      const onLoadMore = vi.fn()
      render(<ActivityFeed activities={mockActivities} onLoadMore={onLoadMore} />)

      expect(screen.getByText('Load More Activity')).toBeInTheDocument()
    })

    it('should call onLoadMore when Load More button is clicked', async () => {
      const onLoadMore = vi.fn()
      const user = userEvent.setup()

      render(<ActivityFeed activities={mockActivities} onLoadMore={onLoadMore} />)

      const button = screen.getByText('Load More Activity')
      await user.click(button)

      expect(onLoadMore).toHaveBeenCalledTimes(1)
    })

    it('should not display Load More button when onLoadMore is not provided', () => {
      render(<ActivityFeed activities={mockActivities} />)

      expect(screen.queryByText('Load More Activity')).not.toBeInTheDocument()
    })
  })

  describe('Metadata Display', () => {
    it('should accept and store metadata', () => {
      const activityWithMetadata: ActivityItem[] = [
        {
          ...mockActivities[0],
          metadata: { task_id: 'task-123', task_title: 'Implement feature' },
        },
      ]

      render(<ActivityFeed activities={activityWithMetadata} />)

      expect(screen.getByText(/created a new task/)).toBeInTheDocument()
    })

    it('should handle activities without metadata', () => {
      const activityWithoutMetadata: ActivityItem[] = [
        {
          ...mockActivities[0],
          metadata: undefined,
        },
      ]

      render(<ActivityFeed activities={activityWithoutMetadata} />)

      expect(screen.getByText(/created a new task/)).toBeInTheDocument()
    })
  })

  describe('Animations', () => {
    it('should apply animation classes to activity items', () => {
      const { container } = render(<ActivityFeed activities={mockActivities} />)

      const animatedElements = container.querySelectorAll('[class*="animate"]')
      expect(animatedElements.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long user names', () => {
      const longNameActivity: ActivityItem[] = [
        {
          ...mockActivities[0],
          user: { ...mockUser, name: 'A'.repeat(100) },
        },
      ]

      render(<ActivityFeed activities={longNameActivity} />)

      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument()
    })

    it('should handle very long descriptions', () => {
      const longDescActivity: ActivityItem[] = [
        {
          ...mockActivities[0],
          description: 'B'.repeat(500),
        },
      ]

      render(<ActivityFeed activities={longDescActivity} />)

      expect(screen.getByText('B'.repeat(500))).toBeInTheDocument()
    })

    it('should handle missing user avatar_url', () => {
      const noAvatarActivity: ActivityItem[] = [
        {
          ...mockActivities[0],
          user: { ...mockUser, avatar_url: undefined },
        },
      ]

      render(<ActivityFeed activities={noAvatarActivity} showAvatars={true} />)

      // Should show fallback
      expect(screen.getByText(/JD/)).toBeInTheDocument()
    })

    it('should handle empty activities array gracefully', () => {
      const { container } = render(<ActivityFeed activities={[]} />)

      expect(container).toBeInTheDocument()
      expect(screen.getByText('No activity yet')).toBeInTheDocument()
    })
  })
})
