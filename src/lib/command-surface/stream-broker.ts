import type { AgentExecutionEvent } from '@/components/command-surface/types'
import { createClient, type RedisClientType } from 'redis'

interface CommandStreamJob {
  id: string
  userId: string
  createdAt: number
  done: boolean
  runId?: string
  events: AgentExecutionEvent[]
  subscribers: Set<(event: AgentExecutionEvent) => void>
  gcTimer?: NodeJS.Timeout
}

const JOB_TTL_MS = 10 * 60 * 1000
const JOB_TTL_SEC = Math.floor(JOB_TTL_MS / 1000)

const REDIS_URL = process.env.REDIS_URL
const REDIS_HOST = process.env.REDIS_HOST
const REDIS_PORT = Number(process.env.REDIS_PORT ?? '')
const REDIS_PASSWORD = process.env.REDIS_PASSWORD
const REDIS_ENABLED = Boolean(REDIS_URL || REDIS_PASSWORD)

let redisClient: RedisClientType | null = null
let redisConnecting = false

function getStore(): Map<string, CommandStreamJob> {
  const globalStore = globalThis as unknown as {
    __commandSurfaceStreamJobs?: Map<string, CommandStreamJob>
  }

  if (!globalStore.__commandSurfaceStreamJobs) {
    globalStore.__commandSurfaceStreamJobs = new Map<string, CommandStreamJob>()
  }

  return globalStore.__commandSurfaceStreamJobs
}

function runToJobKey(runId: string): string {
  return `command_surface:run_to_job:${runId}`
}

function metaKey(jobId: string): string {
  return `command_surface:stream:${jobId}:meta`
}

function eventsKey(jobId: string): string {
  return `command_surface:stream:${jobId}:events`
}

async function getRedisClient(): Promise<RedisClientType | null> {
  if (!REDIS_ENABLED) return null
  if (redisClient?.isOpen) return redisClient
  if (redisConnecting) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return redisClient?.isOpen ? redisClient : null
  }

  try {
    redisConnecting = true

    if (!redisClient) {
      if (REDIS_URL) {
        redisClient = createClient({ url: REDIS_URL })
      } else {
        redisClient = createClient({
          username: 'default',
          password: REDIS_PASSWORD,
          socket: {
            host: REDIS_HOST,
            port: Number.isFinite(REDIS_PORT) && REDIS_PORT > 0 ? REDIS_PORT : 6379,
            connectTimeout: 5000,
          },
        })
      }

      redisClient.on('error', () => {
        // Non-fatal: fallback to memory.
      })
    }

    if (!redisClient.isOpen) {
      await redisClient.connect()
    }

    return redisClient
  } catch {
    return null
  } finally {
    redisConnecting = false
  }
}

function scheduleGC(job: CommandStreamJob) {
  if (job.gcTimer) clearTimeout(job.gcTimer)
  job.gcTimer = setTimeout(() => {
    const store = getStore()
    store.delete(job.id)
  }, JOB_TTL_MS)
}

async function persistJobMeta(job: CommandStreamJob): Promise<void> {
  const redis = await getRedisClient()
  if (!redis) return

  try {
    await redis.hSet(metaKey(job.id), {
      userId: job.userId,
      createdAt: String(job.createdAt),
      done: job.done ? '1' : '0',
    })
    await redis.expire(metaKey(job.id), JOB_TTL_SEC)
  } catch {
    // Non-fatal.
  }
}

async function persistEvent(jobId: string, event: AgentExecutionEvent): Promise<void> {
  const redis = await getRedisClient()
  if (!redis) return

  try {
    await redis.rPush(eventsKey(jobId), JSON.stringify(event))
    await redis.expire(eventsKey(jobId), JOB_TTL_SEC)
    if (event.type === 'done' || event.type === 'error') {
      await redis.hSet(metaKey(jobId), { done: '1' })
      await redis.expire(metaKey(jobId), JOB_TTL_SEC)
    }
  } catch {
    // Non-fatal.
  }
}

export function createCommandStreamJob(userId: string): string {
  const id = crypto.randomUUID()
  const job: CommandStreamJob = {
    id,
    userId,
    createdAt: Date.now(),
    done: false,
    events: [],
    subscribers: new Set(),
  }

  const store = getStore()
  store.set(id, job)
  scheduleGC(job)
  void persistJobMeta(job)

  return id
}

