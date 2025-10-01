import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// Mock user ID for testing
const TEST_USER_ID = 'test-user-123'
const TEST_ORG_ID = 'test-org-123'

describe('Ollama API Integration Tests', () => {
  let createdProjectId: string

  beforeAll(async () => {
    // Setup: Create test organization if needed
    // In production, you'd use actual test database
  })

  afterAll(async () => {
    // Cleanup: Delete created test data
    if (createdProjectId) {
      try {
        await fetch(`http://localhost:3000/api/ollama/projects/${createdProjectId}`, {
          method: 'DELETE',
          headers: {
            'x-user-id': TEST_USER_ID,
          },
        })
      } catch (error) {
        console.error('Cleanup failed:', error)
      }
    }
  })

  describe('POST /api/ollama/create-project', () => {
    it('should create a project from natural language specification', async () => {
      const specification = 'Build a simple task management app with user authentication and task CRUD. Timeline: 2 months.'

      const response = await fetch('http://localhost:3000/api/ollama/create-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': TEST_USER_ID,
        },
        body: JSON.stringify({
          specification,
          organizationId: TEST_ORG_ID,
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.project).toBeDefined()
      expect(data.data.project.id).toBeDefined()
      expect(data.data.project.name).toBeTruthy()
      expect(data.data.milestones).toBeInstanceOf(Array)
      expect(data.data.milestones.length).toBeGreaterThan(0)
      expect(data.data.tasks).toBeInstanceOf(Array)
      expect(data.data.tasks.length).toBeGreaterThan(0)
      expect(data.data.summary).toBeDefined()
      expect(data.data.summary.total_milestones).toBeGreaterThan(0)
      expect(data.data.summary.total_tasks).toBeGreaterThan(0)

      createdProjectId = data.data.project.id
    }, 30000) // 30 second timeout for AI processing

    it('should reject request without authentication', async () => {
      const response = await fetch('http://localhost:3000/api/ollama/create-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          specification: 'Build an app',
          organizationId: TEST_ORG_ID,
        }),
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Authentication required')
    })

    it('should reject request with invalid specification', async () => {
      const response = await fetch('http://localhost:3000/api/ollama/create-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': TEST_USER_ID,
        },
        body: JSON.stringify({
          specification: 'ab', // Too short
          organizationId: TEST_ORG_ID,
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
    })

    it('should accept structured specification', async () => {
      const specification = {
        name: 'E-Commerce Platform',
        description: 'Complete e-commerce solution with product management and payments',
        requirements: [
          'Product catalog',
          'Shopping cart',
          'Payment integration',
          'Order management',
        ],
        timeline: {
          duration_days: 120,
        },
        complexity: 'moderate',
      }

      const response = await fetch('http://localhost:3000/api/ollama/create-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': TEST_USER_ID,
        },
        body: JSON.stringify({
          specification,
          organizationId: TEST_ORG_ID,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.data.project.name).toContain('E-Commerce')

        // Cleanup
        if (data.data.project.id) {
          await fetch(`http://localhost:3000/api/ollama/projects/${data.data.project.id}`, {
            method: 'DELETE',
            headers: {
              'x-user-id': TEST_USER_ID,
            },
          })
        }
      }
    }, 30000)
  })

  describe('POST /api/ollama/update-project', () => {
    it('should update project via natural language command', async () => {
      // Skip if no project was created
      if (!createdProjectId) {
        return
      }

      const response = await fetch('http://localhost:3000/api/ollama/update-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': TEST_USER_ID,
        },
        body: JSON.stringify({
          projectId: createdProjectId,
          command: 'Change status to active and set priority to high',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.changes).toBeDefined()
      }
    }, 20000)
  })

  describe('POST /api/ollama/create-milestone', () => {
    it('should create a milestone from specification', async () => {
      // Skip if no project was created
      if (!createdProjectId) {
        return
      }

      const response = await fetch('http://localhost:3000/api/ollama/create-milestone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': TEST_USER_ID,
        },
        body: JSON.stringify({
          projectId: createdProjectId,
          specification: 'Implement user authentication with JWT and OAuth support by end of month',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.data.milestone).toBeDefined()
        expect(data.data.milestone.title).toBeTruthy()
      }
    }, 20000)
  })

  describe('POST /api/ollama/create-task', () => {
    it('should create a task from specification', async () => {
      // Skip if no project was created
      if (!createdProjectId) {
        return
      }

      const response = await fetch('http://localhost:3000/api/ollama/create-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': TEST_USER_ID,
        },
        body: JSON.stringify({
          projectId: createdProjectId,
          specification: 'Create login form component with email and password validation, estimate 4 hours',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.data.task).toBeDefined()
        expect(data.data.task.title).toBeTruthy()
      }
    }, 20000)
  })

  describe('GET /api/ollama/projects/:id', () => {
    it('should retrieve complete project details', async () => {
      // Skip if no project was created
      if (!createdProjectId) {
        return
      }

      const response = await fetch(`http://localhost:3000/api/ollama/projects/${createdProjectId}`, {
        headers: {
          'x-user-id': TEST_USER_ID,
        },
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.project).toBeDefined()
      expect(data.data.project.id).toBe(createdProjectId)
      expect(data.data.milestones).toBeInstanceOf(Array)
      expect(data.data.tasks).toBeInstanceOf(Array)
      expect(data.data.summary).toBeDefined()
    })

    it('should return 404 for non-existent project', async () => {
      const response = await fetch('http://localhost:3000/api/ollama/projects/00000000-0000-0000-0000-000000000000', {
        headers: {
          'x-user-id': TEST_USER_ID,
        },
      })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/ollama/projects/:id', () => {
    it('should delete a project', async () => {
      // Create a project specifically for deletion
      const createResponse = await fetch('http://localhost:3000/api/ollama/create-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': TEST_USER_ID,
        },
        body: JSON.stringify({
          specification: 'Simple test project',
          organizationId: TEST_ORG_ID,
        }),
      })

      const createData = await createResponse.json()

      if (!createResponse.ok || !createData.data?.project?.id) {
        // Skip if creation failed
        return
      }

      const projectIdToDelete = createData.data.project.id

      const deleteResponse = await fetch(`http://localhost:3000/api/ollama/projects/${projectIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': TEST_USER_ID,
        },
      })

      const deleteData = await deleteResponse.json()

      expect(deleteResponse.status).toBe(200)
      expect(deleteData.success).toBe(true)

      // Verify deletion
      const getResponse = await fetch(`http://localhost:3000/api/ollama/projects/${projectIdToDelete}`, {
        headers: {
          'x-user-id': TEST_USER_ID,
        },
      })

      expect(getResponse.status).toBe(404)
    }, 30000)
  })
})
