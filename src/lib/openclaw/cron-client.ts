/**
 * OpenClaw Cron Client
 *
 * Direct file-based client for OpenClaw cron operations.
 * Reads/writes cron jobs from ~/.openclaw/cron/jobs.json
 * Uses OpenClaw CLI for run operations.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { getOpenClawServerConfig } from './config'

const execAsync = promisify(exec)

// Types matching OpenClaw's cron system
export type CronSchedule =
  | { kind: 'at'; at: string }
  | { kind: 'every'; everyMs: number; anchorMs?: number }
  | { kind: 'cron'; expr: string; tz?: string; staggerMs?: number }

export type CronPayload =
  | { kind: 'systemEvent'; text: string }
  | {
      kind: 'agentTurn'
      message: string
      model?: string
      thinking?: string
      timeoutSeconds?: number
      allowUnsafeExternalContent?: boolean
      deliver?: boolean
      channel?: string
      to?: string
      bestEffortDeliver?: boolean
    }

export type CronDelivery = {
  mode: 'none' | 'announce' | 'webhook'
  channel?: string
  to?: string
  accountId?: string
  bestEffort?: boolean
}

export type CronJobState = {
  nextRunAtMs?: number
  runningAtMs?: number
  lastRunAtMs?: number
  lastRunStatus?: 'ok' | 'error' | 'skipped'
  lastStatus?: 'ok' | 'error' | 'skipped'
  lastError?: string
  lastDurationMs?: number
  consecutiveErrors?: number
  scheduleErrorCount?: number
  lastDelivered?: boolean
  lastDeliveryStatus?: 'delivered' | 'not-delivered' | 'unknown' | 'not-requested'
  lastDeliveryError?: string
}

export type OpenClawCronJob = {
  id: string
  agentId?: string | null
  sessionKey?: string | null
  name: string
  description?: string
  enabled: boolean
  deleteAfterRun?: boolean
  createdAtMs: number
  updatedAtMs: number
  schedule: CronSchedule
  sessionTarget: 'main' | 'isolated'
  wakeMode: 'next-heartbeat' | 'now'
  payload: CronPayload
  delivery?: CronDelivery
  state: CronJobState
}

export type CronStoreFile = {
  version: 1
  jobs: OpenClawCronJob[]
}

export type CronRunLogEntry = {
  ts: number
  jobId: string
  action: 'finished'
  status?: 'ok' | 'error' | 'skipped'
  error?: string
  summary?: string
  delivered?: boolean
  deliveryStatus?: 'delivered' | 'not-delivered' | 'unknown' | 'not-requested'
  deliveryError?: string
  sessionId?: string
  sessionKey?: string
  runAtMs?: number
  durationMs?: number
  nextRunAtMs?: number
  model?: string
  provider?: string
  jobName?: string
}

// Get the path to OpenClaw's cron jobs file
async function getCronStorePath(): Promise<string> {
  const config = await getOpenClawServerConfig()
  const openClawDir = path.dirname(config.configPath)
  return path.join(openClawDir, 'cron', 'jobs.json')
}

// Read the cron store file
async function readCronStore(): Promise<CronStoreFile> {
  const storePath = await getCronStorePath()
  try {
    const raw = await fs.readFile(storePath, 'utf8')
    const data = JSON.parse(raw) as Record<string, unknown>
    
    // Handle legacy format or invalid data
    if (!data.jobs || !Array.isArray(data.jobs)) {
      return { version: 1, jobs: [] }
    }

    // Migrate any legacy jobs
    const jobs: OpenClawCronJob[] = []
    for (const job of data.jobs) {
      if (typeof job === 'object' && job !== null) {
        const migrated = migrateLegacyJob(job as Record<string, unknown>)
        if (migrated) {
          jobs.push(migrated)
        }
      }
    }

    return { version: 1, jobs }
  } catch (err) {
    // If file doesn't exist or is invalid, return empty store
    return { version: 1, jobs: [] }
  }
}

// Write the cron store file
async function writeCronStore(store: CronStoreFile): Promise<void> {
  const storePath = await getCronStorePath()
  const dir = path.dirname(storePath)
  
  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true })
  
  // Write atomically
  const tempPath = storePath + '.tmp'
  await fs.writeFile(tempPath, JSON.stringify(store, null, 2), 'utf8')
  await fs.rename(tempPath, storePath)
  
  // Also write backup
  await fs.writeFile(storePath + '.bak', JSON.stringify(store, null, 2), 'utf8')
}

// Generate a unique job ID
function generateJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Helper to calculate next run time from schedule
function calculateNextRun(schedule: CronSchedule): number | undefined {
  const now = Date.now()
  
  switch (schedule.kind) {
    case 'at':
      const atTime = new Date(schedule.at).getTime()
      return atTime > now ? atTime : undefined
    
    case 'every':
      return now + schedule.everyMs
    
    case 'cron':
      // Simple cron parsing - for now just return now + 1 hour
      // In production, this would use a proper cron parser
      return now + 3600000
    
    default:
      return undefined
  }
}

// Migrate legacy job format to OpenClaw format
function migrateLegacyJob(job: Record<string, unknown>): OpenClawCronJob | null {
  // Skip if already in new format
  if (job.payload && typeof job.payload === 'object') {
    return job as OpenClawCronJob
  }

  // Handle legacy format with 'command' field
  if (typeof job.command === 'string' && typeof job.schedule === 'string') {
    const now = Date.now()
    return {
      id: typeof job.id === 'string' ? job.id : generateJobId(),
      name: typeof job.name === 'string' ? job.name : 'Migrated Job',
      description: `Migrated from legacy cron. Command: ${job.command.slice(0, 100)}`,
      enabled: typeof job.enabled === 'boolean' ? job.enabled : false,
      createdAtMs: now,
      updatedAtMs: now,
      schedule: { kind: 'cron', expr: job.schedule, tz: 'America/Mexico_City' },
      sessionTarget: 'isolated',
      wakeMode: 'next-heartbeat',
      payload: {
        kind: 'systemEvent',
        text: `Execute: ${job.command}`,
      },
      delivery: { mode: 'none' },
      state: {
        nextRunAtMs: calculateNextRun({ kind: 'cron', expr: job.schedule }),
      },
    }
  }

  return null
}

// Check if job has required OpenClaw format fields
function hasOpenClawJobFields(job: Record<string, unknown>): boolean {
  const hasId = typeof job.id === 'string'
  const hasName = typeof job.name === 'string'
  const hasSchedule = job.schedule !== null && job.schedule !== undefined && typeof job.schedule === 'object'
  const hasPayload = job.payload !== null && job.payload !== undefined && typeof job.payload === 'object'
  const hasSessionTarget = typeof job.sessionTarget === 'string' &&
    (job.sessionTarget === 'main' || job.sessionTarget === 'isolated')
  const hasWakeMode = typeof job.wakeMode === 'string' &&
    (job.wakeMode === 'next-heartbeat' || job.wakeMode === 'now')
  return hasId && hasName && hasSchedule && hasPayload && hasSessionTarget && hasWakeMode
}

// List all crons from OpenClaw
export async function listOpenClawCrons(options?: {
  includeDisabled?: boolean
  limit?: number
  offset?: number
  query?: string
  enabled?: 'all' | 'enabled' | 'disabled'
  sortBy?: 'nextRunAtMs' | 'updatedAtMs' | 'name'
  sortDir?: 'asc' | 'desc'
}): Promise<{ jobs: OpenClawCronJob[]; total: number }> {
  const store = await readCronStore()
  // Filter out invalid/legacy jobs and cast valid ones
  let jobs = store.jobs.filter(j => hasOpenClawJobFields(j as Record<string, unknown>)) as OpenClawCronJob[]

  // Filter by enabled status
  const enabledFilter = options?.enabled ?? 'all'
  if (enabledFilter === 'enabled') {
    jobs = jobs.filter(j => j.enabled)
  } else if (enabledFilter === 'disabled') {
    jobs = jobs.filter(j => !j.enabled)
  } else if (!options?.includeDisabled) {
    jobs = jobs.filter(j => j.enabled)
  }

  // Filter by query
  if (options?.query) {
    const q = options.query.toLowerCase()
    jobs = jobs.filter(j => 
      j.name.toLowerCase().includes(q) ||
      j.description?.toLowerCase().includes(q)
    )
  }

  // Sort
  const sortBy = options?.sortBy ?? 'nextRunAtMs'
  const sortDir = options?.sortDir ?? 'asc'
  jobs.sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'updatedAtMs':
        comparison = a.updatedAtMs - b.updatedAtMs
        break
      case 'nextRunAtMs':
      default:
        comparison = (a.state.nextRunAtMs ?? Infinity) - (b.state.nextRunAtMs ?? Infinity)
        break
    }
    return sortDir === 'desc' ? -comparison : comparison
  })

  const total = jobs.length

  // Apply offset and limit
  const offset = options?.offset ?? 0
  const limit = options?.limit ?? 100
  jobs = jobs.slice(offset, offset + limit)

  return { jobs, total }
}

// Get cron status overview
export async function getOpenClawCronStatus(): Promise<{
  enabled: boolean
  jobCount: number
  enabledJobCount: number
}> {
  const store = await readCronStore()
  return {
    enabled: true, // OpenClaw cron service is always enabled if running
    jobCount: store.jobs.length,
    enabledJobCount: store.jobs.filter(j => j.enabled).length,
  }
}

// Add a new cron job
export async function addOpenClawCron(job: {
  name: string
  description?: string
  enabled?: boolean
  schedule: CronSchedule
  sessionTarget?: 'main' | 'isolated'
  wakeMode?: 'next-heartbeat' | 'now'
  payload: CronPayload
  delivery?: CronDelivery
  agentId?: string | null
  sessionKey?: string | null
  deleteAfterRun?: boolean
}): Promise<OpenClawCronJob> {
  const store = await readCronStore()
  const now = Date.now()

  const newJob: OpenClawCronJob = {
    id: generateJobId(),
    name: job.name,
    description: job.description,
    enabled: job.enabled ?? true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: job.schedule,
    sessionTarget: job.sessionTarget ?? 'isolated',
    wakeMode: job.wakeMode ?? 'next-heartbeat',
    payload: job.payload,
    delivery: job.delivery ?? { mode: 'none' },
    agentId: job.agentId,
    sessionKey: job.sessionKey,
    deleteAfterRun: job.deleteAfterRun,
    state: {
      nextRunAtMs: calculateNextRun(job.schedule),
    },
  }

  store.jobs.push(newJob)
  await writeCronStore(store)

  return newJob
}

// Update a cron job
export async function updateOpenClawCron(
  jobId: string,
  patch: {
    name?: string
    description?: string | null
    enabled?: boolean
    schedule?: CronSchedule
    sessionTarget?: 'main' | 'isolated'
    wakeMode?: 'next-heartbeat' | 'now'
    payload?: Partial<CronPayload>
    delivery?: Partial<CronDelivery>
    agentId?: string | null
    sessionKey?: string | null
    deleteAfterRun?: boolean
    state?: Partial<CronJobState>
  }
): Promise<OpenClawCronJob> {
  const store = await readCronStore()
  const jobIndex = store.jobs.findIndex(j => j.id === jobId)

  if (jobIndex === -1) {
    throw new Error(`Cron job not found: ${jobId}`)
  }

  const job = store.jobs[jobIndex]
  const now = Date.now()

  // Apply patch
  if (patch.name !== undefined) job.name = patch.name
  if (patch.description !== undefined) job.description = patch.description ?? undefined
  if (patch.enabled !== undefined) job.enabled = patch.enabled
  if (patch.schedule !== undefined) {
    job.schedule = patch.schedule
    // Recalculate next run when schedule changes
    job.state.nextRunAtMs = calculateNextRun(patch.schedule)
  }
  if (patch.sessionTarget !== undefined) job.sessionTarget = patch.sessionTarget
  if (patch.wakeMode !== undefined) job.wakeMode = patch.wakeMode
  if (patch.payload !== undefined) {
    if (job.payload.kind === 'systemEvent' && patch.payload.kind === 'systemEvent') {
      if ('text' in patch.payload && patch.payload.text !== undefined) {
        job.payload = { ...job.payload, text: patch.payload.text }
      }
    } else if (job.payload.kind === 'agentTurn' && patch.payload.kind === undefined) {
      job.payload = { ...job.payload, ...patch.payload } as CronPayload
    }
  }
  if (patch.delivery !== undefined) job.delivery = { ...job.delivery, ...patch.delivery } as CronDelivery
  if (patch.agentId !== undefined) job.agentId = patch.agentId
  if (patch.sessionKey !== undefined) job.sessionKey = patch.sessionKey
  if (patch.deleteAfterRun !== undefined) job.deleteAfterRun = patch.deleteAfterRun
  if (patch.state !== undefined) job.state = { ...job.state, ...patch.state }

  job.updatedAtMs = now

  await writeCronStore(store)
  return job
}

// Remove a cron job
export async function removeOpenClawCron(jobId: string): Promise<{ removed: boolean }> {
  const store = await readCronStore()
  const initialLength = store.jobs.length
  store.jobs = store.jobs.filter(j => j.id !== jobId)
  
  if (store.jobs.length === initialLength) {
    return { removed: false }
  }
  
  await writeCronStore(store)
  return { removed: true }
}

// Run a cron job immediately using OpenClaw CLI
export async function runOpenClawCron(
  jobId: string,
  mode: 'due' | 'force' = 'force'
): Promise<{ started: boolean }> {
  try {
    // Use OpenClaw CLI to trigger the cron
    const config = await getOpenClawServerConfig()
    const openclawPath = process.env.OPENCLAW_BIN || 'openclaw'
    
    const cmd = `${openclawPath} cron run ${jobId} --mode ${mode}`
    await execAsync(cmd, {
      env: {
        ...process.env,
        OPENCLAW_GATEWAY_TOKEN: config.gatewayToken,
      },
      timeout: 30000,
    })
    
    return { started: true }
  } catch (err) {
    console.error('Failed to run OpenClaw cron:', err)
    throw new Error(`Failed to trigger cron run: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

// Get run history for a cron job
export async function getOpenClawCronRuns(
  jobId: string,
  options?: {
    limit?: number
    offset?: number
    statuses?: ('ok' | 'error' | 'skipped')[]
    status?: 'all' | 'ok' | 'error' | 'skipped'
    sortDir?: 'asc' | 'desc'
  }
): Promise<{ runs: CronRunLogEntry[]; total: number }> {
  const config = await getOpenClawServerConfig()
  const openClawDir = path.dirname(config.configPath)
  const logPath = path.join(openClawDir, 'cron-logs', `${jobId}.jsonl`)

  try {
    let runs: CronRunLogEntry[] = []
    
    try {
      const raw = await fs.readFile(logPath, 'utf8')
      runs = raw
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line) as CronRunLogEntry)
    } catch {
      // Log file doesn't exist yet, return empty array
      runs = []
    }

    // Filter by status
    const statusFilter = options?.status ?? 'all'
    if (statusFilter !== 'all') {
      runs = runs.filter(r => r.status === statusFilter)
    }
    if (options?.statuses) {
      runs = runs.filter(r => r.status && options.statuses?.includes(r.status))
    }

    // Sort
    const sortDir = options?.sortDir ?? 'desc'
    runs.sort((a, b) => {
      const comparison = a.ts - b.ts
      return sortDir === 'desc' ? -comparison : comparison
    })

    const total = runs.length

    // Apply offset and limit
    const offset = options?.offset ?? 0
    const limit = options?.limit ?? 20
    runs = runs.slice(offset, offset + limit)

    return { runs, total }
  } catch (err) {
    console.error('Failed to read cron runs:', err)
    return { runs: [], total: 0 }
  }
}

// Helper to convert traditional cron expression to OpenClaw schedule
export function parseCronExpression(expr: string): CronSchedule {
  return { kind: 'cron', expr, tz: 'America/Mexico_City' }
}

// Helper to format schedule for display
export function formatSchedule(schedule: CronSchedule): string {
  switch (schedule.kind) {
    case 'at':
      return `At ${new Date(schedule.at).toLocaleString()}`
    case 'every':
      const minutes = Math.floor(schedule.everyMs / 60000)
      const hours = Math.floor(schedule.everyMs / 3600000)
      if (hours >= 1) return `Every ${hours}h`
      return `Every ${minutes}m`
    case 'cron':
      return schedule.expr
    default:
      return 'Unknown'
  }
}

// Helper to get next run time as ISO string
export function getNextRunIso(state: CronJobState): string | null {
  if (state.nextRunAtMs) {
    return new Date(state.nextRunAtMs).toISOString()
  }
  return null
}

// Helper to get last run time as ISO string
export function getLastRunIso(state: CronJobState): string | null {
  if (state.lastRunAtMs) {
    return new Date(state.lastRunAtMs).toISOString()
  }
  return null
}
