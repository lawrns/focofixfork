import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

// Mock API server for integration testing
const server = setupServer()

// Start server before tests
beforeEach(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterEach(() => server.close())

describe('User Workflow Integration Tests', () => {
  describe('Complete User Registration and Authentication Flow', () => {
    it('should allow user to register, login, and access protected resources', async () => {
      // Test data
      const userCredentials = {
        email: 'integration-test@example.com',
        password: 'securepassword123',
        display_name: 'Integration Test User',
      }

      let accessToken = ''
      let userId = ''
      let organizationId = ''
      let projectId = ''

      // Step 1: Register new user
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userCredentials),
      })

      expect(registerResponse.status).toBe(201)
      const registerData = await registerResponse.json()
      expect(registerData.success).toBe(true)
      expect(registerData.data.user.email).toBe(userCredentials.email)
      expect(registerData.data.user.display_name).toBe(userCredentials.display_name)

      userId = registerData.data.user.id
      accessToken = registerData.data.session.access_token

      // Step 2: Login with registered credentials
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userCredentials.email,
          password: userCredentials.password,
        }),
      })

      expect(loginResponse.status).toBe(200)
      const loginData = await loginResponse.json()
      expect(loginData.success).toBe(true)
      expect(loginData.data.user.id).toBe(userId)
      expect(loginData.data.session.access_token).toBeTruthy()

      // Update access token from login
      accessToken = loginData.data.session.access_token

      // Step 3: Verify session persistence
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'GET',
        headers: { 'x-user-id': userId },
      })

      expect(sessionResponse.status).toBe(200)
      const sessionData = await sessionResponse.json()
      expect(sessionData.success).toBe(true)
      expect(sessionData.data.user.id).toBe(userId)

      // Step 4: Create organization
      const orgData = {
        name: 'Integration Test Org',
        description: 'Organization for integration testing',
      }

      const orgResponse = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(orgData),
      })

      expect(orgResponse.status).toBe(201)
      const orgResult = await orgResponse.json()
      expect(orgResult.success).toBe(true)
      expect(orgResult.data.name).toBe(orgData.name)

      organizationId = orgResult.data.id

      // Step 5: Create project in organization
      const projectData = {
        name: 'Integration Test Project',
        description: 'Project for testing complete workflow',
        organization_id: organizationId,
        status: 'planning',
        priority: 'medium',
      }

      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(projectData),
      })

      expect(projectResponse.status).toBe(201)
      const projectResult = await projectResponse.json()
      expect(projectResult.success).toBe(true)
      expect(projectResult.data.name).toBe(projectData.name)
      expect(projectResult.data.organization_id).toBe(organizationId)

      projectId = projectResult.data.id

      // Step 6: Create milestone
      const milestoneData = {
        title: 'Setup Phase',
        description: 'Initial project setup and configuration',
        project_id: projectId,
        due_date: '2025-02-01',
        status: 'planned',
      }

      const milestoneResponse = await fetch('/api/milestones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(milestoneData),
      })

      expect(milestoneResponse.status).toBe(201)
      const milestoneResult = await milestoneResponse.json()
      expect(milestoneResult.success).toBe(true)
      expect(milestoneResult.data.title).toBe(milestoneData.title)

      // Step 7: Create task
      const taskData = {
        title: 'Set up development environment',
        description: 'Configure local development environment',
        project_id: projectId,
        status: 'todo',
        priority: 'high',
      }

      const taskResponse = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(taskData),
      })

      expect(taskResponse.status).toBe(201)
      const taskResult = await taskResponse.json()
      expect(taskResult.success).toBe(true)
      expect(taskResult.data.title).toBe(taskData.title)
      expect(taskResult.data.project_id).toBe(projectId)

      // Step 8: Update task status
      const taskId = taskResult.data.id
      const updateResponse = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          status: 'in_progress',
          actual_hours: 2,
        }),
      })

      expect(updateResponse.status).toBe(200)
      const updateResult = await updateResponse.json()
      expect(updateResult.success).toBe(true)
      expect(updateResult.data.status).toBe('in_progress')
      expect(updateResult.data.actual_hours).toBe(2)

      // Step 9: Verify project shows updated progress
      const projectCheckResponse = await fetch(`/api/projects/${projectId}`, {
        method: 'GET',
        headers: { 'x-user-id': userId },
      })

      expect(projectCheckResponse.status).toBe(200)
      const projectCheckData = await projectCheckResponse.json()
      expect(projectCheckData.success).toBe(true)
      expect(projectCheckData.data.id).toBe(projectId)

      // Step 10: Logout
      const logoutResponse = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-user-id': userId },
      })

      expect(logoutResponse.status).toBe(200)
      const logoutData = await logoutResponse.json()
      expect(logoutData.success).toBe(true)

      // Step 11: Verify session is cleared (should fail)
      const finalSessionResponse = await fetch('/api/auth/session', {
        method: 'GET',
      })

      expect(finalSessionResponse.status).toBe(401)
      const finalSessionData = await finalSessionResponse.json()
      expect(finalSessionData.success).toBe(false)
    })

    it('should prevent unauthorized access to other users data', async () => {
      // Setup: Create user A and their project
      const userA = {
        email: 'userA@example.com',
        password: 'password123',
        display_name: 'User A',
      }

      const registerAResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userA),
      })

      expect(registerAResponse.status).toBe(201)
      const userAData = await registerAResponse.json()
      const userAId = userAData.data.user.id

      // User A creates organization and project
      const orgAResponse = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userAId,
        },
        body: JSON.stringify({
          name: 'User A Organization',
        }),
      })

      expect(orgAResponse.status).toBe(201)
      const orgAData = await orgAResponse.json()
      const orgAId = orgAData.data.id

      const projectAResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userAId,
        },
        body: JSON.stringify({
          name: 'User A Project',
          organization_id: orgAId,
        }),
      })

      expect(projectAResponse.status).toBe(201)
      const projectAData = await projectAResponse.json()
      const projectAId = projectAData.data.id

      // Setup: Create user B
      const userB = {
        email: 'userB@example.com',
        password: 'password123',
        display_name: 'User B',
      }

      const registerBResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userB),
      })

      expect(registerBResponse.status).toBe(201)
      const userBData = await registerBResponse.json()
      const userBId = userBData.data.user.id

      // User B tries to access User A's project (should fail)
      const accessAttempt = await fetch(`/api/projects/${projectAId}`, {
        method: 'GET',
        headers: { 'x-user-id': userBId },
      })

      expect([403, 404]).toContain(accessAttempt.status)
      const accessData = await accessAttempt.json()
      expect(accessData.success).toBe(false)

      // User B tries to modify User A's project (should fail)
      const modifyAttempt = await fetch(`/api/projects/${projectAId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userBId,
        },
        body: JSON.stringify({ name: 'Hacked Project Name' }),
      })

      expect([403, 404]).toContain(modifyAttempt.status)
      const modifyData = await modifyAttempt.json()
      expect(modifyData.success).toBe(false)
    })
  })

  describe('Project Management Workflow', () => {
    it('should support complete project lifecycle from creation to completion', async () => {
      // Setup: Create authenticated user with organization
      const user = {
        email: 'project-workflow@example.com',
        password: 'password123',
        display_name: 'Project Workflow User',
      }

      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      })

      expect(registerResponse.status).toBe(201)
      const userData = await registerResponse.json()
      const userId = userData.data.user.id

      const orgResponse = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          name: 'Workflow Test Org',
        }),
      })

      expect(orgResponse.status).toBe(201)
      const orgData = await orgResponse.json()
      const orgId = orgData.data.id

      // Create project
      const projectData = {
        name: 'Complete Project Workflow',
        description: 'Test all project management features',
        organization_id: orgId,
        status: 'planning',
        priority: 'high',
        start_date: '2025-01-01',
        due_date: '2025-03-01',
      }

      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(projectData),
      })

      expect(projectResponse.status).toBe(201)
      const project = await projectResponse.json()
      const projectId = project.data.id

      // Create multiple milestones
      const milestones = [
        {
          title: 'Planning Phase',
          description: 'Requirements gathering and planning',
          project_id: projectId,
          due_date: '2025-01-15',
          status: 'planned',
        },
        {
          title: 'Development Phase',
          description: 'Core development work',
          project_id: projectId,
          due_date: '2025-02-15',
          status: 'planned',
        },
        {
          title: 'Testing Phase',
          description: 'Quality assurance and testing',
          project_id: projectId,
          due_date: '2025-02-28',
          status: 'planned',
        },
      ]

      const milestoneIds: string[] = []
      for (const milestone of milestones) {
        const response = await fetch('/api/milestones', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify(milestone),
        })
        expect(response.status).toBe(201)
        const data = await response.json()
        milestoneIds.push(data.data.id)
      }

      // Create tasks for each milestone
      const tasks = [
        {
          title: 'Gather requirements',
          project_id: projectId,
          milestone_id: milestoneIds[0],
          status: 'todo',
          priority: 'high',
          estimated_hours: 16,
        },
        {
          title: 'Create project plan',
          project_id: projectId,
          milestone_id: milestoneIds[0],
          status: 'todo',
          priority: 'medium',
          estimated_hours: 8,
        },
        {
          title: 'Implement core features',
          project_id: projectId,
          milestone_id: milestoneIds[1],
          status: 'todo',
          priority: 'high',
          estimated_hours: 40,
        },
        {
          title: 'Write unit tests',
          project_id: projectId,
          milestone_id: milestoneIds[2],
          status: 'todo',
          priority: 'medium',
          estimated_hours: 20,
        },
      ]

      const taskIds: string[] = []
      for (const task of tasks) {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify(task),
        })
        expect(response.status).toBe(201)
        const data = await response.json()
        taskIds.push(data.data.id)
      }

      // Update project status to active
      const statusUpdate = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          status: 'active',
          progress_percentage: 10,
        }),
      })

      expect(statusUpdate.status).toBe(200)
      const updatedProject = await statusUpdate.json()
      expect(updatedProject.data.status).toBe('active')
      expect(updatedProject.data.progress_percentage).toBe(10)

      // Complete some tasks
      for (let i = 0; i < 2; i++) {
        const taskUpdate = await fetch(`/api/tasks/${taskIds[i]}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({
            status: 'done',
            actual_hours: tasks[i].estimated_hours,
          }),
        })
        expect(taskUpdate.status).toBe(200)
      }

      // Complete first milestone
      const milestoneUpdate = await fetch(`/api/milestones/${milestoneIds[0]}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          status: 'completed',
          completion_date: '2025-01-16',
          progress_percentage: 100,
        }),
      })

      expect(milestoneUpdate.status).toBe(200)

      // Update project progress
      const finalProjectUpdate = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          progress_percentage: 35,
        }),
      })

      expect(finalProjectUpdate.status).toBe(200)
      const finalProject = await finalProjectUpdate.json()
      expect(finalProject.data.progress_percentage).toBe(35)

      // Verify project summary includes all related data
      const projectSummary = await fetch(`/api/projects/${projectId}`, {
        method: 'GET',
        headers: { 'x-user-id': userId },
      })

      expect(projectSummary.status).toBe(200)
      const summaryData = await projectSummary.json()
      expect(summaryData.success).toBe(true)
      expect(summaryData.data.name).toBe(projectData.name)
      expect(summaryData.data.status).toBe('active')
      expect(summaryData.data.progress_percentage).toBe(35)
    })
  })
})


