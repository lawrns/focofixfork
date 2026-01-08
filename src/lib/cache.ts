/**
 * Advanced Caching System
 * Provides multi-level caching with TTL, invalidation, and persistence
 */

interface CacheItem<T> {
  value: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of items
  persist?: boolean // Persist to localStorage
  namespace?: string // Namespace for cache keys
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
  oldestItem: number
  newestItem: number
}

class CacheManager<T = any> {
  private cache = new Map<string, CacheItem<T>>()
  private stats = { hits: 0, misses: 0 }
  private options: Required<CacheOptions>

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 5 * 60 * 1000, // 5 minutes default
      maxSize: options.maxSize || 1000,
      persist: options.persist || false,
      namespace: options.namespace || 'default'
    }

    if (this.options.persist && typeof window !== 'undefined') {
      this.loadFromStorage()
    }

    // Cleanup expired items every minute
    setInterval(() => this.cleanup(), 60 * 1000)
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    const fullKey = this.getFullKey(key)
    const item: CacheItem<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.options.ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    }

    this.cache.set(fullKey, item)

    // Enforce max size
    if (this.cache.size > this.options.maxSize) {
      this.evictOldest()
    }

    if (this.options.persist) {
      this.saveToStorage()
    }
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const fullKey = this.getFullKey(key)
    const item = this.cache.get(fullKey)

    if (!item) {
      this.stats.misses++
      return null
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(fullKey)
      this.stats.misses++
      return null
    }

    // Update access statistics
    item.accessCount++
    item.lastAccessed = Date.now()
    this.stats.hits++

    return item.value
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    const fullKey = this.getFullKey(key)
    const deleted = this.cache.delete(fullKey)
    
    if (deleted && this.options.persist) {
      this.saveToStorage()
    }
    
    return deleted
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
    
    if (this.options.persist) {
      this.saveToStorage()
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const items = Array.from(this.cache.values())
    const timestamps = items.map(item => item.timestamp)
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0,
      oldestItem: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestItem: timestamps.length > 0 ? Math.max(...timestamps) : 0
    }
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys()).map(key => 
      key.replace(`${this.options.namespace}:`, '')
    )
  }

  /**
   * Get all values in the cache
   */
  values(): T[] {
    return Array.from(this.cache.values()).map(item => item.value)
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let invalidated = 0
    const keysToDelete: string[] = []

    for (const key of this.cache.keys()) {
      const cleanKey = key.replace(`${this.options.namespace}:`, '')
      if (pattern.test(cleanKey)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key)
      invalidated++
    })

    if (invalidated > 0 && this.options.persist) {
      this.saveToStorage()
    }

    return invalidated
  }

  /**
   * Warm up cache with multiple items
   */
  warmUp(items: Array<{ key: string; value: T; ttl?: number }>): void {
    items.forEach(({ key, value, ttl }) => {
      this.set(key, value, ttl)
    })
  }

  /**
   * Get full key with namespace
   */
  private getFullKey(key: string): string {
    return `${this.options.namespace}:${key}`
  }

  /**
   * Evict oldest item when cache is full
   */
  private evictOldest(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Cleanup expired items
   */
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))

    if (keysToDelete.length > 0 && this.options.persist) {
      this.saveToStorage()
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const data = Array.from(this.cache.entries()).map(([key, item]) => ({
        key,
        value: item.value,
        timestamp: item.timestamp,
        ttl: item.ttl
      }))

      localStorage.setItem(`cache:${this.options.namespace}`, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save cache to storage:', error)
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const data = localStorage.getItem(`cache:${this.options.namespace}`)
      if (!data) return

      const items = JSON.parse(data)
      const now = Date.now()

      items.forEach((item: any) => {
        // Only load non-expired items
        if (now - item.timestamp < item.ttl) {
          this.cache.set(item.key, {
            value: item.value,
            timestamp: item.timestamp,
            ttl: item.ttl,
            accessCount: 0,
            lastAccessed: now
          })
        }
      })
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
    }
  }
}

// Create cache instances for different purposes
export const userCache = new CacheManager({
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 500,
  persist: true,
  namespace: 'user'
})

export const projectCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000,
  persist: true,
  namespace: 'project'
})

export const apiCache = new CacheManager({
  ttl: 2 * 60 * 1000, // 2 minutes
  maxSize: 2000,
  persist: false,
  namespace: 'api'
})

export const sessionCache = new CacheManager({
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 100,
  persist: true,
  namespace: 'session'
})

// Cache invalidation utilities
export class CacheInvalidator {
  private static invalidators: Array<() => void> = []

  static register(invalidator: () => void): void {
    this.invalidators.push(invalidator)
  }

  static invalidateAll(): void {
    this.invalidators.forEach(invalidator => invalidator())
  }

  static invalidatePattern(pattern: RegExp): void {
    this.invalidators.forEach(invalidator => {
      if (typeof invalidator === 'function') {
        invalidator()
      }
    })
  }
}

// Register cache invalidators
CacheInvalidator.register(() => userCache.clear())
CacheInvalidator.register(() => projectCache.clear())
CacheInvalidator.register(() => apiCache.clear())

// Export cache manager class for custom instances
export { CacheManager }
