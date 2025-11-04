// Redis client - would need to install ioredis package
// import Redis from 'ioredis'

// Mock Redis for now
class MockRedis {
  private data = new Map<string, any>()
  
  async setex(key: string, ttl: number, value: string): Promise<string> {
    this.data.set(key, value)
    setTimeout(() => this.data.delete(key), ttl * 1000)
    return 'OK'
  }
  
  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null
  }
  
  async del(...keys: string[]): Promise<number> {
    let count = 0
    keys.forEach(key => {
      if (this.data.has(key)) {
        this.data.delete(key)
        count++
      }
    })
    return count
  }
  
  async exists(key: string): Promise<number> {
    return this.data.has(key) ? 1 : 0
  }
  
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'))
    return Array.from(this.data.keys()).filter(key => regex.test(key))
  }
  
  async mget(...keys: string[]): Promise<(string | null)[]> {
    return keys.map(key => this.data.get(key) || null)
  }
  
  pipeline() {
    return {
      setex: (key: string, ttl: number, value: string) => this.setex(key, ttl, value),
      exec: () => Promise.resolve([])
    }
  }
  
  async info(section?: string): Promise<string> {
    return 'mock_redis_info'
  }
  
  async ping(): Promise<string> {
    return 'PONG'
  }
  
  async quit(): Promise<void> {
    this.data.clear()
  }
  
  on(event: string, callback: Function) {
    // Mock event handling
  }
}

// Types
interface CacheOptions {
  ttl?: number // Time to live in seconds
  prefix?: string
  enableCompression?: boolean
  enableSerialization?: boolean
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  version: string
  metadata?: Record<string, any>
}

interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  errors: number
  hitRate: number
  memoryUsage: number
  keyCount: number
}

/**
 * Redis Caching Service for Voice Planning
 * Provides high-performance caching for plan drafts, context, and frequently accessed data
 */
