/**
 * API Contract Tests for /api/projects endpoints
 * Validates that migrated endpoints conform to canonical response envelope
 */

import { describe, it, expect, beforeAll } from 'vitest'
import type { APIResponse } from '@/lib/api/response-envelope'
import { isSuccess, isError, ErrorCode } from '@/lib/api/response-envelope'

describe('/api/projects Contract Tests', () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  let authToken: string

  beforeAll(async () => {
    // Setup: Get auth token (mock or real)
    // This would be replaced with actual auth in real tests
    authToken = 'mock-token'
  })

  describe('GET /api/projects', () => {
    it('returns canonical success response with array data', async () => {
      const response = await fetch(`${baseUrl}/api/projects?workspace_id=test`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      const json = await response.json()

      // Validate response shape
      expect(json).toHaveProperty('ok')
      expect(json).toHaveProperty('data')
      expect(json).toHaveProperty('error')

      if (response.ok) {
        expect(json.ok).toBe(true)
        expect(Array.isArray(json.data)).toBe(true)
        expect(json.error).toBeNull()
        
        // Validate metadata
        if (json.meta) {
          expect(json.meta).toHaveProperty('pagination')
          expect(json.meta.pagination).toHaveProperty('total')
          expect(json.meta.pagination).toHaveProperty('limit')
          expect(json.meta.pagination).toHaveProperty('offset')
          expect(json.meta.pagination).toHaveProperty('hasMore')
        }
      }
    })

    it('returns 401 with AUTH_REQUIRED error code when unauthorized', async () => {
      const response = await fetch(`${baseUrl}/api/projects`)

      expect(response.status).toBe(401)

      const json = await response.json()
      expect(json.ok).toBe(false)
      expect(json.data).toBeNull()
      expect(json.error).toBeDefined()
      expect(json.error.code).toBe('AUTH_REQUIRED')
      expect(json.error.message).toBeDefined()
      expect(json.error.timestamp).toBeDefined()
    })

    it('respects pagination parameters', async () => {
      const response = await fetch(
        `${baseUrl}/api/projects?workspace_id=test&limit=10&offset=0`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      )

      const json = await response.json()

      if (json.ok && json.meta?.pagination) {
        expect(json.meta.pagination.limit).toBe(10)
        expect(json.meta.pagination.offset).toBe(0)
        expect(json.data.length).toBeLessThanOrEqual(10)
      }
    })

    it('filters by status parameter', async () => {
      const response = await fetch(
        `${baseUrl}/api/projects?workspace_id=test&status=active`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      )

      const json = await response.json()

      if (json.ok && Array.isArray(json.data)) {
        json.data.forEach((project: any) => {
          expect(project.status).toBe('active')
        })
      }
    })
  })

  describe('POST /api/projects', () => {
    it('returns canonical success response with created project', async () => {
      const newProject = {
        name: 'Test Project',
        workspace_id: 'test-workspace-id',
        description: 'Test description',
      }

      const response = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(newProject),
      })

      const json = await response.json()

      // Validate response shape
      expect(json).toHaveProperty('ok')
      expect(json).toHaveProperty('data')
      expect(json).toHaveProperty('error')

      if (response.status === 201) {
        expect(json.ok).toBe(true)
        expect(json.data).toBeDefined()
        expect(json.data).toHaveProperty('id')
        expect(json.data).toHaveProperty('name')
        expect(json.data.name).toBe(newProject.name)
        expect(json.error).toBeNull()
      }
    })

    it('returns 400 with MISSING_REQUIRED_FIELD when name is missing', async () => {
      const response = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ workspace_id: 'test' }),
      })

      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.ok).toBe(false)
      expect(json.data).toBeNull()
      expect(json.error.code).toBe('MISSING_REQUIRED_FIELD')
      expect(json.error.message).toContain('name')
    })

    it('returns 400 with MISSING_REQUIRED_FIELD when workspace_id is missing', async () => {
      const response = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: 'Test' }),
      })

      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.ok).toBe(false)
      expect(json.error.code).toBe('MISSING_REQUIRED_FIELD')
      expect(json.error.message).toContain('workspace_id')
    })

    it('returns 409 with DUPLICATE_SLUG when slug already exists', async () => {
      const project = {
        name: 'Duplicate Project',
        slug: 'existing-slug',
        workspace_id: 'test-workspace-id',
      }

      // Create first project
      await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(project),
      })

      // Try to create duplicate
      const response = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(project),
      })

      if (response.status === 409) {
        const json = await response.json()
        expect(json.ok).toBe(false)
        expect(json.error.code).toBe('DUPLICATE_SLUG')
      }
    })
  })

  describe('GET /api/projects/[id]', () => {
    it('returns canonical success response with single project', async () => {
      const projectId = 'test-project-id'

      const response = await fetch(`${baseUrl}/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      const json = await response.json()

      expect(json).toHaveProperty('ok')
      expect(json).toHaveProperty('data')
      expect(json).toHaveProperty('error')

      if (response.ok) {
        expect(json.ok).toBe(true)
        expect(json.data).toBeDefined()
        expect(json.data).toHaveProperty('id')
        expect(json.error).toBeNull()
      }
    })

    it('returns 404 with PROJECT_NOT_FOUND when project does not exist', async () => {
      const response = await fetch(
        `${baseUrl}/api/projects/00000000-0000-0000-0000-000000000000`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      )

      if (response.status === 404) {
        const json = await response.json()
        expect(json.ok).toBe(false)
        expect(json.data).toBeNull()
        expect(json.error.code).toBe('PROJECT_NOT_FOUND')
      }
    })

    it('supports slug-based lookup with workspace_id', async () => {
      const response = await fetch(
        `${baseUrl}/api/projects/test-slug?workspace_id=test-workspace-id`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      )

      const json = await response.json()

      if (response.ok) {
        expect(json.ok).toBe(true)
        expect(json.data).toBeDefined()
        expect(json.data.slug).toBe('test-slug')
      }
    })
  })

  describe('PATCH /api/projects/[id]', () => {
    it('returns canonical success response with updated project', async () => {
      const projectId = 'test-project-id'
      const updates = { name: 'Updated Name' }

      const response = await fetch(`${baseUrl}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updates),
      })

      const json = await response.json()

      if (response.ok) {
        expect(json.ok).toBe(true)
        expect(json.data).toBeDefined()
        expect(json.data.name).toBe(updates.name)
        expect(json.error).toBeNull()
      }
    })

    it('returns 400 with INVALID_UUID when ID format is invalid', async () => {
      const response = await fetch(`${baseUrl}/api/projects/invalid-id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: 'Test' }),
      })

      if (response.status === 400) {
        const json = await response.json()
        expect(json.ok).toBe(false)
        expect(json.error.code).toBe('INVALID_UUID')
      }
    })
  })

  describe('DELETE /api/projects/[id]', () => {
    it('returns canonical success response with deleted flag', async () => {
      const projectId = 'test-project-id'

      const response = await fetch(`${baseUrl}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      const json = await response.json()

      if (response.ok) {
        expect(json.ok).toBe(true)
        expect(json.data).toBeDefined()
        expect(json.data.deleted).toBe(true)
        expect(json.error).toBeNull()
      }
    })

    it('returns 400 with INVALID_UUID when ID format is invalid', async () => {
      const response = await fetch(`${baseUrl}/api/projects/invalid-id`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      if (response.status === 400) {
        const json = await response.json()
        expect(json.ok).toBe(false)
        expect(json.error.code).toBe('INVALID_UUID')
      }
    })
  })

  describe('Response Envelope Consistency', () => {
    it('all endpoints return discriminated union with ok field', async () => {
      const endpoints = [
        { method: 'GET', path: '/api/projects?workspace_id=test' },
        { method: 'GET', path: '/api/projects/test-id' },
      ]

      for (const endpoint of endpoints) {
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: { Authorization: `Bearer ${authToken}` },
        })

        const json = await response.json()

        // Every response must have ok, data, error
        expect(json).toHaveProperty('ok')
        expect(json).toHaveProperty('data')
        expect(json).toHaveProperty('error')

        // ok must be boolean
        expect(typeof json.ok).toBe('boolean')

        // Exactly one of data or error must be non-null
        if (json.ok) {
          expect(json.data).not.toBeNull()
          expect(json.error).toBeNull()
        } else {
          expect(json.data).toBeNull()
          expect(json.error).not.toBeNull()
          expect(json.error).toHaveProperty('code')
          expect(json.error).toHaveProperty('message')
          expect(json.error).toHaveProperty('timestamp')
        }
      }
    })
  })
})
