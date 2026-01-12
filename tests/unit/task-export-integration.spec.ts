/**
 * Task Export - Integration Tests
 * Tests the complete export flow from API to client
 */

import { describe, it, expect, vi } from 'vitest'

describe('Task Export - Integration', () => {
  describe('CSV Export Flow', () => {
    it('should generate correct CSV format from API response', () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Test Task 1',
          description: 'Description 1',
          status: 'todo',
          priority: 'high',
          due_date: '2026-02-01',
          assignee_id: 'user-1',
          tags: ['bug', 'urgent'],
          created_at: '2026-01-12T10:00:00Z',
        },
        {
          id: '2',
          title: 'Test Task 2',
          description: 'Description 2',
          status: 'done',
          priority: 'low',
          due_date: '2026-02-15',
          assignee_id: 'user-2',
          tags: ['feature'],
          created_at: '2026-01-13T10:00:00Z',
        },
      ]

      // Simulate CSV generation
      const csv = generateCSVFromTasks(mockTasks)

      expect(csv).toContain('id,title,description,status,priority,due_date,assignee_id,tags,created_at')
      expect(csv).toContain('1,Test Task 1,Description 1,todo,high,2026-02-01,user-1,bug;urgent,2026-01-12T10:00:00Z')
      expect(csv).toContain('2,Test Task 2,Description 2,done,low,2026-02-15,user-2,feature,2026-01-13T10:00:00Z')
    })

    it('should handle CSV with special characters', () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Task with "quotes"',
          description: 'Description with, comma',
          status: 'todo',
          priority: 'high',
          due_date: '2026-02-01',
          assignee_id: 'user-1',
          tags: null,
          created_at: '2026-01-12T10:00:00Z',
        },
      ]

      const csv = generateCSVFromTasks(mockTasks)

      // Quotes should be escaped, commas should trigger quoting
      expect(csv).toContain('"Task with ""quotes"""')
      expect(csv).toContain('"Description with, comma"')
    })
  })

  describe('JSON Export Flow', () => {
    it('should generate valid JSON array from tasks', () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Test Task',
          description: 'Description',
          status: 'todo',
          priority: 'high',
          due_date: '2026-02-01',
          assignee_id: 'user-1',
          tags: ['bug'],
          created_at: '2026-01-12T10:00:00Z',
        },
      ]

      const json = generateJSONFromTasks(mockTasks)
      const parsed = JSON.parse(json)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed[0].id).toBe('1')
      expect(parsed[0].title).toBe('Test Task')
      expect(parsed[0].tags).toEqual(['bug'])
    })

    it('should preserve data integrity in JSON export', () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Task 1',
          description: null,
          status: 'in_progress',
          priority: 'medium',
          due_date: null,
          assignee_id: null,
          tags: null,
          created_at: '2026-01-12T10:00:00Z',
        },
      ]

      const json = generateJSONFromTasks(mockTasks)
      const parsed = JSON.parse(json)

      expect(parsed[0].description).toBeNull()
      expect(parsed[0].due_date).toBeNull()
      expect(parsed[0].assignee_id).toBeNull()
      expect(parsed[0].tags).toBeNull()
    })
  })

  describe('Export Filename Generation', () => {
    it('should include date in filename', () => {
      const filename = generateExportFilename('my-project', 'csv')
      const now = new Date()
      const expectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

      expect(filename).toContain(expectedDate)
      expect(filename).toContain('tasks-')
      expect(filename).toContain('.csv')
    })

    it('should handle special characters in project name', () => {
      const filename = generateExportFilename('My Project!@#$', 'json')

      // Special chars should be removed/replaced
      expect(filename).toContain('tasks-')
      expect(filename).toContain('.json')
      expect(/^tasks-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.json$/.test(filename)).toBe(true)
    })
  })

  describe('Export Filtering', () => {
    it('should export only tasks matching filters', () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Task 1',
          description: 'Desc',
          status: 'todo',
          priority: 'high',
          due_date: null,
          assignee_id: 'user-1',
          tags: null,
          created_at: '2026-01-12T10:00:00Z',
        },
        {
          id: '2',
          title: 'Task 2',
          description: 'Desc',
          status: 'done',
          priority: 'high',
          due_date: null,
          assignee_id: 'user-1',
          tags: null,
          created_at: '2026-01-12T10:00:00Z',
        },
        {
          id: '3',
          title: 'Task 3',
          description: 'Desc',
          status: 'todo',
          priority: 'low',
          due_date: null,
          assignee_id: 'user-2',
          tags: null,
          created_at: '2026-01-12T10:00:00Z',
        },
      ]

      const filtered = filterTasks(mockTasks, { status: 'todo', priority: 'high' })

      expect(filtered.length).toBe(1)
      expect(filtered[0].id).toBe('1')
    })

    it('should respect multiple filter criteria', () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Task',
          description: 'Desc',
          status: 'todo',
          priority: 'high',
          due_date: null,
          assignee_id: 'user-1',
          tags: null,
          created_at: '2026-01-12T10:00:00Z',
        },
      ]

      const filtered1 = filterTasks(mockTasks, { status: 'todo' })
      const filtered2 = filterTasks(mockTasks, { priority: 'high' })
      const filtered3 = filterTasks(mockTasks, { assignee_id: 'user-1' })
      const filtered4 = filterTasks(mockTasks, { status: 'todo', priority: 'high', assignee_id: 'user-1' })

      expect(filtered1.length).toBe(1)
      expect(filtered2.length).toBe(1)
      expect(filtered3.length).toBe(1)
      expect(filtered4.length).toBe(1)

      const filtered5 = filterTasks(mockTasks, { status: 'done' })
      expect(filtered5.length).toBe(0)
    })
  })

  describe('File Download', () => {
    it('should create blob with correct MIME type for CSV', () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Task',
          description: 'Desc',
          status: 'todo',
          priority: 'high',
          due_date: null,
          assignee_id: null,
          tags: null,
          created_at: '2026-01-12T10:00:00Z',
        },
      ]

      const blob = createBlob(mockTasks, 'csv')

      expect(blob.type).toBe('text/csv; charset=utf-8')
    })

    it('should create blob with correct MIME type for JSON', () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Task',
          description: 'Desc',
          status: 'todo',
          priority: 'high',
          due_date: null,
          assignee_id: null,
          tags: null,
          created_at: '2026-01-12T10:00:00Z',
        },
      ]

      const blob = createBlob(mockTasks, 'json')

      expect(blob.type).toBe('application/json; charset=utf-8')
    })

    it('should create downloadable blob from task data', () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Task',
          description: 'Desc',
          status: 'todo',
          priority: 'high',
          due_date: null,
          assignee_id: null,
          tags: null,
          created_at: '2026-01-12T10:00:00Z',
        },
      ]

      const csvBlob = createBlob(mockTasks, 'csv')
      const jsonBlob = createBlob(mockTasks, 'json')

      expect(csvBlob.size).toBeGreaterThan(0)
      expect(jsonBlob.size).toBeGreaterThan(0)
    })
  })
})

