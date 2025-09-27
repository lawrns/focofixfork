interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  version: string
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  version?: string // Cache version for invalidation
  strategy?: 'memory' | 'localStorage' | 'sessionStorage'
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly CACHE_VERSION = '1.0.0'

  // Memory cache methods
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || this.DEFAULT_TTL,
      version: options.version || this.CACHE_VERSION
    }

    this.memoryCache.set(key, entry)

    // Also persist to localStorage if strategy allows
    if (options.strategy === 'localStorage' && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry))
      } catch (error) {
        console.warn('Failed to persist cache to localStorage:', error)
      }
    }
  }

  get<T>(key: string): T | null {
    // Try memory cache first
    let entry = this.memoryCache.get(key) as CacheEntry<T> | undefined

    // If not in memory, try localStorage
    if (!entry && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`cache_${key}`)
        if (stored) {
          entry = JSON.parse(stored)
        }
      } catch (error) {
        console.warn('Failed to read cache from localStorage:', error)
      }
    }

    if (!entry) return null

    // Check if cache is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key)
      return null
    }

    // Check if cache version is outdated
    if (entry.version !== this.CACHE_VERSION) {
      this.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.memoryCache.delete(key)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`cache_${key}`)
      } catch (error) {
        console.warn('Failed to delete cache from localStorage:', error)
      }
    }
  }

  clear(): void {
    this.memoryCache.clear()
    if (typeof window !== 'undefined') {
      try {
        // Clear all cache entries from localStorage
        const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'))
        keys.forEach(key => localStorage.removeItem(key))
      } catch (error) {
        console.warn('Failed to clear cache from localStorage:', error)
      }
    }
  }

  // Get cache stats
  getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      memorySize: JSON.stringify([...this.memoryCache]).length
    }
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key)
      }
    }
  }
}

// Global cache instance
export const cacheManager = new CacheManager()

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheManager.cleanup()
  }, 5 * 60 * 1000)
}

// Cache key generators
export const cacheKeys = {
  projects: (orgId?: string) => `projects${orgId ? `_${orgId}` : ''}`,
  project: (projectId: string) => `project_${projectId}`,
  milestones: (projectId?: string) => `milestones${projectId ? `_${projectId}` : ''}`,
  milestone: (milestoneId: string) => `milestone_${milestoneId}`,
  organizations: () => 'organizations',
  organization: (orgId: string) => `organization_${orgId}`,
  user: (userId: string) => `user_${userId}`,
  search: (query: string) => `search_${query.replace(/\s+/g, '_')}`,
  ai: (context: string, content: string) => `ai_${context}_${content.slice(0, 50).replace(/\s+/g, '_')}`
}

// Cache strategies for different data types
export const cacheStrategies = {
  // User data - longer TTL, localStorage persistence
  user: { ttl: 30 * 60 * 1000, strategy: 'localStorage' as const }, // 30 minutes

  // Organization data - medium TTL
  organization: { ttl: 15 * 60 * 1000 }, // 15 minutes

  // Project data - shorter TTL due to frequent changes
  project: { ttl: 10 * 60 * 1000 }, // 10 minutes

  // Milestone data - short TTL due to real-time updates
  milestone: { ttl: 5 * 60 * 1000 }, // 5 minutes

  // Search results - very short TTL
  search: { ttl: 2 * 60 * 1000 }, // 2 minutes

  // AI responses - medium TTL with localStorage
  ai: { ttl: 60 * 60 * 1000, strategy: 'localStorage' as const } // 1 hour
}

// Cache invalidation helpers
export const invalidateCache = {
  // Invalidate all user-related cache
  user: (userId: string) => {
    cacheManager.delete(cacheKeys.user(userId))
    cacheManager.delete(cacheKeys.organizations())
    // Also invalidate related projects and milestones
    // Note: In a real app, you'd track these relationships
  },

  // Invalidate organization cache
  organization: (orgId: string) => {
    cacheManager.delete(cacheKeys.organization(orgId))
    cacheManager.delete(cacheKeys.organizations())
    cacheManager.delete(cacheKeys.projects(orgId))
  },

  // Invalidate project cache
  project: (projectId: string) => {
    cacheManager.delete(cacheKeys.project(projectId))
    cacheManager.delete(cacheKeys.milestones(projectId))
  },

  // Invalidate milestone cache
  milestone: (milestoneId: string) => {
    cacheManager.delete(cacheKeys.milestone(milestoneId))
  },

  // Clear all cache
  all: () => {
    cacheManager.clear()
  }
}

// React hook for cached data
import { useState, useEffect } from 'react'

export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try to get from cache first
        const cachedData = cacheManager.get<T>(key)
        if (cachedData) {
          setData(cachedData)
          setLoading(false)
          return
        }

        // Fetch fresh data
        const freshData = await fetcher()

        // Cache the result
        cacheManager.set(key, freshData, options)

        setData(freshData)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [key, fetcher])

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)

      const freshData = await fetcher()
      cacheManager.set(key, freshData, options)
      setData(freshData)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  const invalidate = () => {
    cacheManager.delete(key)
    refetch()
  }

  return {
    data,
    loading,
    error,
    refetch,
    invalidate
  }
}


