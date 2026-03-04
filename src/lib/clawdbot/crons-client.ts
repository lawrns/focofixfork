/**
 * ClawdBot Crons Client
 *
 * Shared fetch helpers for all ClawdBot cron endpoints.
 * Single source of truth for cron CRUD and run history.
 */

const CLAWDBOT_BASE = process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794'
const CLAWDBOT_TOKEN = process.env.OPENCLAW_SERVICE_TOKEN ?? ''

function clawdHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (CLAWDBOT_TOKEN) h['Authorization'] = `Bearer ${CLAWDBOT_TOKEN}`
  return h
}

export interface ClawdCron {
  id: string
  name: string
  schedule: string
  handler: string
  description: string
  native: boolean
  enabled: boolean
  log_path?: string
  log_dir?: string
  created_at: string
  last_run_at: string | null
  last_status: string
  next_run_at: string | null
}

export interface ClawdCronRun {
  id: string
  timestamp: string | null
  status: string
  // Hourly-specific
  gateway_ok?: boolean
  file_activity_count?: number
  recent_reports?: string[]
  cron_count?: number | null
  // Daily-intel-specific
  date?: string
  repo_count?: number
  top_repo?: string | null
  top_score?: number | null
  email_sent?: boolean
  summary?: string
  // GSID-specific
  agents_total?: number
  agents_succeeded?: number
  agents_timed_out?: number
  brief_saved?: string | null
  emails_sent?: number
  // User-cron-specific
  output?: string | null
}

/** Fetch all crons with live status from ClawdBot */
export async function getClawdCrons(): Promise<{ crons: ClawdCron[]; count: number }> {
  const res = await fetch(`${CLAWDBOT_BASE}/crons`, {
    headers: clawdHeaders(),
    signal: AbortSignal.timeout(5_000),
  })
  if (!res.ok) throw new Error(`ClawdBot /crons returned ${res.status}`)
  return res.json()
}

/** Create a new cron on ClawdBot */
export async function createClawdCron(body: {
  name: string
  schedule: string
  handler?: string
  description?: string
  enabled?: boolean
}): Promise<ClawdCron> {
  const res = await fetch(`${CLAWDBOT_BASE}/crons`, {
    method: 'POST',
    headers: clawdHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ClawdBot POST /crons returned ${res.status}: ${err}`)
  }
  return res.json()
}

export interface UpdateClawdCronBody {
  enabled?: boolean
  name?: string
  schedule?: string
  description?: string | null
  handler?: string | null
}

/** Update a cron's configuration/status */
export async function patchClawdCron(id: string, body: UpdateClawdCronBody): Promise<ClawdCron> {
  const res = await fetch(`${CLAWDBOT_BASE}/crons/${id}`, {
    method: 'PATCH',
    headers: clawdHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ClawdBot PATCH /crons/${id} returned ${res.status}: ${err}`)
  }
  return res.json()
}

/** Delete a user-created cron */
export async function deleteClawdCron(id: string): Promise<void> {
  const res = await fetch(`${CLAWDBOT_BASE}/crons/${id}`, {
    method: 'DELETE',
    headers: clawdHeaders(),
    signal: AbortSignal.timeout(5_000),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ClawdBot DELETE /crons/${id} returned ${res.status}: ${err}`)
  }
}

/** Fetch run history for a cron from ClawdBot log files */
export async function getClawdCronRuns(
  id: string,
  limit = 20
): Promise<{ runs: ClawdCronRun[]; count: number; cron_id: string }> {
  const res = await fetch(`${CLAWDBOT_BASE}/crons/${id}/runs?limit=${limit}`, {
    headers: clawdHeaders(),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`ClawdBot /crons/${id}/runs returned ${res.status}`)
  return res.json()
}