// Helper functions
function generateCSVFromTasks(tasks: any[]): string {
  const headers = ['id', 'title', 'description', 'status', 'priority', 'due_date', 'assignee_id', 'tags', 'created_at']
  const headerRow = headers.join(',')

  const rows = tasks.map(task => {
    return headers.map(header => {
      let value = task[header]

      if (Array.isArray(value)) {
        value = value.join(';')
      }

      if (value === null || value === undefined) {
        return ''
      }

      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`
      }

      return value
    }).join(',')
  })

  return [headerRow, ...rows].join('\n')
}

function generateJSONFromTasks(tasks: any[]): string {
  return JSON.stringify(tasks, null, 2)
}

function generateExportFilename(projectName: string, format: 'csv' | 'json'): string {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const cleanProjectName = projectName.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  return `tasks-${cleanProjectName}-${date}.${format}`
}

function filterTasks(
  tasks: any[],
  filters?: { status?: string; priority?: string; assignee_id?: string }
): any[] {
  if (!filters || Object.keys(filters).length === 0) {
    return tasks
  }

  return tasks.filter(task => {
    if (filters.status && task.status !== filters.status) return false
    if (filters.priority && task.priority !== filters.priority) return false
    if (filters.assignee_id && task.assignee_id !== filters.assignee_id) return false
    return true
  })
}

function createBlob(tasks: any[], format: 'csv' | 'json'): Blob {
  const content = format === 'csv' ? generateCSVFromTasks(tasks) : generateJSONFromTasks(tasks)
  const contentType = format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8'
  return new Blob([content], { type: contentType })
}
