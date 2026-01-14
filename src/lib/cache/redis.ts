import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export interface CacheOptions {
  ttl?: number
  tags?: string[]
}

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 120 } = options

  try {
    const cached = await redis.get(key)
    if (cached) {
      console.log(`[Cache HIT] ${key}`)
      return cached as T
    }
  } catch (error) {
    console.error(`[Cache READ ERROR] ${key}:`, error)
  }

  console.log(`[Cache MISS] ${key}`)
  const data = await fetcher()

  try {
    await redis.setex(key, ttl, JSON.stringify(data))
  } catch (error) {
    console.error(`[Cache WRITE ERROR] ${key}:`, error)
  }

  return data
}

export async function invalidateCache(patterns: string[]): Promise<void> {
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
      console.log(`[Cache INVALIDATED] ${keys.length} keys:`, keys)
    }
  } catch (error) {
    console.error('[Cache INVALIDATION ERROR]:', error)
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
