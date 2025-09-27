/**
 * Cache Manager Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cacheManager, cacheKeys, invalidateCache } from '@/lib/cache/cache-manager'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

describe('CacheManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cacheManager.clear()
  })

  describe('set and get', () => {
    it('should store and retrieve data', () => {
      const testData = { id: 1, name: 'Test' }
      cacheManager.set('test-key', testData)

      const retrieved = cacheManager.get('test-key')
      expect(retrieved).toEqual(testData)
    })

    it('should return null for non-existent keys', () => {
      const retrieved = cacheManager.get('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should respect TTL', () => {
      const testData = { id: 1, name: 'Test' }
      // Set TTL to 1 millisecond
      cacheManager.set('test-key', testData, { ttl: 1 })

      // Wait for TTL to expire
      return new Promise(resolve => {
        setTimeout(() => {
          const retrieved = cacheManager.get('test-key')
          expect(retrieved).toBeNull()
          resolve(void 0)
        }, 2)
      })
    })

    it('should invalidate old cache versions', () => {
      const testData = { id: 1, name: 'Test' }
      cacheManager.set('test-key', testData, { version: 'old' })

      const retrieved = cacheManager.get('test-key')
      expect(retrieved).toBeNull()
    })
  })

  describe('localStorage integration', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null)
      localStorageMock.setItem.mockImplementation(() => {})
    })

    it('should persist to localStorage when strategy is set', () => {
      const testData = { id: 1, name: 'Test' }
      cacheManager.set('test-key', testData, { strategy: 'localStorage' })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cache_test-key',
        expect.any(String)
      )
    })

    it('should retrieve from localStorage when not in memory', () => {
      const testData = { id: 1, name: 'Test' }
      const cachedEntry = {
        data: testData,
        timestamp: Date.now(),
        ttl: 300000,
        version: '1.0.0'
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedEntry))

      const retrieved = cacheManager.get('test-key')
      expect(retrieved).toEqual(testData)
    })
  })

  describe('cache invalidation', () => {
    it('should delete specific keys', () => {
      cacheManager.set('test-key', { data: 'test' })
      cacheManager.delete('test-key')

      const retrieved = cacheManager.get('test-key')
      expect(retrieved).toBeNull()
    })

    it('should clear all cache', () => {
      cacheManager.set('key1', { data: 'test1' })
      cacheManager.set('key2', { data: 'test2' })
      cacheManager.clear()

      expect(cacheManager.get('key1')).toBeNull()
      expect(cacheManager.get('key2')).toBeNull()
    })
  })

  describe('cache keys', () => {
    it('should generate consistent cache keys', () => {
      expect(cacheKeys.projects()).toBe('projects')
      expect(cacheKeys.projects('org-123')).toBe('projects_org-123')
      expect(cacheKeys.project('proj-456')).toBe('project_proj-456')
      expect(cacheKeys.milestones()).toBe('milestones')
      expect(cacheKeys.milestones('proj-789')).toBe('milestones_proj-789')
      expect(cacheKeys.user('user-101')).toBe('user_user-101')
      expect(cacheKeys.search('test query')).toBe('search_test query')
    })
  })

  describe('invalidate cache helpers', () => {
    it('should invalidate user-related cache', () => {
      // Set up some cache entries
      cacheManager.set(cacheKeys.user('user-123'), { name: 'Test User' })
      cacheManager.set(cacheKeys.organizations(), [{ id: 'org-1' }])
      cacheManager.set(cacheKeys.projects(), [{ id: 'proj-1' }])

      invalidateCache.user('user-123')

      expect(cacheManager.get(cacheKeys.user('user-123'))).toBeNull()
      expect(cacheManager.get(cacheKeys.organizations())).toBeNull()
      // Note: projects would also be invalidated in a real implementation
    })

    it('should invalidate organization cache', () => {
      cacheManager.set(cacheKeys.organization('org-123'), { name: 'Test Org' })
      cacheManager.set(cacheKeys.organizations(), [{ id: 'org-123' }])

      invalidateCache.organization('org-123')

      expect(cacheManager.get(cacheKeys.organization('org-123'))).toBeNull()
      expect(cacheManager.get(cacheKeys.organizations())).toBeNull()
    })

    it('should invalidate project cache', () => {
      cacheManager.set(cacheKeys.project('proj-123'), { name: 'Test Project' })
      cacheManager.set(cacheKeys.milestones('proj-123'), [{ id: 'milestone-1' }])

      invalidateCache.project('proj-123')

      expect(cacheManager.get(cacheKeys.project('proj-123'))).toBeNull()
      expect(cacheManager.get(cacheKeys.milestones('proj-123'))).toBeNull()
    })
  })

  describe('cache statistics', () => {
    it('should provide cache statistics', () => {
      cacheManager.set('key1', { data: 'test' })
      cacheManager.set('key2', { data: 'test2' })

      const stats = cacheManager.getStats()
      expect(stats.memoryEntries).toBe(2)
      expect(typeof stats.memorySize).toBe('number')
    })
  })
})


