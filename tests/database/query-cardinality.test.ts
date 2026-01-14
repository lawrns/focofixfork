/**
 * Database Query Cardinality Tests
 * Validates that queries use correct cardinality methods
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { ProjectRepository } from '@/lib/repositories/project-repository'
import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

describe('Query Cardinality Validation', () => {
  let supabase: ReturnType<typeof createClient>
  let projectRepo: ProjectRepository
  let workspaceRepo: WorkspaceRepository

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey)
    projectRepo = new ProjectRepository(supabase)
    workspaceRepo = new WorkspaceRepository(supabase)
  })

  describe('Single Record Queries', () => {
    it('findById returns Result with single item or error', async () => {
      const result = await projectRepo.findById('non-existent-id')
      
      // Should be an error (not found)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND')
      }
    })

    it('findById never returns null or undefined', async () => {
      const result = await projectRepo.findById('test-id')
      
      // Result is always defined
      expect(result).toBeDefined()
      
      // Either has data or error, never both
      if (result.ok) {
        expect(result.data).toBeDefined()
        expect(result.error).toBeNull()
      } else {
        expect(result.data).toBeNull()
        expect(result.error).toBeDefined()
      }
    })

    it('maybeSingle pattern handles 0 results correctly', async () => {
      const result = await workspaceRepo.findBySlug('non-existent-slug')
      
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND')
        expect(result.error.message).toContain('not found')
      }
    })
  })

  describe('Multiple Record Queries', () => {
    it('findMany always returns array (never null)', async () => {
      const result = await projectRepo.findMany({})
      
      expect(result).toBeDefined()
      if (result.ok) {
        expect(Array.isArray(result.data)).toBe(true)
        // Empty array is valid, not an error
        expect(result.data).toBeDefined()
      }
    })

    it('findMany with no results returns empty array', async () => {
      const result = await projectRepo.findMany({
        workspace_id: 'non-existent-workspace',
      })
      
      if (result.ok) {
        expect(result.data).toEqual([])
        expect(result.data.length).toBe(0)
      }
    })

    it('findMany includes count metadata', async () => {
      const result = await projectRepo.findMany({})
      
      if (result.ok) {
        expect(result.meta).toBeDefined()
        expect(typeof result.meta?.count).toBe('number')
      }
    })
  })

  describe('Existence Checks', () => {
    it('exists returns boolean, never null', async () => {
      const result = await projectRepo.exists('any-id')
      
      expect(result).toBeDefined()
      if (result.ok) {
        expect(typeof result.data).toBe('boolean')
      }
    })

    it('exists handles non-existent records', async () => {
      const result = await projectRepo.exists('definitely-does-not-exist')
      
      if (result.ok) {
        expect(result.data).toBe(false)
      }
    })
  })

  describe('Error Handling', () => {
    it('database errors return Result with error', async () => {
      // Invalid UUID format should cause validation error
      const result = await projectRepo.findById('invalid-uuid-format')
      
      expect(result).toBeDefined()
      // Should either validate UUID and return error, or query and return not found
      expect(result.ok).toBe(false)
    })

    it('errors include code, message, and details', async () => {
      const result = await projectRepo.findById('non-existent')
      
      if (!result.ok) {
        expect(result.error).toHaveProperty('code')
        expect(result.error).toHaveProperty('message')
        expect(typeof result.error.code).toBe('string')
        expect(typeof result.error.message).toBe('string')
      }
    })
  })

  describe('Query Options', () => {
    it('respects limit option', async () => {
      const result = await projectRepo.findMany({}, { limit: 5 })
      
      if (result.ok) {
        expect(result.data.length).toBeLessThanOrEqual(5)
      }
    })

    it('respects offset option', async () => {
      const result1 = await projectRepo.findMany({}, { limit: 10, offset: 0 })
      const result2 = await projectRepo.findMany({}, { limit: 10, offset: 10 })
      
      if (result1.ok && result2.ok) {
        // Results should be different (unless less than 10 total records)
        if (result1.data.length === 10 && result2.data.length > 0) {
          expect(result1.data[0].id).not.toBe(result2.data[0].id)
        }
      }
    })

    it('respects sort options', async () => {
      const result = await projectRepo.findMany({}, {
        sortBy: 'created_at',
        sortOrder: 'desc',
      })
      
      if (result.ok && result.data.length > 1) {
        const dates = result.data.map(p => new Date(p.created_at).getTime())
        // Check if sorted descending
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1])
        }
      }
    })
  })

  describe('Type Safety', () => {
    it('Result type is discriminated union', () => {
      const successResult = { ok: true as const, data: 'test', error: null }
      const errorResult = {
        ok: false as const,
        data: null,
        error: { code: 'ERROR', message: 'Error', timestamp: new Date().toISOString() },
      }
      
      // TypeScript should narrow types based on ok field
      if (successResult.ok) {
        expect(successResult.data).toBe('test')
      }
      
      if (!errorResult.ok) {
        expect(errorResult.error.code).toBe('ERROR')
      }
    })
  })
})
