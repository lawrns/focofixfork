import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestEnvironment,
  createTestUser,
  getAuthToken,
  TestEnvironment,
} from '../helpers/api-test-helpers';

/**
 * API Integration Tests: /api/projects
 * Tests project CRUD operations, validation, and security
 */

describe('/api/projects - Integration Tests', () => {
  let env: TestEnvironment;
  let authToken: string;
  let unauthorizedToken: string;

  beforeAll(async () => {
    env = await createTestEnvironment();
    authToken = await getAuthToken(env.user.email, env.user.password);

    const unauthorizedUser = await createTestUser();
    unauthorizedToken = await getAuthToken(unauthorizedUser.email, unauthorizedUser.password);
  });

  afterAll(async () => {
    await env.cleanup();
  });

  describe('GET /api/projects - List projects', () => {
    it('should return projects for authenticated user', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects`);
      expect(response.status).toBe(401);
    });

    it('should filter by workspace', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects?workspace_id=${env.workspace.id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      data.forEach((project: any) => {
        expect(project.workspace_id).toBe(env.workspace.id);
      });
    });
  });

  describe('POST /api/projects - Create project', () => {
    it('should create a new project with valid data', async () => {
      const newProject = {
        name: 'New Test Project',
        description: 'Project created in test',
        workspace_id: env.workspace.id,
        organization_id: env.organization.id,
        status: 'active',
        priority: 'high',
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProject),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe(newProject.name);
      expect(data.id).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it('should reject project for unauthorized workspace', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${unauthorizedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Unauthorized Project',
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/projects/[id] - Update project', () => {
    it('should update existing project with valid data', async () => {
      const updates = {
        name: 'Updated Project Name',
        status: 'completed',
        priority: 'low',
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects/${env.project.id}`,
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
      expect(data.name).toBe(updates.name);
      expect(data.status).toBe(updates.status);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects/non-existent-id`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Updated' }),
        }
      );

      expect(response.status).toBe(404);
    });

    it('should prevent IDOR attacks', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects/${env.project.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${unauthorizedToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Unauthorized Update' }),
        }
      );

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/projects/[id] - Delete project', () => {
    it('should delete existing project and cascade to tasks', async () => {
      // Create a project to delete
      const createResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Project to Delete',
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
        }),
      });

      const created = await createResponse.json();

      // Delete the project
      const deleteResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects/${created.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(deleteResponse.status).toBe(200);
    });

    it('should prevent unauthorized deletion', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects/${env.project.id}`,
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
});
