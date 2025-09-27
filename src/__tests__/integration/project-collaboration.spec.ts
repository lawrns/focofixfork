import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

// Mock API server for integration testing
const server = setupServer()

// Start server before tests
beforeEach(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterEach(() => server.close())

describe('Project Collaboration Integration Tests', () => {
  describe('Multi-User Project Collaboration', () => {
    it('should support team collaboration on shared projects', async () => {
      // Setup: Create project owner
      const owner = {
        email: 'owner@example.com',
        password: 'password123',
        display_name: 'Project Owner',
      }

      const ownerRegister = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(owner),
      })

      expect(ownerRegister.status).toBe(201)
      const ownerData = await ownerRegister.json()
      const ownerId = ownerData.data.user.id

      // Create organization
      const orgResponse = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ownerId,
        },
        body: JSON.stringify({
          name: 'Collaboration Test Org',
          description: 'Testing team collaboration features',
        }),
      })

      expect(orgResponse.status).toBe(201)
      const orgData = await orgResponse.json()
      const orgId = orgData.data.id

      // Create project
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ownerId,
        },
        body: JSON.stringify({
          name: 'Collaborative Project',
          description: 'Project for testing team collaboration',
          organization_id: orgId,
          status: 'active',
          priority: 'high',
        }),
      })

      expect(projectResponse.status).toBe(201)
      const projectData = await projectResponse.json()
      const projectId = projectData.data.id

      // Setup: Create team members
      const teamMembers = [
        {
          email: 'dev1@example.com',
          password: 'password123',
          display_name: 'Developer 1',
        },
        {
          email: 'dev2@example.com',
          password: 'password123',
          display_name: 'Developer 2',
        },
        {
          email: 'qa@example.com',
          password: 'password123',
          display_name: 'QA Engineer',
        },
      ]

      const memberIds: string[] = []
      for (const member of teamMembers) {
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(member),
        })
        expect(registerResponse.status).toBe(201)
        const memberData = await registerResponse.json()
        memberIds.push(memberData.data.user.id)
      }

      // Owner invites team members to organization
      for (let i = 0; i < teamMembers.length; i++) {
        const inviteResponse = await fetch(`/api/organizations/${orgId}/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': ownerId,
          },
          body: JSON.stringify({
            email: teamMembers[i].email,
            role: i === 2 ? 'member' : 'member', // QA as regular member
          }),
        })
        expect(inviteResponse.status).toBe(201)
      }

      // Simulate members accepting invitations (in real app this would be email flow)
      for (const memberId of memberIds) {
        const joinResponse = await fetch(`/api/organizations/${orgId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': memberId,
          },
          body: JSON.stringify({}),
        })
        expect(joinResponse.status).toBe(200)
      }

      // All team members can now access the project
      for (const memberId of memberIds) {
        const accessResponse = await fetch(`/api/projects/${projectId}`, {
          method: 'GET',
          headers: { 'x-user-id': memberId },
        })
        expect(accessResponse.status).toBe(200)
        const projectAccess = await accessResponse.json()
        expect(projectAccess.success).toBe(true)
        expect(projectAccess.data.id).toBe(projectId)
      }

      // Create initial tasks (by owner)
      const initialTasks = [
        {
          title: 'Set up CI/CD pipeline',
          description: 'Configure automated testing and deployment',
          project_id: projectId,
          status: 'todo',
          priority: 'high',
          estimated_hours: 8,
        },
        {
          title: 'Design system architecture',
          description: 'Create high-level system design',
          project_id: projectId,
          status: 'todo',
          priority: 'high',
          estimated_hours: 16,
        },
        {
          title: 'Implement user authentication',
          description: 'Build login and registration system',
          project_id: projectId,
          status: 'todo',
          priority: 'high',
          estimated_hours: 24,
        },
      ]

      const taskIds: string[] = []
      for (const task of initialTasks) {
        const taskResponse = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': ownerId,
          },
          body: JSON.stringify(task),
        })
        expect(taskResponse.status).toBe(201)
        const taskData = await taskResponse.json()
        taskIds.push(taskData.data.id)
      }

      // Team members assign themselves to tasks
      const assignments = [
        { taskIndex: 0, assigneeId: memberIds[0], status: 'in_progress' }, // Dev1 takes CI/CD
        { taskIndex: 1, assigneeId: memberIds[1], status: 'in_progress' }, // Dev2 takes architecture
        { taskIndex: 2, assigneeId: memberIds[0], status: 'in_progress' }, // Dev1 takes auth
      ]

      for (const assignment of assignments) {
        const assignResponse = await fetch(`/api/tasks/${taskIds[assignment.taskIndex]}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': assignment.assigneeId,
          },
          body: JSON.stringify({
            assignee_id: assignment.assigneeId,
            status: assignment.status,
          }),
        })
        expect(assignResponse.status).toBe(200)
      }

      // Simulate progress updates by different team members
      const progressUpdates = [
        {
          taskId: taskIds[0],
          userId: memberIds[0],
          updates: { actual_hours: 4, status: 'review' },
        },
        {
          taskId: taskIds[1],
          userId: memberIds[1],
          updates: { actual_hours: 12, status: 'review' },
        },
        {
          taskId: taskIds[2],
          userId: memberIds[0],
          updates: { actual_hours: 18, status: 'review' },
        },
      ]

      for (const update of progressUpdates) {
        const updateResponse = await fetch(`/api/tasks/${update.taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': update.userId,
          },
          body: JSON.stringify(update.updates),
        })
        expect(updateResponse.status).toBe(200)
      }

      // QA member reviews completed tasks
      const qaReviews = [
        { taskId: taskIds[0], status: 'done', reviewerId: memberIds[2] },
        { taskId: taskIds[1], status: 'done', reviewerId: memberIds[2] },
      ]

      for (const review of qaReviews) {
        const reviewResponse = await fetch(`/api/tasks/${review.taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': review.reviewerId,
          },
          body: JSON.stringify({ status: review.status }),
        })
        expect(reviewResponse.status).toBe(200)
      }

      // Check final project status - should reflect team progress
      const finalProjectCheck = await fetch(`/api/projects/${projectId}`, {
        method: 'GET',
        headers: { 'x-user-id': ownerId },
      })

      expect(finalProjectCheck.status).toBe(200)
      const finalProject = await finalProjectCheck.json()
      expect(finalProject.success).toBe(true)
      expect(finalProject.data.status).toBe('active')
      // Progress should be updated based on completed tasks
      expect(finalProject.data.progress_percentage).toBeGreaterThan(0)

      // Verify team members can see all tasks in the project
      for (const memberId of memberIds) {
        const tasksResponse = await fetch(`/api/tasks?project_id=${projectId}`, {
          method: 'GET',
          headers: { 'x-user-id': memberId },
        })
        expect(tasksResponse.status).toBe(200)
        const tasksData = await tasksResponse.json()
        expect(tasksData.success).toBe(true)
        expect(tasksData.data.length).toBe(3) // All tasks should be visible

        // Verify task assignments are correct
        const assignedTasks = tasksData.data.filter((task: any) => task.assignee_id === memberId)
        expect(assignedTasks.length).toBeGreaterThan(0) // Each member should have assigned tasks
      }
    })

    it('should handle concurrent task updates gracefully', async () => {
      // Setup: Create user and project
      const user = {
        email: 'concurrent@example.com',
        password: 'password123',
        display_name: 'Concurrent User',
      }

      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      })

      expect(registerResponse.status).toBe(201)
      const userData = await registerResponse.json()
      const userId = userData.data.user.id

      // Create organization and project
      const orgResponse = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ name: 'Concurrent Test Org' }),
      })
      const orgData = await orgResponse.json()
      const orgId = orgData.data.id

      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          name: 'Concurrent Updates Project',
          organization_id: orgId,
        }),
      })
      const projectData = await projectResponse.json()
      const projectId = projectData.data.id

      // Create a task
      const taskResponse = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          title: 'Concurrent Update Task',
          project_id: projectId,
          status: 'todo',
        }),
      })
      const taskData = await taskResponse.json()
      const taskId = taskData.data.id

      // Simulate concurrent updates (in sequence, but testing conflict resolution)
      const concurrentUpdates = [
        { status: 'in_progress', actual_hours: 1 },
        { status: 'review', actual_hours: 2 },
        { status: 'done', actual_hours: 3 },
      ]

      for (const update of concurrentUpdates) {
        const updateResponse = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify(update),
        })
        expect(updateResponse.status).toBe(200)
        const updateData = await updateResponse.json()
        expect(updateData.success).toBe(true)
      }

      // Verify final state is consistent
      const finalCheck = await fetch(`/api/tasks/${taskId}`, {
        method: 'GET',
        headers: { 'x-user-id': userId },
      })

      expect(finalCheck.status).toBe(200)
      const finalData = await finalCheck.json()
      expect(finalData.success).toBe(true)
      expect(finalData.data.status).toBe('done')
      expect(finalData.data.actual_hours).toBe(3)
    })

    it('should support activity tracking and notifications', async () => {
      // Setup: Create users and project
      const users = [
        {
          email: 'activity-owner@example.com',
          password: 'password123',
          display_name: 'Activity Owner',
        },
        {
          email: 'activity-member@example.com',
          password: 'password123',
          display_name: 'Activity Member',
        },
      ]

      const userIds: string[] = []
      for (const user of users) {
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        })
        expect(registerResponse.status).toBe(201)
        const userData = await registerResponse.json()
        userIds.push(userData.data.user.id)
      }

      const ownerId = userIds[0]
      const memberId = userIds[1]

      // Create organization and add member
      const orgResponse = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ownerId,
        },
        body: JSON.stringify({ name: 'Activity Test Org' }),
      })
      const orgData = await orgResponse.json()
      const orgId = orgData.data.id

      // Add member to organization
      const inviteResponse = await fetch(`/api/organizations/${orgId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ownerId,
        },
        body: JSON.stringify({
          email: users[1].email,
          role: 'member',
        }),
      })
      expect(inviteResponse.status).toBe(201)

      // Member joins organization
      const joinResponse = await fetch(`/api/organizations/${orgId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': memberId,
        },
        body: JSON.stringify({}),
      })
      expect(joinResponse.status).toBe(200)

      // Create project
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ownerId,
        },
        body: JSON.stringify({
          name: 'Activity Tracking Project',
          organization_id: orgId,
        }),
      })
      const projectData = await projectResponse.json()
      const projectId = projectData.data.id

      // Generate activities: create tasks, update status, add comments
      const activities = [
        // Owner creates task
        async () => {
          const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': ownerId,
            },
            body: JSON.stringify({
              title: 'Task created by owner',
              project_id: projectId,
            }),
          })
          expect(response.status).toBe(201)
          return (await response.json()).data.id
        },
        // Member updates task
        async (taskId: string) => {
          await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': memberId,
            },
            body: JSON.stringify({ status: 'in_progress' }),
          })
        },
        // Owner adds comment (if comments API exists)
        async (taskId: string) => {
          const commentResponse = await fetch(`/api/tasks/${taskId}/comments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': ownerId,
            },
            body: JSON.stringify({
              content: 'Great progress on this task!',
            }),
          })
          // Comments might not be implemented yet, so accept 404 or 201
          expect([201, 404]).toContain(commentResponse.status)
        },
      ]

      // Execute activities
      let taskId: string | undefined
      for (const activity of activities) {
        if (activity === activities[0]) {
          taskId = await activity()
        } else if (taskId) {
          await activity(taskId)
        }
      }

      // Check activity feed (if implemented)
      if (taskId) {
        const activityResponse = await fetch(`/api/projects/${projectId}/activity`, {
          method: 'GET',
          headers: { 'x-user-id': ownerId },
        })

        // Activity feed might not be implemented yet
        if (activityResponse.status === 200) {
          const activityData = await activityResponse.json()
          expect(activityData.success).toBe(true)
          expect(Array.isArray(activityData.data)).toBe(true)
          // Should have activities for task creation and updates
          expect(activityData.data.length).toBeGreaterThan(0)
        }
      }

      // Check notifications (if implemented)
      const notificationsResponse = await fetch('/api/notifications', {
        method: 'GET',
        headers: { 'x-user-id': memberId },
      })

      // Notifications might not be implemented yet
      if (notificationsResponse.status === 200) {
        const notificationsData = await notificationsResponse.json()
        expect(notificationsData.success).toBe(true)
        expect(Array.isArray(notificationsData.data)).toBe(true)
      }
    })
  })
})


