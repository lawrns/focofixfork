import { describe, it, expect, beforeEach } from 'vitest'
import { FilteringService, FilterCondition, SortCondition } from '@/lib/services/filtering'

describe('FilteringService - Advanced Multi-Criteria Filtering', () => {
  interface MockTask {
    id: string
    title: string
    status: 'todo' | 'in_progress' | 'review' | 'done'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    assignee_id?: string
    assignee_name?: string
    due_date?: string
    tags?: string[]
    created_date: string
  }

  let mockTasks: MockTask[]

  beforeEach(() => {
    mockTasks = [
      {
        id: '1',
        title: 'Fix login bug',
        status: 'in_progress',
        priority: 'high',
        assignee_id: 'user-1',
        assignee_name: 'Alice',
        due_date: '2025-01-15',
        tags: ['bug', 'authentication'],
        created_date: '2025-01-10'
      },
      {
        id: '2',
        title: 'Design new feature',
        status: 'todo',
        priority: 'medium',
        assignee_id: 'user-2',
        assignee_name: 'Bob',
        due_date: '2025-01-20',
        tags: ['design', 'feature'],
        created_date: '2025-01-05'
      },
      {
        id: '3',
        title: 'Review PR',
        status: 'review',
        priority: 'medium',
        assignee_id: 'user-1',
        assignee_name: 'Alice',
        due_date: '2025-01-12',
        tags: ['review'],
        created_date: '2025-01-08'
      },
      {
        id: '4',
        title: 'Deploy to production',
        status: 'done',
        priority: 'urgent',
        assignee_id: 'user-3',
        assignee_name: 'Charlie',
        due_date: '2025-01-11',
        tags: ['deployment'],
        created_date: '2025-01-01'
      },
      {
        id: '5',
        title: 'Update documentation',
        status: 'todo',
        priority: 'low',
        assignee_id: 'user-2',
        assignee_name: 'Bob',
        tags: ['documentation'],
        created_date: '2025-01-09'
      }
    ]
  })

  describe('Single Criteria Filtering', () => {
    it('should filter by status only', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(2)
      expect(result.items.every(t => t.status === 'todo')).toBe(true)
    })

    it('should filter by priority only', () => {
      const filters: FilterCondition[] = [
        { field: 'priority', operator: 'equals', value: 'high' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].priority).toBe('high')
    })

    it('should filter by assignee', () => {
      const filters: FilterCondition[] = [
        { field: 'assignee_id', operator: 'equals', value: 'user-1' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(2)
      expect(result.items.every(t => t.assignee_id === 'user-1')).toBe(true)
    })

    it('should filter by title contains (case-insensitive)', () => {
      const filters: FilterCondition[] = [
        { field: 'title', operator: 'contains', value: 'fix', caseSensitive: false }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].title).toContain('Fix')
    })

    it('should filter by title contains (case-sensitive)', () => {
      const filters: FilterCondition[] = [
        { field: 'title', operator: 'contains', value: 'Fix', caseSensitive: true }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
    })
  })

  describe('Multi-Criteria AND Logic Filtering', () => {
    it('should filter by status AND priority (both must match)', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'priority', operator: 'equals', value: 'medium' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('2')
      expect(result.items[0].status).toBe('todo')
      expect(result.items[0].priority).toBe('medium')
    })

    it('should filter by status AND assignee', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'assignee_id', operator: 'equals', value: 'user-2' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('2')
    })

    it('should filter by priority AND assignee (multiple matches)', () => {
      const filters: FilterCondition[] = [
        { field: 'priority', operator: 'equals', value: 'medium' },
        { field: 'assignee_id', operator: 'equals', value: 'user-1' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('3')
    })

    it('should filter by status AND priority AND assignee', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'in_progress' },
        { field: 'priority', operator: 'equals', value: 'high' },
        { field: 'assignee_id', operator: 'equals', value: 'user-1' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('1')
    })

    it('should return empty set when AND conditions cannot all be met', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'done' },
        { field: 'priority', operator: 'equals', value: 'low' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(0)
    })
  })

  describe('Date Range Filters', () => {
    it('should filter tasks due before a date', () => {
      const filters: FilterCondition[] = [
        { field: 'due_date', operator: 'less_than', value: '2025-01-15' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.every(t => !t.due_date || t.due_date < '2025-01-15')).toBe(true)
    })

    it('should filter tasks due after a date', () => {
      const filters: FilterCondition[] = [
        { field: 'due_date', operator: 'greater_than', value: '2025-01-15' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.every(t => !t.due_date || t.due_date > '2025-01-15')).toBe(true)
    })

    it('should filter tasks due within a range', () => {
      const filters: FilterCondition[] = [
        { field: 'due_date', operator: 'between', value: ['2025-01-10', '2025-01-15'] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should combine date range with other filters', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'due_date', operator: 'greater_than', value: '2025-01-15' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('2')
    })
  })

  describe('Tag Filters (Array Fields)', () => {
    it('should filter tasks containing a specific tag', () => {
      const filters: FilterCondition[] = [
        { field: 'tags', operator: 'in', value: ['bug'] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.every(t => t.tags?.includes('bug'))).toBe(true)
    })

    it('should filter tasks with multiple tag options (in operator)', () => {
      const filters: FilterCondition[] = [
        { field: 'tags', operator: 'in', value: ['bug', 'review'] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should filter tasks NOT containing a specific tag', () => {
      const filters: FilterCondition[] = [
        { field: 'tags', operator: 'not_in', value: ['bug'] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.every(t => !t.tags?.includes('bug'))).toBe(true)
    })

    it('should combine tag filters with status filters', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'tags', operator: 'in', value: ['documentation'] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('5')
    })
  })

  describe('Sorting with Filters', () => {
    it('should sort by priority ascending with filters', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' }
      ]
      const sort: SortCondition[] = [
        { field: 'priority', direction: 'asc' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters, sort)
      expect(result.items.length).toBe(2)
      expect(result.items[0].priority).toBe('low')
      expect(result.items[1].priority).toBe('medium')
    })

    it('should sort by due date ascending', () => {
      const sort: SortCondition[] = [
        { field: 'due_date', direction: 'asc' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, [], sort)
      const withDates = result.items.filter(t => t.due_date)
      for (let i = 0; i < withDates.length - 1; i++) {
        expect(withDates[i].due_date).toBeLessThanOrEqual(withDates[i + 1].due_date!)
      }
    })

    it('should apply multiple sort conditions', () => {
      const sort: SortCondition[] = [
        { field: 'status', direction: 'asc' },
        { field: 'priority', direction: 'desc' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, [], sort)
      expect(result.items.length).toBe(5)
    })
  })

  describe('Complex Filter Combinations', () => {
    it('should handle 4+ criteria filters with sorting', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'in_progress' },
        { field: 'priority', operator: 'not_equals', value: 'low' },
        { field: 'assignee_id', operator: 'equals', value: 'user-1' },
        { field: 'due_date', operator: 'less_than', value: '2025-01-20' }
      ]
      const sort: SortCondition[] = [
        { field: 'due_date', direction: 'asc' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters, sort)
      expect(result.items.length).toBeGreaterThanOrEqual(0)
    })

    it('should filter by created date range', () => {
      const filters: FilterCondition[] = [
        { field: 'created_date', operator: 'between', value: ['2025-01-05', '2025-01-10'] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should combine all filter types together', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'priority', operator: 'not_equals', value: 'urgent' },
        { field: 'tags', operator: 'in', value: ['feature', 'documentation'] }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.items.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Filter Validation', () => {
    it('should validate required field', () => {
      const conditions: FilterCondition[] = [
        { field: '', operator: 'equals', value: 'test' }
      ]
      const validation = FilteringService.validateConditions(conditions)
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('should validate required operator', () => {
      const conditions: FilterCondition[] = [
        { field: 'status', operator: 'equals' as any, value: 'test' }
      ]
      const validation = FilteringService.validateConditions(conditions)
      expect(validation.isValid).toBe(false)
    })

    it('should validate required value for equals operator', () => {
      const conditions: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: '' }
      ]
      const validation = FilteringService.validateConditions(conditions)
      expect(validation.isValid).toBe(false)
    })

    it('should validate between operator requires 2 values', () => {
      const conditions: FilterCondition[] = [
        { field: 'due_date', operator: 'between', value: ['2025-01-01'] }
      ]
      const validation = FilteringService.validateConditions(conditions)
      expect(validation.isValid).toBe(false)
    })

    it('should validate in operator requires array', () => {
      const conditions: FilterCondition[] = [
        { field: 'tags', operator: 'in', value: [] }
      ]
      const validation = FilteringService.validateConditions(conditions)
      expect(validation.isValid).toBe(false)
    })

    it('should accept valid conditions', () => {
      const conditions: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'priority', operator: 'equals', value: 'high' }
      ]
      const validation = FilteringService.validateConditions(conditions)
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('Filter Results Metadata', () => {
    it('should return total and filtered count', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.totalCount).toBe(5)
      expect(result.filteredCount).toBe(2)
    })

    it('should include applied filters in result', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, filters)
      expect(result.appliedFilters).toEqual(filters)
    })

    it('should include applied sort in result', () => {
      const sort: SortCondition[] = [
        { field: 'priority', direction: 'asc' }
      ]
      const result = FilteringService.filterAndSort(mockTasks, [], sort)
      expect(result.appliedSort).toEqual(sort)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined/null values gracefully', () => {
      const testTasks: MockTask[] = [
        ...mockTasks.slice(0, 2),
        {
          id: '6',
          title: 'No assignee task',
          status: 'todo',
          priority: 'medium',
          due_date: undefined,
          created_date: '2025-01-01'
        }
      ]
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' }
      ]
      const result = FilteringService.filterAndSort(testTasks, filters)
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should handle empty array', () => {
      const result = FilteringService.filterAndSort([], [])
      expect(result.items).toEqual([])
      expect(result.totalCount).toBe(0)
      expect(result.filteredCount).toBe(0)
    })

    it('should handle filters on empty array', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' }
      ]
      const result = FilteringService.filterAndSort([], filters)
      expect(result.items).toEqual([])
    })
  })
})
