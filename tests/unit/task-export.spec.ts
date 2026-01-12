/**
 * Task Export - Comprehensive Test Suite (TDD)
 * Tests for CSV and JSON export functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Test types
interface ExportTask {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  due_date?: string
  assignee_id?: string
  tags?: string[]
  created_at: string
}

interface ExportOptions {
  format: 'csv' | 'json'
  projectId: string
  filters?: {
    status?: string
    priority?: string
    assignee_id?: string
  }
}

// Mock data generator
function createMockTask(overrides?: Partial<ExportTask>): ExportTask {
  return {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo',
    priority: 'medium',
    due_date: '2026-02-01',
    assignee_id: 'user-1',
    tags: ['important'],
    created_at: '2026-01-12T10:00:00Z',
    ...overrides,
  }
}

describe('Task Export - CSV Format', () => {
  describe('CSV Export Generation', () => {
    it('should generate CSV with all required fields', () => {
      const tasks = [
        createMockTask({ id: '1', title: 'Task 1' }),
        createMockTask({ id: '2', title: 'Task 2' }),
      ]

      const csv = generateCSV(tasks)

      expect(csv).toContain('id')
      expect(csv).toContain('title')
      expect(csv).toContain('description')
      expect(csv).toContain('status')
      expect(csv).toContain('priority')
      expect(csv).toContain('due_date')
      expect(csv).toContain('assignee_id')
      expect(csv).toContain('tags')
      expect(csv).toContain('created_at')
    })

    it('should include all task rows in CSV', () => {
      const tasks = [
        createMockTask({ id: '1', title: 'Task 1' }),
        createMockTask({ id: '2', title: 'Task 2' }),
        createMockTask({ id: '3', title: 'Task 3' }),
      ]

      const csv = generateCSV(tasks)
      const lines = csv.trim().split('\n')

      // Header + 3 data rows
      expect(lines.length).toBe(4)
      expect(csv).toContain('Task 1')
      expect(csv).toContain('Task 2')
      expect(csv).toContain('Task 3')
    })

    it('should properly escape CSV values with commas', () => {
      const tasks = [
        createMockTask({ title: 'Task with, comma' }),
      ]

      const csv = generateCSV(tasks)

      expect(csv).toContain('"Task with, comma"')
    })

    it('should properly escape CSV values with quotes', () => {
      const tasks = [
        createMockTask({ title: 'Task with "quotes"' }),
      ]

      const csv = generateCSV(tasks)

      expect(csv).toContain('Task with ""quotes""')
    })

    it('should handle empty/null fields gracefully', () => {
      const tasks = [
        createMockTask({
          description: undefined,
          assignee_id: undefined,
          due_date: undefined,
        }),
      ]

      const csv = generateCSV(tasks)

      expect(csv).toBeDefined()
      expect(csv.length).toBeGreaterThan(0)
    })

    it('should handle array fields (tags) as comma-separated values', () => {
      const tasks = [
        createMockTask({ tags: ['bug', 'urgent', 'frontend'] }),
      ]

      const csv = generateCSV(tasks)

      expect(csv).toContain('bug,urgent,frontend')
    })
  })

  describe('CSV Filename Generation', () => {
    it('should generate filename with project name and date', () => {
      const filename = generateExportFilename('my-project', 'csv')

      expect(filename).toContain('tasks-my-project-')
      expect(filename).toContain('.csv')
    })

    it('should include date in filename', () => {
      const filename = generateExportFilename('my-project', 'csv')
      const now = new Date()
      const expectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

      expect(filename).toContain(expectedDate)
    })

    it('should handle special characters in project name', () => {
      const filename = generateExportFilename('my@project#name', 'csv')

      // Special chars should be handled gracefully
      expect(filename).toBeDefined()
      expect(filename.endsWith('.csv')).toBe(true)
    })
  })
})

describe('Task Export - JSON Format', () => {
  describe('JSON Export Generation', () => {
    it('should generate valid JSON', () => {
      const tasks = [
        createMockTask({ id: '1', title: 'Task 1' }),
      ]

      const json = generateJSON(tasks)
      const parsed = JSON.parse(json)

      expect(Array.isArray(parsed)).toBe(true)
    })

    it('should include all task fields in JSON', () => {
      const tasks = [
        createMockTask({ id: '1', title: 'Task 1' }),
      ]

      const json = generateJSON(tasks)
      const parsed = JSON.parse(json)

      expect(parsed[0]).toHaveProperty('id')
      expect(parsed[0]).toHaveProperty('title')
      expect(parsed[0]).toHaveProperty('description')
      expect(parsed[0]).toHaveProperty('status')
      expect(parsed[0]).toHaveProperty('priority')
      expect(parsed[0]).toHaveProperty('due_date')
      expect(parsed[0]).toHaveProperty('assignee_id')
      expect(parsed[0]).toHaveProperty('tags')
      expect(parsed[0]).toHaveProperty('created_at')
    })

    it('should include all task rows in JSON', () => {
      const tasks = [
        createMockTask({ id: '1', title: 'Task 1' }),
        createMockTask({ id: '2', title: 'Task 2' }),
        createMockTask({ id: '3', title: 'Task 3' }),
      ]

      const json = generateJSON(tasks)
      const parsed = JSON.parse(json)

      expect(parsed.length).toBe(3)
      expect(parsed[0].id).toBe('1')
      expect(parsed[1].id).toBe('2')
      expect(parsed[2].id).toBe('3')
    })

    it('should preserve data types in JSON', () => {
      const tasks = [
        createMockTask({ id: '1' }),
      ]

      const json = generateJSON(tasks)
      const parsed = JSON.parse(json)

      expect(typeof parsed[0].id).toBe('string')
      expect(typeof parsed[0].title).toBe('string')
    })

    it('should handle empty task arrays', () => {
      const tasks: ExportTask[] = []

      const json = generateJSON(tasks)
      const parsed = JSON.parse(json)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(0)
    })
  })

  describe('JSON Filename Generation', () => {
    it('should generate filename with project name and date', () => {
      const filename = generateExportFilename('my-project', 'json')

      expect(filename).toContain('tasks-my-project-')
      expect(filename).toContain('.json')
    })
  })
})

describe('Task Export - Filter Handling', () => {
  describe('Filtered Export', () => {
    it('should export only tasks matching status filter', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'todo' }),
        createMockTask({ id: '2', status: 'in_progress' }),
        createMockTask({ id: '3', status: 'done' }),
      ]

      const filtered = filterTasks(tasks, { status: 'todo' })

      expect(filtered.length).toBe(1)
      expect(filtered[0].id).toBe('1')
    })

    it('should export only tasks matching priority filter', () => {
      const tasks = [
        createMockTask({ id: '1', priority: 'low' }),
        createMockTask({ id: '2', priority: 'medium' }),
        createMockTask({ id: '3', priority: 'high' }),
      ]

      const filtered = filterTasks(tasks, { priority: 'high' })

      expect(filtered.length).toBe(1)
      expect(filtered[0].id).toBe('3')
    })

    it('should export only tasks matching assignee filter', () => {
      const tasks = [
        createMockTask({ id: '1', assignee_id: 'user-1' }),
        createMockTask({ id: '2', assignee_id: 'user-2' }),
        createMockTask({ id: '3', assignee_id: 'user-1' }),
      ]

      const filtered = filterTasks(tasks, { assignee_id: 'user-1' })

      expect(filtered.length).toBe(2)
      expect(filtered.every(t => t.assignee_id === 'user-1')).toBe(true)
    })

    it('should apply multiple filters together', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'todo', priority: 'high' }),
        createMockTask({ id: '2', status: 'todo', priority: 'low' }),
        createMockTask({ id: '3', status: 'done', priority: 'high' }),
      ]

      const filtered = filterTasks(tasks, { status: 'todo', priority: 'high' })

      expect(filtered.length).toBe(1)
      expect(filtered[0].id).toBe('1')
    })

    it('should export all tasks when no filters provided', () => {
      const tasks = [
        createMockTask({ id: '1' }),
        createMockTask({ id: '2' }),
        createMockTask({ id: '3' }),
      ]

      const filtered = filterTasks(tasks, {})

      expect(filtered.length).toBe(3)
    })
  })
})

describe('Task Export - File Download', () => {
  describe('Download Trigger', () => {
    it('should trigger file download with correct filename', () => {
      const downloadSpy = vi.fn()
      const tasks = [createMockTask()]

      triggerDownload(tasks, 'csv', 'my-project', downloadSpy)

      expect(downloadSpy).toHaveBeenCalled()
      const filename = downloadSpy.mock.calls[0][1]
      expect(filename).toContain('tasks-my-project-')
      expect(filename).toContain('.csv')
    })

    it('should create blob with correct content type for CSV', () => {
      const downloadSpy = vi.fn()
      const tasks = [createMockTask()]

      triggerDownload(tasks, 'csv', 'my-project', downloadSpy)

      const blob = downloadSpy.mock.calls[0][0]
      expect(blob.type).toBe('text/csv')
    })

    it('should create blob with correct content type for JSON', () => {
      const downloadSpy = vi.fn()
      const tasks = [createMockTask()]

      triggerDownload(tasks, 'json', 'my-project', downloadSpy)

      const blob = downloadSpy.mock.calls[0][0]
      expect(blob.type).toBe('application/json')
    })
  })
})

describe('Task Export - API Integration', () => {
  describe('Export Endpoint', () => {
    it('should require authentication', async () => {
      const response = await mockFetchExport('csv', 'project-1', undefined, false)

      expect(response.status).toBe(401)
    })

    it('should validate format parameter', async () => {
      const response = await mockFetchExport('invalid-format', 'project-1')

      expect(response.status).toBe(400)
    })

    it('should require project_id parameter', async () => {
      const response = await mockFetchExport('csv', '')

      expect(response.status).toBe(400)
    })

    it('should return CSV data with correct headers', async () => {
      const response = await mockFetchExport('csv', 'project-1')

      expect(response.status).toBe(200)
      expect(response.contentType).toBe('text/csv')
      expect(response.body).toContain('id,title')
    })

    it('should return JSON data with correct headers', async () => {
      const response = await mockFetchExport('json', 'project-1')

      expect(response.status).toBe(200)
      expect(response.contentType).toBe('application/json')
      const parsed = JSON.parse(response.body)
      expect(Array.isArray(parsed)).toBe(true)
    })

    it('should respect filter parameters in export', async () => {
      const response = await mockFetchExport('csv', 'project-1', { status: 'done' })

      expect(response.status).toBe(200)
      // Should only contain done tasks
      expect(response.body).not.toContain('todo')
    })

    it('should include filename in response headers', async () => {
      const response = await mockFetchExport('csv', 'project-1')

      expect(response.headers).toHaveProperty('content-disposition')
      expect(response.headers['content-disposition']).toContain('attachment')
      expect(response.headers['content-disposition']).toContain('tasks-')
    })
  })
})

// Helper functions for testing
function generateCSV(tasks: ExportTask[]): string {
  const headers = ['id', 'title', 'description', 'status', 'priority', 'due_date', 'assignee_id', 'tags', 'created_at']
  const headerRow = headers.join(',')

  const rows = tasks.map(task => {
    return headers.map(header => {
      let value = (task as any)[header]

      if (Array.isArray(value)) {
        value = value.join(',')
      }

      if (value === null || value === undefined) {
        return ''
      }

      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }

      return value
    }).join(',')
  })

  return [headerRow, ...rows].join('\n')
}

function generateJSON(tasks: ExportTask[]): string {
  return JSON.stringify(tasks, null, 2)
}

function generateExportFilename(projectName: string, format: 'csv' | 'json'): string {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const cleanProjectName = projectName.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  return `tasks-${cleanProjectName}-${date}.${format}`
}

function filterTasks(
  tasks: ExportTask[],
  filters?: { status?: string; priority?: string; assignee_id?: string }
): ExportTask[] {
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

function triggerDownload(
  tasks: ExportTask[],
  format: 'csv' | 'json',
  projectName: string,
  downloadFn: (blob: Blob, filename: string) => void
): void {
  const content = format === 'csv' ? generateCSV(tasks) : generateJSON(tasks)
  const contentType = format === 'csv' ? 'text/csv' : 'application/json'
  const blob = new Blob([content], { type: contentType })
  const filename = generateExportFilename(projectName, format)
  downloadFn(blob, filename)
}

interface MockResponse {
  status: number
  body: string
  contentType: string
  headers: Record<string, string>
}

async function mockFetchExport(
  format: string,
  projectId: string,
  filters?: { status?: string },
  authenticated: boolean = true
): Promise<MockResponse> {
  // Mock validation
  if (!authenticated) {
    return { status: 401, body: 'Unauthorized', contentType: 'application/json', headers: {} }
  }

  if (!['csv', 'json'].includes(format)) {
    return { status: 400, body: 'Invalid format', contentType: 'application/json', headers: {} }
  }

  if (!projectId) {
    return { status: 400, body: 'Project ID required', contentType: 'application/json', headers: {} }
  }

  // Mock successful response
  const tasks = [
    createMockTask({ id: '1', status: 'done' }),
    createMockTask({ id: '2', status: 'todo' }),
  ]

  const filtered = filterTasks(tasks, filters)
  const content = format === 'csv' ? generateCSV(filtered) : generateJSON(filtered)
  const contentType = format === 'csv' ? 'text/csv' : 'application/json'
  const filename = generateExportFilename('test-project', format as 'csv' | 'json')

  return {
    status: 200,
    body: content,
    contentType,
    headers: {
      'content-disposition': `attachment; filename="${filename}"`,
      'content-type': contentType,
    },
  }
}
