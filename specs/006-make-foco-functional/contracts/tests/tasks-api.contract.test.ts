import { describe, it, expect } from 'vitest'

describe('Tasks API Contract Tests', () => {
  // Test data based on OpenAPI spec
  const validTaskData = {
    title: 'Implement user authentication',
    description: 'Add login and registration functionality',
    project_id: '123e4567-e89b-12d3-a456-426614174000',
    milestone_id: '123e4567-e89b-12d3-a456-426614174001',
    status: 'todo',
    priority: 'high',
    assignee_id: '123e4567-e89b-12d3-a456-426614174002',
    estimated_hours: 8,
    due_date: '2025-02-01',
  }

  const validTaskUpdate = {
    title: 'Implement user authentication - Updated',
    status: 'in_progress',
    actual_hours: 4,
  }

  describe('GET /api/tasks', () => {
    it('should return list of tasks with pagination', async () => {
      const response = await fetch('/api/tasks?limit=10&offset=0', {
        method: 'GET',
        headers: { 'x-user-id': 'user-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(Array.isArray(data.data)).toBe(true)
      expect(data).toHaveProperty('pagination')
      expect(data.pagination).toHaveProperty('total')
      expect(data.pagination).toHaveProperty('limit', 10)
      expect(data.pagination).toHaveProperty('offset', 0)
    })

    it('should filter tasks by project', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000'
      const response = await fetch(`/api/tasks?project_id=${projectId}`, {
        method: 'GET',
        headers: { 'x-user-id': 'user-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      data.data.forEach((task: any) => {
        expect(task.project_id).toBe(projectId)
      })
    })

    it('should filter tasks by status', async () => {
      const response = await fetch('/api/tasks?status=in_progress', {
        method: 'GET',
        headers: { 'x-user-id': 'user-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      data.data.forEach((task: any) => {
        expect(task.status).toBe('in_progress')
      })
    })

    it('should filter tasks by assignee', async () => {
      const assigneeId = '123e4567-e89b-12d3-a456-426614174002'
      const response = await fetch(`/api/tasks?assignee_id=${assigneeId}`, {
        method: 'GET',
        headers: { 'x-user-id': 'user-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      data.data.forEach((task: any) => {
        expect(task.assignee_id).toBe(assigneeId)
      })
    })

    it('should return 401 without authentication', async () => {
      const response = await fetch('/api/tasks', {
        method: 'GET',
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('error')
    })
  })

  describe('POST /api/tasks', () => {
    it('should create new task with valid data', async () => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-123',
        },
        body: JSON.stringify(validTaskData),
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toMatchObject({
        id: expect.any(String),
        title: validTaskData.title,
        description: validTaskData.description,
        project_id: validTaskData.project_id,
        milestone_id: validTaskData.milestone_id,
        status: validTaskData.status,
        priority: validTaskData.priority,
        assignee_id: validTaskData.assignee_id,
        estimated_hours: validTaskData.estimated_hours,
        reporter_id: 'user-123',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      })
    })

    it('should create task without optional fields', async () => {
      const minimalTaskData = {
        title: 'Minimal Task',
        project_id: '123e4567-e89b-12d3-a456-426614174000',
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-123',
        },
        body: JSON.stringify(minimalTaskData),
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data.data).toMatchObject({
        title: minimalTaskData.title,
        project_id: minimalTaskData.project_id,
        status: 'todo', // default status
        priority: 'medium', // default priority
        reporter_id: 'user-123',
      })
    })

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing title and project_id',
        status: 'in_progress',
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-123',
        },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('error')
    })

    it('should validate title length', async () => {
      const invalidData = {
        title: 'a'.repeat(301), // Too long
        project_id: '123e4567-e89b-12d3-a456-426614174000',
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-123',
        },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('error')
    })

    it('should validate status enum values', async () => {
      const invalidData = {
        title: 'Invalid Status Task',
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'invalid_status',
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-123',
        },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('error')
    })
  })

  describe('GET /api/tasks/[id]', () => {
    it('should return task details by ID', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000'
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'GET',
        headers: { 'x-user-id': 'user-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('id', taskId)
      expect(data.data).toHaveProperty('title')
      expect(data.data).toHaveProperty('description')
      expect(data.data).toHaveProperty('project_id')
      expect(data.data).toHaveProperty('status')
      expect(data.data).toHaveProperty('priority')
      expect(data.data).toHaveProperty('reporter_id')
    })

    it('should include related data when requested', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000'
      const response = await fetch(`/api/tasks/${taskId}?include=assignee,project,milestone`, {
        method: 'GET',
        headers: { 'x-user-id': 'user-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data.data).toHaveProperty('assignee')
      expect(data.data).toHaveProperty('project')
      expect(data.data).toHaveProperty('milestone')
    })

    it('should return 404 for non-existent task', async () => {
      const nonExistentId = '99999999-9999-9999-9999-999999999999'
      const response = await fetch(`/api/tasks/${nonExistentId}`, {
        method: 'GET',
        headers: { 'x-user-id': 'user-123' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('error')
    })
  })

  describe('PUT /api/tasks/[id]', () => {
    it('should update task with valid data', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000'
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-123',
        },
        body: JSON.stringify(validTaskUpdate),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toMatchObject({
        id: taskId,
        title: validTaskUpdate.title,
        status: validTaskUpdate.status,
        actual_hours: validTaskUpdate.actual_hours,
        updated_at: expect.any(String),
      })
    })

    it('should allow status transitions', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000'
      const statusTransitions = [
        { status: 'in_progress' },
        { status: 'review' },
        { status: 'done' },
      ]

      for (const transition of statusTransitions) {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'user-123',
          },
          body: JSON.stringify(transition),
        })

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.data.status).toBe(transition.status)
      }
    })

    it('should return 404 for non-existent task', async () => {
      const nonExistentId = '99999999-9999-9999-9999-999999999999'
      const response = await fetch(`/api/tasks/${nonExistentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-123',
        },
        body: JSON.stringify(validTaskUpdate),
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('error')
    })
  })

  describe('DELETE /api/tasks/[id]', () => {
    it('should delete existing task', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000'
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': 'user-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
    })

    it('should return 404 for non-existent task', async () => {
      const nonExistentId = '99999999-9999-9999-9999-999999999999'
      const response = await fetch(`/api/tasks/${nonExistentId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': 'user-123' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('error')
    })
  })
})


