import { Redis } from '@upstash/redis'

// Check if Redis is configured - if not, we'll bypass caching entirely
const REDIS_ENABLED = !!(process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN)

// Only create Redis client if configured
export const redis = REDIS_ENABLED 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    })
  : null

export interface CacheOptions {
  ttl?: number
  tags?: string[]
}

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Skip cache entirely if Redis not configured - direct fetch is faster than failed cache attempts
  if (!redis) {
    return fetcher()
  }

  const { ttl = 120 } = options

  try {
    const cached = await redis.get(key)
    if (cached) {
      return cached as T
    }
  } catch (error) {
    // Silent fail - just fetch directly
  }

  const data = await fetcher()

  try {
    await redis.setex(key, ttl, JSON.stringify(data))
  } catch (error) {
    // Silent fail on write
  }

  return data
}

export async function invalidateCache(patterns: string[]): Promise<void> {
  if (!redis) return
  
  try {
    const keys: string[] = []
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        const matchedKeys = await redis.keys(pattern)
        keys.push(...matchedKeys)
      } else {
        keys.push(pattern)
      }
    }

    if (keys.length > 0) {
      await Promise.all(keys.map(key => redis.del(key)))
    }
  } catch (error) {
    // Silent fail
  }
}

export async function getCacheStats(): Promise<{
  hits: number
  misses: number
  hitRate: number
}> {
  // Upstash Redis doesn't expose INFO command directly
  // Return placeholder stats - in production, track these in application code
  return { hits: 0, misses: 0, hitRate: 0 }
}

export function generateCacheKey(
  prefix: string,
  params: Record<string, any>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')

  return `${prefix}:${sortedParams || 'all'}`
}
