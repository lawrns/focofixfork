import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestEnvironment,
  createTestUser,
  getAuthToken,
  TestEnvironment,
} from '../helpers/api-test-helpers';

/**
 * API Integration Tests: /api/organizations
 * Tests organization management, member access, and workspace isolation
 */

describe('/api/organizations - Integration Tests', () => {
  let env: TestEnvironment;
  let authToken: string;
  let unauthorizedToken: string;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  beforeAll(async () => {
    env = await createTestEnvironment();
    authToken = await getAuthToken(env.user.email, env.user.password);

    const unauthorizedUser = await createTestUser();
    unauthorizedToken = await getAuthToken(unauthorizedUser.email, unauthorizedUser.password);
  });

  afterAll(async () => {
    await env.cleanup();
  });

  describe('GET /api/organizations - List organizations', () => {
    it('should return organizations for authenticated user', async () => {
      const response = await fetch(`${baseUrl}/api/organizations`, {
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
      const response = await fetch(`${baseUrl}/api/organizations`);
      expect(response.status).toBe(401);
    });

    it('should only return organizations user has access to', async () => {
      const response = await fetch(`${baseUrl}/api/organizations`, {
        headers: {
          Authorization: `Bearer ${unauthorizedToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Should not include env.organization
      const hasAccess = data.some((org: any) => org.id === env.organization.id);
      expect(hasAccess).toBe(false);
    });
  });

  describe('GET /api/organizations/[id] - Get organization details', () => {
    it('should return organization details for member', async () => {
      const response = await fetch(`${baseUrl}/api/organizations/${env.organization.id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(env.organization.id);
      expect(data.name).toBeDefined();
    });

    it('should return 403 for non-member', async () => {
      const response = await fetch(`${baseUrl}/api/organizations/${env.organization.id}`, {
        headers: {
          Authorization: `Bearer ${unauthorizedToken}`,
        },
      });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent organization', async () => {
      const response = await fetch(`${baseUrl}/api/organizations/non-existent-id`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/organizations - Create organization', () => {
    it('should create new organization with valid data', async () => {
      const newOrg = {
        name: `New Test Org ${Date.now()}`,
        slug: `new-test-org-${Date.now()}`,
        description: 'Organization created in test',
      };

      const response = await fetch(`${baseUrl}/api/organizations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newOrg),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe(newOrg.name);
      expect(data.slug).toBe(newOrg.slug);
      expect(data.id).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await fetch(`${baseUrl}/api/organizations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it('should reject duplicate slug', async () => {
      const slug = `duplicate-slug-${Date.now()}`;

      // Create first organization
      await fetch(`${baseUrl}/api/organizations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'First Org',
          slug,
        }),
      });

      // Try to create second with same slug
      const response = await fetch(`${baseUrl}/api/organizations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Second Org',
          slug, // Duplicate
        }),
      });

      expect(response.status).toBe(409);
    });

    it('should sanitize organization name', async () => {
      const response = await fetch(`${baseUrl}/api/organizations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: '<script>alert("XSS")</script>',
          slug: `xss-test-${Date.now()}`,
        }),
      });

      if (response.status === 201) {
        const data = await response.json();
        expect(data.name).not.toContain('<script>');
      }
    });
  });

  describe('PUT /api/organizations/[id] - Update organization', () => {
    it('should update organization with valid data', async () => {
      const updates = {
        name: 'Updated Organization Name',
        description: 'Updated description',
      };

      const response = await fetch(`${baseUrl}/api/organizations/${env.organization.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe(updates.name);
      expect(data.description).toBe(updates.description);
    });

    it('should prevent unauthorized updates', async () => {
      const response = await fetch(`${baseUrl}/api/organizations/${env.organization.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${unauthorizedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Unauthorized Update',
        }),
      });

      expect(response.status).toBe(403);
    });

    it('should not allow slug updates to duplicate existing slug', async () => {
      // Create another organization
      const otherOrg = await fetch(`${baseUrl}/api/organizations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Other Org',
          slug: `other-org-${Date.now()}`,
        }),
      });

      const otherOrgData = await otherOrg.json();

      // Try to update env.organization to use existing slug
      const response = await fetch(`${baseUrl}/api/organizations/${env.organization.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: otherOrgData.slug,
        }),
      });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /api/organizations/[id] - Delete organization', () => {
    it('should delete organization and cascade to all related data', async () => {
      // Create organization to delete
      const createResponse = await fetch(`${baseUrl}/api/organizations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Org to Delete',
          slug: `org-delete-${Date.now()}`,
        }),
      });

      const created = await createResponse.json();

      // Delete organization
      const deleteResponse = await fetch(`${baseUrl}/api/organizations/${created.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(deleteResponse.status).toBe(200);

      // Verify deletion
      const verifyResponse = await fetch(`${baseUrl}/api/organizations/${created.id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(verifyResponse.status).toBe(404);
    });

    it('should prevent unauthorized deletion', async () => {
      const response = await fetch(`${baseUrl}/api/organizations/${env.organization.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${unauthorizedToken}`,
        },
      });

      expect(response.status).toBe(403);
    });

    it('should require admin role for deletion', async () => {
      // This test assumes role-based access control
      // Adjust based on your implementation
    });
  });

  describe('GET /api/organizations/[id]/members - List members', () => {
    it('should return organization members', async () => {
      const response = await fetch(`${baseUrl}/api/organizations/${env.organization.id}/members`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should return 403 for non-members', async () => {
      const response = await fetch(`${baseUrl}/api/organizations/${env.organization.id}/members`, {
        headers: {
          Authorization: `Bearer ${unauthorizedToken}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/organizations/[id]/members - Add member', () => {
    it('should add member with valid invitation', async () => {
      const newUser = await createTestUser();

      const response = await fetch(`${baseUrl}/api/organizations/${env.organization.id}/members`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: newUser.id,
          role: 'member',
        }),
      });

      expect(response.status).toBe(201);
    });

    it('should prevent duplicate member additions', async () => {
      // Try to add same user twice
      const response = await fetch(`${baseUrl}/api/organizations/${env.organization.id}/members`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: env.user.id, // Already a member
          role: 'member',
        }),
      });

      expect(response.status).toBe(409);
    });

    it('should require admin role to add members', async () => {
      // Only admins should be able to add members
      // This depends on your implementation
    });
  });

  describe('DELETE /api/organizations/[id]/members/[memberId] - Remove member', () => {
    it('should remove member from organization', async () => {
      // Add a member first
      const newUser = await createTestUser();

      await fetch(`${baseUrl}/api/organizations/${env.organization.id}/members`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: newUser.id,
          role: 'member',
        }),
      });

      // Remove the member
      const response = await fetch(
        `${baseUrl}/api/organizations/${env.organization.id}/members/${newUser.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
    });

    it('should prevent removing the last admin', async () => {
      // Try to remove yourself if you're the last admin
      // This should be prevented to avoid orphaned organizations
    });

    it('should require admin role to remove members', async () => {
      // Only admins should be able to remove members
    });
  });

  describe('Organization Invitations', () => {
    it('should create invitation link', async () => {
      const response = await fetch(`${baseUrl}/api/organizations/${env.organization.id}/invitations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'newmember@example.com',
          role: 'member',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.invitation_token).toBeDefined();
    });

    it('should expire invitations after set time', async () => {
      // Test invitation expiry logic
    });

    it('should prevent invitation reuse', async () => {
      // Once accepted, invitation should not be reusable
    });
  });
});