export class VoicePlanCacheService {
  private redis: MockRedis
  private options: Required<CacheOptions>
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
    memoryUsage: 0,
    keyCount: 0
  }
  private readonly VERSION = '1.0.0'

  constructor(redisUrl?: string, options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 3600, // 1 hour default
      prefix: options.prefix || 'voice_plan:',
      enableCompression: options.enableCompression || false,
      enableSerialization: options.enableSerialization !== false // Default true
    }

    // Initialize Redis connection (using mock)
    this.redis = new MockRedis()

    this.setupEventHandlers()
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('Redis cache connected')
    })

    this.redis.on('error', (error) => {
      console.error('Redis cache error:', error)
      this.stats.errors++
    })

    this.redis.on('close', () => {
      console.log('Redis cache connection closed')
    })
  }

  /**
   * Generate cache key with prefix
   */
  private generateKey(key: string): string {
    return `${this.options.prefix}${key}`
  }

  /**
   * Serialize data for storage
   */
  private serialize<T>(data: T): string {
    if (!this.options.enableSerialization) {
      return data as string
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: this.options.ttl,
      version: this.VERSION,
      metadata: {
        compressed: this.options.enableCompression,
        size: JSON.stringify(data).length
      }
    }

    return JSON.stringify(entry)
  }

  /**
   * Deserialize data from storage
   */
  private deserialize<T>(serialized: string): T | null {
    if (!this.options.enableSerialization) {
      return serialized as T
    }

    try {
      const entry: CacheEntry<T> = JSON.parse(serialized)
      
      // Check version compatibility
      if (entry.version !== this.VERSION) {
        console.warn('Cache entry version mismatch', {
          cached: entry.version,
          current: this.VERSION
        })
        return null
      }

      // Check if expired
      const elapsed = (Date.now() - entry.timestamp) / 1000
      if (elapsed > entry.ttl) {
        return null
      }

      return entry.data
    } catch (error) {
      console.error('Cache deserialization error:', error)
      return null
    }
  }

  /**
   * Set cache value
   */
  public async set<T>(key: string, data: T, ttl?: number): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key)
      const serialized = this.serialize(data)
      const effectiveTtl = ttl || this.options.ttl

      await this.redis.setex(cacheKey, effectiveTtl, serialized)
      
      this.stats.sets++
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      this.stats.errors++
      return false
    }
  }

  /**
   * Get cache value
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key)
      const serialized = await this.redis.get(cacheKey)

      if (serialized === null) {
        this.stats.misses++
        return null
      }

      const data = this.deserialize<T>(serialized)
      
      if (data === null) {
        this.stats.misses++
        // Remove stale entry
        await this.delete(key)
        return null
      }

      this.stats.hits++
      this.updateHitRate()
      return data
    } catch (error) {
      console.error('Cache get error:', error)
      this.stats.errors++
      this.stats.misses++
      return null
    }
  }

  /**
   * Delete cache value
   */
  public async delete(key: string): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key)
      const result = await this.redis.del(cacheKey)
      
      this.stats.deletes++
      return result > 0
    } catch (error) {
      console.error('Cache delete error:', error)
      this.stats.errors++
      return false
    }
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key)
      const result = await this.redis.exists(cacheKey)
      return result > 0
    } catch (error) {
      console.error('Cache exists error:', error)
      this.stats.errors++
      return false
    }
  }

  /**
   * Set multiple values in pipeline
   */
  public async mset<T>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline()
      
      entries.forEach(entry => {
        const cacheKey = this.generateKey(entry.key)
        const serialized = this.serialize(entry.data)
        const effectiveTtl = entry.ttl || this.options.ttl
        pipeline.setex(cacheKey, effectiveTtl, serialized)
      })

      await pipeline.exec()
      
      this.stats.sets += entries.length
      return true
    } catch (error) {
      console.error('Cache mset error:', error)
      this.stats.errors++
      return false
    }
  }

  /**
   * Get multiple values
   */
  public async mget<T>(keys: string[]): Promise<Array<T | null>> {
    try {
      const cacheKeys = keys.map(key => this.generateKey(key))
      const serializedValues = await this.redis.mget(...cacheKeys)
      
      const results = serializedValues.map(serialized => {
        if (serialized === null) {
          this.stats.misses++
          return null
        }

        const data = this.deserialize<T>(serialized)
        
        if (data === null) {
          this.stats.misses++
          return null
        }

        this.stats.hits++
        return data
      })

      this.updateHitRate()
      return results
    } catch (error) {
      console.error('Cache mget error:', error)
      this.stats.errors++
      this.stats.misses += keys.length
      return keys.map(() => null)
    }
  }

  /**
   * Clear all cache entries with prefix
   */
  public async clear(): Promise<boolean> {
    try {
      const pattern = `${this.options.prefix}*`
      const keys = await this.redis.keys(`${this.options.prefix}${pattern}`)
      
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
      
      this.stats.deletes += keys.length
      return true
    } catch (error) {
      console.error('Cache clear error:', error)
      this.stats.errors++
      return false
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      memoryUsage: 0,
      keyCount: 0
    }
  }

  /**
   * Get memory usage information
   */
  public async getMemoryUsage(): Promise<{
    used: number
    peak: number
    keys: number
  }> {
    try {
      const info = await this.redis.info('memory')
      const keyspace = await this.redis.info('keyspace')
      
      const memoryInfo = this.parseRedisInfo(info)
      const keyspaceInfo = this.parseRedisInfo(keyspace)
      
      return {
        used: memoryInfo.used_memory || 0,
        peak: memoryInfo.used_memory_peak || 0,
        keys: Object.values(keyspaceInfo).reduce((sum: number, db: any) => sum + (db.keys || 0), 0)
      }
    } catch (error) {
      console.error('Memory usage error:', error)
      return { used: 0, peak: 0, keys: 0 }
    }
  }

  /**
   * Parse Redis INFO output
   */
  private parseRedisInfo(info: string): Record<string, any> {
    const lines = info.split('\r\n')
    const result: Record<string, any> = {}
    
    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':')
        if (key && value) {
          const numValue = parseFloat(value)
          result[key] = isNaN(numValue) ? value : numValue
        }
      }
    })
    
    return result
  }

  /**
   * Cache plan draft
   */
  public async cachePlanDraft(
    sessionId: string, 
    planDraft: any, 
    ttl: number = 3600
  ): Promise<boolean> {
    const key = `plan_draft:${sessionId}`
    return await this.set(key, planDraft, ttl)
  }

  /**
   * Get cached plan draft
   */
  public async getPlanDraft(sessionId: string): Promise<any | null> {
    const key = `plan_draft:${sessionId}`
    return await this.get(key)
  }

  /**
   * Cache transcription result
   */
  public async cacheTranscription(
    audioId: string, 
    transcription: any, 
    ttl: number = 7200
  ): Promise<boolean> {
    const key = `transcription:${audioId}`
    return await this.set(key, transcription, ttl)
  }

  /**
   * Get cached transcription
   */
  public async getTranscription(audioId: string): Promise<any | null> {
    const key = `transcription:${audioId}`
    return await this.get(key)
  }

  /**
   * Cache intent extraction result
   */
  public async cacheIntent(
    textHash: string, 
    intent: any, 
    ttl: number = 1800
  ): Promise<boolean> {
    const key = `intent:${textHash}`
    return await this.set(key, intent, ttl)
  }

  /**
   * Get cached intent
   */
  public async getIntent(textHash: string): Promise<any | null> {
    const key = `intent:${textHash}`
    return await this.get(key)
  }

  /**
   * Cache user context
   */
  public async cacheUserContext(
    userId: string, 
    context: any, 
    ttl: number = 1800
  ): Promise<boolean> {
    const key = `user_context:${userId}`
    return await this.set(key, context, ttl)
  }

  /**
   * Get cached user context
   */
  public async getUserContext(userId: string): Promise<any | null> {
    const key = `user_context:${userId}`
    return await this.get(key)
  }

  /**
   * Cache project templates
   */
  public async cacheProjectTemplates(
    templates: any[], 
    ttl: number = 86400
  ): Promise<boolean> {
    const key = 'project_templates'
    return await this.set(key, templates, ttl)
  }

  /**
   * Get cached project templates
   */
  public async getProjectTemplates(): Promise<any[] | null> {
    const key = 'project_templates'
    return await this.get(key)
  }

  /**
   * Cache frequently used entities
   */
  public async cacheEntities(
    entityType: string, 
    entities: any[], 
    ttl: number = 3600
  ): Promise<boolean> {
    const key = `entities:${entityType}`
    return await this.set(key, entities, ttl)
  }

  /**
   * Get cached entities
   */
  public async getEntities(entityType: string): Promise<any[] | null> {
    const key = `entities:${entityType}`
    return await this.get(key)
  }

  /**
   * Invalidate cache for a session
   */
  public async invalidateSession(sessionId: string): Promise<boolean> {
    const keys = [
      `plan_draft:${sessionId}`,
      `transcription:${sessionId}`,
      `intent:${sessionId}`,
      `session_data:${sessionId}`
    ]

    const results = await Promise.all(keys.map(key => this.delete(key)))
    return results.some(result => result)
  }

  /**
   * Warm up cache with common data
   */
  public async warmupCache(): Promise<void> {
    try {
      // Cache common project templates
      const templates = await this.fetchProjectTemplates()
      await this.cacheProjectTemplates(templates)

      // Cache common entities
      const entityTypes = ['priorities', 'statuses', 'categories']
      await Promise.all(
        entityTypes.map(async type => {
          const entities = await this.fetchEntities(type)
          await this.cacheEntities(type, entities)
        })
      )

      console.log('Cache warmup completed')
    } catch (error) {
      console.error('Cache warmup error:', error)
    }
  }

  /**
   * Mock data fetching methods (replace with actual implementations)
   */
  private async fetchProjectTemplates(): Promise<any[]> {
    // Mock implementation - replace with actual template fetching
    return [
      { id: 'mobile_app', name: 'Mobile App', template: {} },
      { id: 'web_app', name: 'Web App', template: {} },
      { id: 'api_project', name: 'API Project', template: {} }
    ]
  }

  private async fetchEntities(entityType: string): Promise<any[]> {
    // Mock implementation - replace with actual entity fetching
    switch (entityType) {
      case 'priorities':
        return ['low', 'medium', 'high', 'critical']
      case 'statuses':
        return ['pending', 'in_progress', 'completed', 'blocked']
      case 'categories':
        return ['development', 'design', 'testing', 'deployment']
      default:
        return []
    }
  }

  /**
   * Close Redis connection
   */
  public async disconnect(): Promise<void> {
    await this.redis.quit()
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    connected: boolean
    latency: number
    memory: number
    error?: string
  }> {
    try {
      const start = Date.now()
      await this.redis.ping()
      const latency = Date.now() - start
      
      const memory = await this.getMemoryUsage()
      
      return {
        connected: true,
        latency,
        memory: memory.used
      }
    } catch (error) {
      return {
        connected: false,
        latency: 0,
        memory: 0,
        error: error.message
      }
    }
  }
}

/**
 * Singleton instance for voice plan cache
 */
let voicePlanCache: VoicePlanCacheService | null = null

export function getVoicePlanCache(): VoicePlanCacheService {
  if (!voicePlanCache) {
    voicePlanCache = new VoicePlanCacheService()
  }
  
  return voicePlanCache
}

/**
 * Cleanup function to close cache connection
 */
export async function cleanupVoicePlanCache(): Promise<void> {
  if (voicePlanCache) {
    await voicePlanCache.disconnect()
    voicePlanCache = null
  }
}
