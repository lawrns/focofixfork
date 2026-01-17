import { createClient, RedisClientType } from 'redis'

// Redis Cloud configuration
const REDIS_HOST = process.env.REDIS_HOST || 'redis-16417.fcrce172.us-east-1-1.ec2.cloud.redislabs.com'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '16417')
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || ''
const REDIS_ENABLED = !!REDIS_PASSWORD

// Singleton Redis client
let redisClient: RedisClientType | null = null
let isConnecting = false
let isConnected = false

async function getRedisClient(): Promise<RedisClientType | null> {
  if (!REDIS_ENABLED) return null
  
  if (redisClient && isConnected) return redisClient
  
  if (isConnecting) {
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 100))
    return redisClient
  }
  
  try {
    isConnecting = true
    redisClient = createClient({
      username: 'default',
      password: REDIS_PASSWORD,
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        connectTimeout: 5000,
      }
    })
    
    redisClient.on('error', () => {
      isConnected = false
    })
    
    redisClient.on('connect', () => {
      isConnected = true
    })
    
    await redisClient.connect()
    isConnected = true
    return redisClient
  } catch (error) {
    isConnecting = false
    isConnected = false
    return null
  } finally {
    isConnecting = false
  }
}

export interface CacheOptions {
  ttl?: number
  tags?: string[]
}

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const client = await getRedisClient()
  
  // Skip cache if Redis not available
  if (!client) {
    return fetcher()
  }

  const { ttl = 120 } = options

  try {
    const cached = await client.get(key)
    if (cached && typeof cached === 'string') {
      return JSON.parse(cached) as T
    }
  } catch (error) {
    // Silent fail - just fetch directly
  }

  const data = await fetcher()

  try {
    await client.setEx(key, ttl, JSON.stringify(data))
  } catch (error) {
    // Silent fail on write
  }

  return data
}

export async function invalidateCache(patterns: string[]): Promise<void> {
  const client = await getRedisClient()
  if (!client) return
  
  try {
    const keys: string[] = []
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        const matchedKeys = await client.keys(pattern)
        keys.push(...matchedKeys)
      } else {
        keys.push(pattern)
      }
    }

    if (keys.length > 0) {
      await Promise.all(keys.map(key => client.del(key)))
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
