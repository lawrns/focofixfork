import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestEnvironment,
  createTestUser,
  getAuthToken,
  testInputValidation,
  sqlInjectionPayloads,
  xssPayloads,
  TestEnvironment,
} from '../helpers/api-test-helpers';
import { INVALID_TASK_INPUTS, PERFORMANCE_BENCHMARKS } from '../fixtures/test-data';

/**
 * API Integration Tests: /api/tasks
 * Tests all CRUD operations, validation, security, and performance
 */

describe('/api/tasks - Integration Tests', () => {
  let env: TestEnvironment;
  let authToken: string;
  let unauthorizedToken: string;

  beforeAll(async () => {
    // Create main test environment
    env = await createTestEnvironment();
    authToken = await getAuthToken(env.user.email, env.user.password);

    // Create unauthorized user for security tests
    const unauthorizedUser = await createTestUser();
    unauthorizedToken = await getAuthToken(unauthorizedUser.email, unauthorizedUser.password);
  });

  afterAll(async () => {
    await env.cleanup();
  });

  describe('GET /api/tasks - List tasks', () => {
    it('should return tasks for authenticated user', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks`);
      expect(response.status).toBe(401);
    });

    it('should filter tasks by workspace isolation', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks?workspace_id=${env.workspace.id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      data.forEach((task: any) => {
        expect(task.workspace_id).toBe(env.workspace.id);
      });
    });

    it('should support pagination', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks?limit=5&offset=0`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.length).toBeLessThanOrEqual(5);
    });

    it('should respond within performance threshold', async () => {
      const start = performance.now();
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.api.acceptable);
    });
  });

  describe('POST /api/tasks - Create task', () => {
    it('should create a new task with valid data', async () => {
      const newTask = {
        title: 'New Test Task',
        description: 'Task created in test',
        project_id: env.project.id,
        workspace_id: env.workspace.id,
        organization_id: env.organization.id,
        status: 'todo',
        priority: 'high',
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.title).toBe(newTask.title);
      expect(data.id).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it('should sanitize SQL injection attempts', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: payload,
            description: 'Test',
            project_id: env.project.id,
            workspace_id: env.workspace.id,
            organization_id: env.organization.id,
          }),
        });

        // Should either reject (400) or sanitize the input
        if (response.status === 201) {
          const data = await response.json();
          expect(data.title).not.toContain('DROP TABLE');
          expect(data.title).not.toContain('UNION SELECT');
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    it('should sanitize XSS attempts', async () => {
      for (const payload of xssPayloads) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: payload,
            description: 'Test',
            project_id: env.project.id,
            workspace_id: env.workspace.id,
            organization_id: env.organization.id,
          }),
        });

        // Should either reject or sanitize
        if (response.status === 201) {
          const data = await response.json();
          expect(data.title).not.toContain('<script>');
          expect(data.title).not.toContain('onerror=');
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    it('should reject tasks for unauthorized workspace', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${unauthorizedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Unauthorized Task',
          workspace_id: env.workspace.id, // Different user's workspace
          organization_id: env.organization.id,
          project_id: env.project.id,
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/tasks/[id] - Update task', () => {
    it('should update existing task with valid data', async () => {
      const updates = {
        title: 'Updated Task Title',
        status: 'in_progress',
        priority: 'low',
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks/${env.task.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe(updates.title);
      expect(data.status).toBe(updates.status);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks/non-existent-id`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: 'Updated' }),
        }
      );

      expect(response.status).toBe(404);
    });

    it('should prevent IDOR attacks', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks/${env.task.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${unauthorizedToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: 'Unauthorized Update' }),
        }
      );

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/tasks/[id] - Delete task', () => {
    it('should delete existing task', async () => {
      // Create a task to delete
      const createResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Task to Delete',
          project_id: env.project.id,
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
        }),
      });

      const created = await createResponse.json();

      // Delete the task
      const deleteResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks/${created.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(deleteResponse.status).toBe(200);

      // Verify deletion
      const getResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks/${created.id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks/non-existent-id`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(404);
    });

    it('should prevent unauthorized deletion', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks/${env.task.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${unauthorizedToken}`,
          },
        }
      );

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array.from({ length: 150 }, () =>
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    }, 30000); // Longer timeout for rate limit test
  });

  describe('Batch Operations', () => {
    it('should handle batch task creation', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        title: `Batch Task ${i + 1}`,
        project_id: env.project.id,
        workspace_id: env.workspace.id,
        organization_id: env.organization.id,
      }));

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks/batch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.length).toBe(10);
    });

    it('should rollback batch operation on partial failure', async () => {
      const tasks = [
        {
          title: 'Valid Task 1',
          project_id: env.project.id,
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
        },
        {
          // Invalid task - missing required fields
          title: 'Invalid Task',
        },
      ];

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks/batch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks }),
      });

      expect(response.status).toBe(400);
    });
  });
});
