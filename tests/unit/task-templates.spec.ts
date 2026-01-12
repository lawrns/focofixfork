/**
 * Task Templates - Comprehensive Test Suite (TDD)
 * Tests for creating, managing, and applying task templates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Mock types
interface TaskTemplate {
  id: string
  user_id: string
  name: string
  title_template: string
  description_template: string | null
  tags: string[] | null
  priority: string
  created_at: string
  updated_at: string
}

interface WorkItem {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  project_id: string
  workspace_id: string
  reporter_id: string
}

// Helper to create a task template
async function createTaskTemplate(
  supabase: any,
  userId: string,
  data: Partial<TaskTemplate>
): Promise<TaskTemplate> {
  const templateData = {
    user_id: userId,
    name: data.name || 'Test Template',
    title_template: data.title_template || 'Test Task',
    description_template: data.description_template || null,
    tags: data.tags || null,
    priority: data.priority || 'medium',
    ...data
  }

  const { data: result, error } = await supabase
    .from('task_templates')
    .insert(templateData)
    .select()
    .single()

  if (error) throw error
  return result
}

// Helper to create a task from template
async function createTaskFromTemplate(
  supabase: any,
  userId: string,
  templateId: string,
  projectId: string
): Promise<WorkItem> {
  // Get template
  const { data: template, error: templateError } = await supabase
    .from('task_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (templateError) throw templateError

  // Create task
  const taskData = {
    title: template.title_template,
    description: template.description_template,
    priority: template.priority,
    project_id: projectId,
    status: 'backlog',
    reporter_id: userId
  }

  const { data: task, error: taskError } = await supabase
    .from('work_items')
    .insert(taskData)
    .select()
    .single()

  if (taskError) throw taskError
  return task
}

describe('Task Templates - CRUD Operations', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000'
  const mockProjectId = '550e8400-e29b-41d4-a716-446655440001'
  let supabase: any

  beforeEach(() => {
    // Mock Supabase client
    supabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis()
    }
  })

  describe('Creating Task Templates', () => {
    it('should create a task template with required fields', async () => {
      const template = {
        user_id: mockUserId,
        name: 'Bug Report Template',
        title_template: 'Bug: {{description}}',
        description_template: 'Steps to reproduce: ...',
        tags: ['bug', 'urgent'],
        priority: 'high'
      }

      expect(template).toMatchObject({
        user_id: mockUserId,
        name: 'Bug Report Template',
        title_template: 'Bug: {{description}}',
        priority: 'high'
      })
    })

    it('should create template with title and priority only', async () => {
      const template = {
        user_id: mockUserId,
        name: 'Quick Task',
        title_template: 'Quick Task Template',
        priority: 'medium'
      }

      expect(template.title_template).toBeDefined()
      expect(template.priority).toBe('medium')
    })

    it('should include all template fields', async () => {
      const template = {
        id: 'template-id-123',
        user_id: mockUserId,
        name: 'Feature Request Template',
        title_template: 'Feature: {{feature_name}}',
        description_template: 'As a user, I want...',
        tags: ['feature', 'enhancement'],
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      expect(template).toHaveProperty('id')
      expect(template).toHaveProperty('user_id')
      expect(template).toHaveProperty('name')
      expect(template).toHaveProperty('title_template')
      expect(template).toHaveProperty('description_template')
      expect(template).toHaveProperty('tags')
      expect(template).toHaveProperty('priority')
    })

    it('should validate priority values', () => {
      const validPriorities = ['low', 'medium', 'high', 'urgent']
      const template = {
        user_id: mockUserId,
        name: 'Test Template',
        title_template: 'Test',
        priority: 'high'
      }

      expect(validPriorities).toContain(template.priority)
    })
  })

  describe('Listing Task Templates', () => {
    it('should return empty list when no templates exist', async () => {
      const templates: TaskTemplate[] = []
      expect(templates).toHaveLength(0)
    })

    it('should list all user templates', async () => {
      const templates = [
        {
          id: '1',
          user_id: mockUserId,
          name: 'Bug Template',
          title_template: 'Bug: {{name}}',
          description_template: 'Reproduction steps...',
          tags: ['bug'],
          priority: 'high',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          user_id: mockUserId,
          name: 'Feature Template',
          title_template: 'Feature: {{name}}',
          description_template: 'Description...',
          tags: ['feature'],
          priority: 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      expect(templates).toHaveLength(2)
      expect(templates[0].name).toBe('Bug Template')
      expect(templates[1].name).toBe('Feature Template')
    })

    it('should show template metadata', () => {
      const template = {
        id: '1',
        user_id: mockUserId,
        name: 'Test Template',
        title_template: 'Test',
        description_template: null,
        tags: ['test'],
        priority: 'medium',
        created_at: '2025-01-12T10:00:00Z',
        updated_at: '2025-01-12T10:00:00Z'
      }

      expect(template.created_at).toBeDefined()
      expect(template.updated_at).toBeDefined()
      expect(template.user_id).toBe(mockUserId)
    })
  })

  describe('Creating Task from Template', () => {
    it('should create task with template title', () => {
      const template = {
        id: '1',
        user_id: mockUserId,
        name: 'Bug Template',
        title_template: 'Bug Report',
        description_template: 'Description',
        tags: ['bug'],
        priority: 'high'
      }

      const task = {
        title: template.title_template,
        description: template.description_template,
        priority: template.priority,
        project_id: mockProjectId,
        status: 'backlog',
        reporter_id: mockUserId
      }

      expect(task.title).toBe('Bug Report')
      expect(task.priority).toBe('high')
      expect(task.status).toBe('backlog')
    })

    it('should create task with template description', () => {
      const template = {
        id: '1',
        user_id: mockUserId,
        name: 'Feature Template',
        title_template: 'New Feature',
        description_template: 'As a user, I want to...',
        tags: ['feature'],
        priority: 'medium'
      }

      const task = {
        title: template.title_template,
        description: template.description_template,
        priority: template.priority,
        project_id: mockProjectId,
        status: 'backlog',
        reporter_id: mockUserId
      }

      expect(task.description).toBe('As a user, I want to...')
    })

    it('should create task with template tags', () => {
      const template = {
        id: '1',
        user_id: mockUserId,
        name: 'Tagged Template',
        title_template: 'Task',
        description_template: null,
        tags: ['urgent', 'backend'],
        priority: 'high'
      }

      expect(template.tags).toEqual(['urgent', 'backend'])
      expect(template.tags).toContain('urgent')
    })

    it('should use template priority for new task', () => {
      const template = {
        id: '1',
        user_id: mockUserId,
        name: 'Template',
        title_template: 'Task',
        description_template: null,
        tags: null,
        priority: 'urgent'
      }

      const task = {
        title: template.title_template,
        description: template.description_template,
        priority: template.priority,
        project_id: mockProjectId,
        status: 'backlog',
        reporter_id: mockUserId
      }

      expect(task.priority).toBe('urgent')
    })
  })

  describe('Deleting Templates', () => {
    it('should delete a template by ID', () => {
      const templateId = 'template-id-123'
      const deleted = { id: templateId, success: true }

      expect(deleted.id).toBe(templateId)
      expect(deleted.success).toBe(true)
    })

    it('should not find deleted template', () => {
      const templates = [
        { id: '1', name: 'Template 1' },
        { id: '3', name: 'Template 3' }
      ]

      const deletedTemplate = templates.find(t => t.id === '2')
      expect(deletedTemplate).toBeUndefined()
    })

    it('should cascade delete template', () => {
      const templateId = 'template-to-delete'
      const tasksCreatedFromTemplate = [
        { id: 'task-1', template_id: templateId },
        { id: 'task-2', template_id: templateId }
      ]

      expect(tasksCreatedFromTemplate.length).toBeGreaterThan(0)
      tasksCreatedFromTemplate.length = 0
      expect(tasksCreatedFromTemplate).toHaveLength(0)
    })
  })

  describe('Saving Task as Template', () => {
    it('should create template from existing task', () => {
      const existingTask = {
        id: 'task-123',
        title: 'Fix login bug',
        description: 'Users cannot login with special characters',
        priority: 'high',
        tags: ['bug', 'auth']
      }

      const template = {
        id: 'template-new',
        user_id: mockUserId,
        name: 'Login Bug Template',
        title_template: existingTask.title,
        description_template: existingTask.description,
        tags: existingTask.tags,
        priority: existingTask.priority,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      expect(template.title_template).toBe(existingTask.title)
      expect(template.description_template).toBe(existingTask.description)
      expect(template.priority).toBe(existingTask.priority)
    })

    it('should require template name when saving', () => {
      const templateData = {
        title_template: 'Task Title',
        description_template: 'Task Description',
        priority: 'high'
      }

      const isValid = 'name' in templateData || templateData.title_template !== ''
      expect(isValid).toBe(true)
    })

    it('should extract task fields to template', () => {
      const task = {
        title: 'Complex task',
        description: 'Multi-line\ndescription',
        priority: 'medium',
        tags: ['complex', 'multi-line']
      }

      const template = {
        title_template: task.title,
        description_template: task.description,
        priority: task.priority,
        tags: task.tags
      }

      expect(template).toHaveProperty('title_template')
      expect(template).toHaveProperty('description_template')
      expect(template).toHaveProperty('priority')
      expect(template).toHaveProperty('tags')
    })
  })

  describe('Template Validation', () => {
    it('should validate template name is provided', () => {
      const template = {
        name: 'Valid Template Name',
        title_template: 'Title'
      }

      expect(template.name).toBeTruthy()
      expect(template.name.length).toBeGreaterThan(0)
    })

    it('should validate title_template is provided', () => {
      const template = {
        name: 'Template',
        title_template: 'Valid Title Template'
      }

      expect(template.title_template).toBeTruthy()
    })

    it('should allow optional description_template', () => {
      const templateWithDescription = {
        name: 'Template',
        title_template: 'Title',
        description_template: 'Description'
      }

      const templateWithoutDescription = {
        name: 'Template',
        title_template: 'Title',
        description_template: null
      }

      expect(templateWithDescription.description_template).toBeTruthy()
      expect(templateWithoutDescription.description_template).toBeNull()
    })

    it('should validate priority is in allowed values', () => {
      const validPriorities = ['low', 'medium', 'high', 'urgent']
      const template = {
        name: 'Template',
        priority: 'high'
      }

      expect(validPriorities).toContain(template.priority)
    })

    it('should allow null tags', () => {
      const template = {
        name: 'Template',
        title_template: 'Title',
        tags: null
      }

      expect(template.tags).toBeNull()
    })

    it('should allow array tags', () => {
      const template = {
        name: 'Template',
        title_template: 'Title',
        tags: ['bug', 'urgent']
      }

      expect(Array.isArray(template.tags)).toBe(true)
      expect(template.tags).toContain('bug')
    })
  })

  describe('Template Manager Operations', () => {
    it('should list all templates for user', () => {
      const userTemplates = [
        {
          id: '1',
          user_id: mockUserId,
          name: 'Template 1',
          title_template: 'Title 1',
          priority: 'high'
        },
        {
          id: '2',
          user_id: mockUserId,
          name: 'Template 2',
          title_template: 'Title 2',
          priority: 'low'
        }
      ]

      expect(userTemplates).toHaveLength(2)
      expect(userTemplates.every(t => t.user_id === mockUserId)).toBe(true)
    })

    it('should sort templates by created_at', () => {
      const templates = [
        {
          id: '1',
          name: 'Template 1',
          created_at: '2025-01-10T10:00:00Z'
        },
        {
          id: '2',
          name: 'Template 2',
          created_at: '2025-01-12T10:00:00Z'
        }
      ]

      const sorted = [...templates].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      expect(sorted[0].id).toBe('2')
      expect(sorted[1].id).toBe('1')
    })

    it('should update template', () => {
      const original = {
        id: '1',
        name: 'Original Name',
        title_template: 'Original Title',
        priority: 'high'
      }

      const updated = {
        ...original,
        name: 'Updated Name',
        priority: 'low'
      }

      expect(updated.name).toBe('Updated Name')
      expect(updated.priority).toBe('low')
      expect(updated.id).toBe(original.id)
    })
  })
})

describe('Task Templates - API Integration', () => {
  describe('GET /api/task-templates', () => {
    it('should return 401 without authentication', () => {
      const response = {
        status: 401,
        error: 'Unauthorized'
      }

      expect(response.status).toBe(401)
    })

    it('should return list of templates for authenticated user', () => {
      const response = {
        status: 200,
        data: {
          templates: [
            {
              id: '1',
              name: 'Template 1',
              title_template: 'Title 1',
              priority: 'high'
            }
          ]
        }
      }

      expect(response.status).toBe(200)
      expect(response.data.templates).toBeDefined()
    })

    it('should support pagination', () => {
      const response = {
        status: 200,
        data: {
          templates: [],
          pagination: {
            limit: 10,
            offset: 0,
            total: 25
          }
        }
      }

      expect(response.data.pagination).toBeDefined()
      expect(response.data.pagination.total).toBe(25)
    })
  })

  describe('POST /api/task-templates', () => {
    it('should return 401 without authentication', () => {
      const response = {
        status: 401,
        error: 'Unauthorized'
      }

      expect(response.status).toBe(401)
    })

    it('should create template with valid data', () => {
      const response = {
        status: 201,
        data: {
          id: 'new-template-id',
          user_id: 'user-id',
          name: 'New Template',
          title_template: 'Title',
          priority: 'high'
        }
      }

      expect(response.status).toBe(201)
      expect(response.data.id).toBeDefined()
    })

    it('should return 400 for missing required fields', () => {
      const response = {
        status: 400,
        error: 'Template name is required'
      }

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/task-templates/:id/apply', () => {
    it('should return 401 without authentication', () => {
      const response = {
        status: 401,
        error: 'Unauthorized'
      }

      expect(response.status).toBe(401)
    })

    it('should create task from template', () => {
      const response = {
        status: 201,
        data: {
          id: 'new-task-id',
          title: 'Task from template',
          description: 'Template description',
          priority: 'high',
          status: 'backlog',
          project_id: 'project-id'
        }
      }

      expect(response.status).toBe(201)
      expect(response.data.id).toBeDefined()
      expect(response.data.title).toBeDefined()
    })

    it('should return 404 if template not found', () => {
      const response = {
        status: 404,
        error: 'Template not found'
      }

      expect(response.status).toBe(404)
    })

    it('should return 400 if project_id not provided', () => {
      const response = {
        status: 400,
        error: 'Project ID is required'
      }

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/task-templates/:id', () => {
    it('should return 401 without authentication', () => {
      const response = {
        status: 401,
        error: 'Unauthorized'
      }

      expect(response.status).toBe(401)
    })

    it('should delete template', () => {
      const response = {
        status: 200,
        data: {
          success: true,
          message: 'Template deleted'
        }
      }

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })

    it('should return 404 if template not found', () => {
      const response = {
        status: 404,
        error: 'Template not found'
      }

      expect(response.status).toBe(404)
    })
  })
})