export async function getCommandStreamJob(jobId: string): Promise<CommandStreamJob | null> {
  const store = getStore()
  const inMemory = store.get(jobId)
  if (inMemory) return inMemory

  const redis = await getRedisClient()
  if (!redis) return null

  try {
    const meta = await redis.hGetAll(metaKey(jobId))
    if (!meta?.userId) return null

    const job: CommandStreamJob = {
      id: jobId,
      userId: meta.userId,
      createdAt: Number(meta.createdAt ?? Date.now()),
      done: meta.done === '1',
      events: [],
      subscribers: new Set(),
    }

    store.set(jobId, job)
    scheduleGC(job)
    return job
  } catch {
    return null
  }
}

export async function listCommandStreamEvents(jobId: string): Promise<AgentExecutionEvent[]> {
  const redis = await getRedisClient()
  if (redis) {
    try {
      const rawEvents = await redis.lRange(eventsKey(jobId), 0, -1)
      return rawEvents
        .map((raw) => {
          try {
            return JSON.parse(raw) as AgentExecutionEvent
          } catch {
            return null
          }
        })
        .filter((event): event is AgentExecutionEvent => Boolean(event))
    } catch {
      // Fallback to memory
    }
  }

  const job = getStore().get(jobId)
  if (!job) return []
  return [...job.events]
}

export async function listCommandStreamEventsSince(jobId: string, offset: number): Promise<AgentExecutionEvent[]> {
  const start = Math.max(offset, 0)
  const redis = await getRedisClient()

  if (redis) {
    try {
      const rawEvents = await redis.lRange(eventsKey(jobId), start, -1)
      return rawEvents
        .map((raw) => {
          try {
            return JSON.parse(raw) as AgentExecutionEvent
          } catch {
            return null
          }
        })
        .filter((event): event is AgentExecutionEvent => Boolean(event))
    } catch {
      // Fallback to memory
    }
  }

  const job = getStore().get(jobId)
  if (!job) return []
  return job.events.slice(start)
}

export function publishCommandStreamEvent(jobId: string, event: AgentExecutionEvent): void {
  const store = getStore()
  const job = store.get(jobId)

  if (job) {
    job.events.push(event)
    if (job.events.length > 500) {
      job.events = job.events.slice(-500)
    }

    if (event.type === 'done' || event.type === 'error') {
      job.done = true
      scheduleGC(job)
    }

    job.subscribers.forEach((subscriber) => {
      try {
        subscriber(event)
      } catch {
        // Subscriber errors are isolated.
      }
    })
  }

  void persistEvent(jobId, event)
}

// In-memory reverse map: runId → jobId
function getRunToJobMap(): Map<string, string> {
  const g = globalThis as unknown as { __runToJobMap?: Map<string, string> }
  if (!g.__runToJobMap) g.__runToJobMap = new Map()
  return g.__runToJobMap
}

export async function setJobRunId(jobId: string, runId: string): Promise<void> {
  const store = getStore()
  const job = store.get(jobId)
  if (job) job.runId = runId

  getRunToJobMap().set(runId, jobId)

  const redis = await getRedisClient()
  if (!redis) return
  try {
    await redis.hSet(metaKey(jobId), { runId })
    await redis.set(runToJobKey(runId), jobId, { EX: JOB_TTL_SEC })
  } catch {
    // Non-fatal
  }
}

export async function getJobIdByRunId(runId: string): Promise<string | null> {
  // Check in-memory first
  const memResult = getRunToJobMap().get(runId)
  if (memResult) return memResult

  const redis = await getRedisClient()
  if (!redis) return null

  try {
    return await redis.get(runToJobKey(runId))
  } catch {
    return null
  }
}

export function subscribeCommandStream(
  jobId: string,
  onEvent: (event: AgentExecutionEvent) => void,
): (() => void) | null {
  const job = getStore().get(jobId)
  if (!job) return null

  job.subscribers.add(onEvent)
  return () => {
    const current = getStore().get(jobId)
    if (!current) return
    current.subscribers.delete(onEvent)
  }
}
