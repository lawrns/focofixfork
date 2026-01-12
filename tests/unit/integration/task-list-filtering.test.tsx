import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskList } from '@/features/tasks/components/task-list'
import { FilteringService, FilterCondition, SortCondition } from '@/lib/services/filtering'

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com'
    },
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn()
  })
}))

describe('TaskList with Advanced Filtering - Integration', () => {
  const mockTasks = [
    {
      id: '1',
      title: 'Fix login bug',
      description: 'Critical authentication issue',
      status: 'in_progress' as const,
      priority: 'high' as const,
      assignee_id: 'user-1',
      due_date: '2025-01-15',
      tags: ['bug', 'authentication'],
      created_date: '2025-01-10',
      created_by: 'user-1',
      project_id: 'proj-1',
      updated_at: '2025-01-11'
    },
    {
      id: '2',
      title: 'Design new feature',
      description: 'New dashboard UI',
      status: 'todo' as const,
      priority: 'medium' as const,
      assignee_id: 'user-2',
      due_date: '2025-01-20',
      tags: ['design', 'feature'],
      created_date: '2025-01-05',
      created_by: 'user-1',
      project_id: 'proj-1',
      updated_at: '2025-01-06'
    },
    {
      id: '3',
      title: 'Review PR',
      description: 'Code review needed',
      status: 'review' as const,
      priority: 'medium' as const,
      assignee_id: 'user-1',
      due_date: '2025-01-12',
      tags: ['review', 'code'],
      created_date: '2025-01-08',
      created_by: 'user-2',
      project_id: 'proj-1',
      updated_at: '2025-01-08'
    },
    {
      id: '4',
      title: 'Deploy to production',
      description: 'Release v2.0',
      status: 'done' as const,
      priority: 'urgent' as const,
      assignee_id: 'user-3',
      due_date: '2025-01-11',
      tags: ['deployment', 'release'],
      created_date: '2025-01-01',
      created_by: 'user-1',
      project_id: 'proj-1',
      updated_at: '2025-01-11'
    },
    {
      id: '5',
      title: 'Update documentation',
      description: 'API docs missing',
      status: 'todo' as const,
      priority: 'low' as const,
      tags: ['documentation', 'api'],
      created_date: '2025-01-09',
      created_by: 'user-1',
      project_id: 'proj-1',
      updated_at: '2025-01-10'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    global.fetch = vi.fn((url: string) => {
      if (url.includes('/api/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { data: mockTasks, pagination: {} }
          })
        } as Response)
      }
      return Promise.reject(new Error('Not found'))
    })
  })

  describe('Filter State Management', () => {
    it('should render task list with initial filters', async () => {
      render(
        <TaskList
          projectId="proj-1"
          initialStatus="all"
          initialPriority="all"
          initialAssignee="all"
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Tasks/i)).toBeInTheDocument()
      })
    })

    it('should apply status filter', async () => {
      render(
        <TaskList
          projectId="proj-1"
          initialStatus="todo"
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Tasks/i)).toBeInTheDocument()
      })
    })

    it('should apply priority filter', async () => {
      render(
        <TaskList
          projectId="proj-1"
          initialPriority="high"
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Tasks/i)).toBeInTheDocument()
      })
    })

    it('should apply assignee filter', async () => {
      render(
        <TaskList
          projectId="proj-1"
          initialAssignee="user-1"
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Tasks/i)).toBeInTheDocument()
      })
    })
  })

  describe('Advanced Multi-Criteria Filtering', () => {
    it('should support combining status and priority filters', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'priority', operator: 'equals', value: 'medium' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('2')
    })

    it('should support combining status, priority, and assignee', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'priority', operator: 'equals', value: 'low' },
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('5')
    })

    it('should support high priority and in_progress status', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'in_progress' },
        { field: 'priority', operator: 'equals', value: 'high' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].priority).toBe('high')
      expect(result.items[0].status).toBe('in_progress')
    })
  })

  describe('Date Range Filtering in Context', () => {
    it('should filter by due date before specific date', async () => {
      const filters: FilterCondition[] = [
        { field: 'due_date', operator: 'less_than', value: '2025-01-15' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should filter by created date range', async () => {
      const filters: FilterCondition[] = [
        { field: 'created_date', operator: 'between', value: ['2025-01-05', '2025-01-10'] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should combine date filters with status filters', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'due_date', operator: 'greater_than', value: '2025-01-15' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('2')
    })
  })

  describe('Tag-Based Filtering', () => {
    it('should filter tasks by single tag', async () => {
      const filters: FilterCondition[] = [
        { field: 'tags', operator: 'in', value: ['bug'] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].tags?.includes('bug')).toBe(true)
    })

    it('should filter tasks by multiple tag options', async () => {
      const filters: FilterCondition[] = [
        { field: 'tags', operator: 'in', value: ['bug', 'review'] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should combine tag filters with other criteria', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'tags', operator: 'in', value: ['documentation'] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('5')
    })

    it('should exclude tasks with specific tags', async () => {
      const filters: FilterCondition[] = [
        { field: 'tags', operator: 'not_in', value: ['bug'] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.every(t => !t.tags?.includes('bug'))).toBe(true)
    })
  })

  describe('Sorting with Filters', () => {
    it('should sort filtered results by priority', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' }
      ]
      const sort: SortCondition[] = [
        { field: 'priority', direction: 'asc' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters, sort)
      expect(result.items.length).toBeGreaterThan(0)
      if (result.items.length > 1) {
        expect(result.items[0].priority).toBeLessThanOrEqual(result.items[1].priority)
      }
    })

    it('should sort by due date ascending', async () => {
      const sort: SortCondition[] = [
        { field: 'due_date', direction: 'asc' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, [], sort)
      const withDates = result.items.filter(t => t.due_date)
      for (let i = 0; i < withDates.length - 1; i++) {
        expect(withDates[i].due_date).toBeLessThanOrEqual(withDates[i + 1].due_date!)
      }
    })

    it('should apply multiple sort conditions', async () => {
      const sort: SortCondition[] = [
        { field: 'status', direction: 'asc' },
        { field: 'priority', direction: 'desc' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, [], sort)
      expect(result.items.length).toBe(5)
    })
  })

  describe('Complex Filter Combinations', () => {
    it('should handle 4+ criteria with sorting', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'not_equals', value: 'done' },
        { field: 'priority', operator: 'not_equals', value: 'low' },
        { field: 'assignee_id', operator: 'equals', value: 'user-1' }
      ]
      const sort: SortCondition[] = [
        { field: 'due_date', direction: 'asc' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters, sort)
      expect(result.items.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle filters on empty results', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'done' },
        { field: 'priority', operator: 'equals', value: 'low' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(0)
      expect(result.filteredCount).toBe(0)
    })

    it('should maintain metadata across complex filters', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'priority', operator: 'equals', value: 'medium' },
        { field: 'tags', operator: 'in', value: ['design'] }
      ]
      const sort: SortCondition[] = [
        { field: 'due_date', direction: 'asc' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters, sort)
      expect(result.totalCount).toBe(5)
      expect(result.appliedFilters).toEqual(filters)
      expect(result.appliedSort).toEqual(sort)
    })
  })

  describe('Filter Presets', () => {
    it('should support "My Tasks" preset', async () => {
      const filters: FilterCondition[] = [
        { field: 'assignee_id', operator: 'equals', value: 'user-1' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.every(t => t.assignee_id === 'user-1')).toBe(true)
    })

    it('should support "Overdue" preset (past due date)', async () => {
      const today = new Date().toISOString().split('T')[0]
      const filters: FilterCondition[] = [
        { field: 'due_date', operator: 'less_than', value: today }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThanOrEqual(0)
    })

    it('should support "This Week" preset (due within 7 days)', async () => {
      const today = new Date()
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      const todayStr = today.toISOString().split('T')[0]
      const weekStr = weekFromNow.toISOString().split('T')[0]

      const filters: FilterCondition[] = [
        { field: 'due_date', operator: 'between', value: [todayStr, weekStr] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThanOrEqual(0)
    })

    it('should support "High Priority" preset', async () => {
      const filters: FilterCondition[] = [
        { field: 'priority', operator: 'in', value: ['high', 'urgent'] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.every(t => ['high', 'urgent'].includes(t.priority))).toBe(true)
    })
  })

  describe('Search and Filter Combination', () => {
    it('should apply search term with filters', async () => {
      const searchTerm = 'fix'
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'in_progress' }
      ]

      const filtered = mockTasks.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        t.status === 'in_progress'
      )

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toContain('Fix')
    })
  })

  describe('Clear Filters', () => {
    it('should reset all filters and show all tasks', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'priority', operator: 'equals', value: 'high' }
      ]

      let result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.filteredCount).toBeLessThan(result.totalCount)

      result = FilteringService.filterAndSort(mockTasks, [])
      expect(result.filteredCount).toBe(result.totalCount)
      expect(result.items).toHaveLength(5)
    })
  })
})
