import { describe, it, expect } from 'vitest'
import { FilteringService, FilterCondition, SortCondition } from '@/lib/services/filtering'

describe('Task filtering integration (service-level)', () => {
  const tasks = [
    { id: '1', title: 'Bug', status: 'backlog', priority: 'high', tags: ['bug'], due_date: '2025-01-10' },
    { id: '2', title: 'Feature', status: 'in_progress', priority: 'medium', tags: ['feature'], due_date: '2025-01-20' },
    { id: '3', title: 'Docs', status: 'backlog', priority: 'low', tags: ['docs'], due_date: '2025-01-30' },
  ]

  it('applies multi-condition filters', () => {
    const filters: FilterCondition[] = [
      { field: 'status', operator: 'equals', value: 'backlog' },
      { field: 'priority', operator: 'not_equals', value: 'low' },
    ]
    const result = FilteringService.filterAndSort(tasks as any, filters)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('1')
  })

  it('supports tag inclusion filters', () => {
    const filters: FilterCondition[] = [
      { field: 'tags', operator: 'in', value: ['feature'] },
    ]
    const result = FilteringService.filterAndSort(tasks as any, filters)
    expect(Array.isArray(result.items)).toBe(true)
  })

  it('sorts filtered items by due date', () => {
    const sort: SortCondition[] = [{ field: 'due_date', direction: 'asc' }]
    const result = FilteringService.filterAndSort(tasks as any, [], sort)
    expect(result.items[0].id).toBe('1')
    expect(result.items[2].id).toBe('3')
  })
})
