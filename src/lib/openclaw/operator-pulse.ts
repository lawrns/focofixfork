/**
 * OpenClaw Operator Pulse
 *
 * Aggregates gateway health, cron job state, and workspace status
 * into a single "pulse" object for the operator dashboard.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { getOpenClawServerConfig } from './config'
import { listOpenClawCrons, getOpenClawCronRuns, formatSchedule } from './cron-client'
import type { CronSchedule, CronJobState, CronRunLogEntry, OpenClawCronJob } from './cron-client'

/* ─── Types ─────────────────────────────────────────────────────── */

export type CronTrust = 'healthy' | 'degraded' | 'failing' | 'unknown'

export interface OpenClawCronJobPulse {
  id: string
  name: string
  description: string | undefined
  enabled: boolean
  schedule: string
  scheduleRaw: CronSchedule
  lastRunAt: string | null
  lastRunStatus: 'ok' | 'error' | 'skipped' | null
  lastRunDurationMs: number | null
  nextRunAt: string | null
  isRunning: boolean
  consecutiveErrors: number
  delivered: boolean | null
  deliveryMode: string
  deliveryTarget: string | null
  recentRuns: CronRunLogEntry[]
  trust: CronTrust
}

export interface OpenClawOperatorAlert {
  level: 'critical' | 'warning' | 'info'
  message: string
  source: string
  at: string
}

export interface OpenClawGatewayPulse {
  healthy: boolean
  url: string
  version: string | null
  primaryModel: string | null
  tokenConfigured: boolean
  attachedTabs: number
  heartbeatInterval: string | null
}

export interface OpenClawOperatorPulse {
  generatedAt: string
  gateway: OpenClawGatewayPulse
  crons: {
    total: number
    enabled: number
    healthy: number
    degraded: number
    failing: number
    unknown: number
    jobs: OpenClawCronJobPulse[]
  }
  workspace: {
    path: string | null
    files: string[]
  }
  alerts: OpenClawOperatorAlert[]
  /** 0 = dead, 5 = fully operational */
  signalStrength: 0 | 1 | 2 | 3 | 4 | 5
  /** System metrics — injected by the API route (not present from getOpenClawOperatorPulse directly) */
  system?: {
    cpuPercent: number
    memUsedGb: number
    memTotalGb: number
    memPercent: number
  }
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function deriveCronTrust(job: OpenClawCronJob): CronTrust {
  if (!job.enabled) return 'unknown'
  const errs = job.state.consecutiveErrors ?? 0
  const last = job.state.lastRunStatus ?? job.state.lastStatus
  if (errs >= 3 || last === 'error') {
    return errs >= 3 ? 'failing' : 'degraded'
  }
  if (last === 'ok') return 'healthy'
  if (!job.state.lastRunAtMs) return 'unknown'
  return 'healthy'
}

function deriveSignalStrength(
  gatewayHealthy: boolean,
  cronJobs: OpenClawCronJobPulse[],
  alerts: OpenClawOperatorAlert[],
): 0 | 1 | 2 | 3 | 4 | 5 {
  if (!gatewayHealthy) return 0

  const criticalAlerts = alerts.filter(a => a.level === 'critical').length
  if (criticalAlerts >= 2) return 1

  const enabled = cronJobs.filter(j => j.enabled)
  if (enabled.length === 0) return 2

  const failing = enabled.filter(j => j.trust === 'failing').length
  const degraded = enabled.filter(j => j.trust === 'degraded').length

  if (failing > 0) return 2
  if (degraded > 0) return 3
  if (criticalAlerts > 0) return 3

  const healthy = enabled.filter(j => j.trust === 'healthy').length
  const unknown = enabled.filter(j => j.trust === 'unknown').length

  if (healthy === enabled.length) return 5
  if (unknown <= 1) return 4
  return 3
}

function buildAlerts(
  gatewayHealthy: boolean,
  jobs: OpenClawCronJobPulse[],
  now: string,
): OpenClawOperatorAlert[] {
  const alerts: OpenClawOperatorAlert[] = []

  if (!gatewayHealthy) {
    alerts.push({
      level: 'critical',
      message: 'Gateway is unreachable. No tasks can be dispatched.',
      source: 'gateway',
      at: now,
    })
  }

  for (const job of jobs) {
    if (!job.enabled) continue
    if (job.trust === 'failing') {
      alerts.push({
        level: 'critical',
        message: `Cron "${job.name}" has ${job.consecutiveErrors} consecutive failures.`,
        source: `cron:${job.id}`,
        at: now,
      })
    } else if (job.trust === 'degraded') {
      alerts.push({
        level: 'warning',
        message: `Cron "${job.name}" last run errored.`,
        source: `cron:${job.id}`,
        at: now,
      })
    }
    // Overdue check: if nextRunAt is more than 2x the schedule interval in the past
    if (job.nextRunAt) {
      const overdue = Date.now() - new Date(job.nextRunAt).getTime()
      if (overdue > 3600_000 * 2) { // more than 2 hours overdue
        alerts.push({
          level: 'warning',
          message: `Cron "${job.name}" appears overdue (next run was ${Math.floor(overdue / 3600000)}h ago).`,
          source: `cron:${job.id}`,
          at: now,
        })
      }
    }
  }

  return alerts
}

async function listWorkspaceFileNames(workspacePath: string | null): Promise<string[]> {
  if (!workspacePath) return []
  try {
    const entries = await fs.readdir(workspacePath)
    return entries.filter(f => f.endsWith('.md')).sort()
  } catch {
    return []
  }
}

async function probeGateway(
  gatewayUrl: string,
  token: string,
): Promise<{ healthy: boolean; attachedTabs: number }> {
  try {
    // Try the gateway health/status endpoint
    const res = await fetch(`${gatewayUrl}/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>
      const tabs = Array.isArray(body.tabs) ? body.tabs.length :
        Array.isArray(body.attached_tabs) ? body.attached_tabs.length : 0
      return { healthy: true, attachedTabs: tabs }
    }
    // 401/403 still means it's up
    if (res.status === 401 || res.status === 403) {
      return { healthy: true, attachedTabs: 0 }
    }
    return { healthy: false, attachedTabs: 0 }
  } catch {
    return { healthy: false, attachedTabs: 0 }
  }
}

function extractHeartbeatInterval(config: Record<string, unknown>): string | null {
  try {
    const agents = config.agents as Record<string, unknown>
    const defaults = agents?.defaults as Record<string, unknown>
    const heartbeat = defaults?.heartbeat as Record<string, unknown>
    const every = heartbeat?.every
    return typeof every === 'string' ? every : null
  } catch {
    return null
  }
}

function extractPrimaryModelDirect(config: Record<string, unknown>): string | null {
  try {
    const agents = config.agents as Record<string, unknown>
    const defaults = agents?.defaults as Record<string, unknown>
    const model = defaults?.model
    if (typeof model === 'string') return model
    if (typeof model === 'object' && model !== null) {
      const m = model as Record<string, unknown>
      return typeof m.primary === 'string' ? m.primary : null
    }
    return null
  } catch {
    return null
  }
}

/* ─── Main export ────────────────────────────────────────────────── */

export async function getOpenClawOperatorPulse(): Promise<OpenClawOperatorPulse> {
  const now = new Date().toISOString()
  const serverConfig = await getOpenClawServerConfig()
  const rawConfig = serverConfig.config as Record<string, unknown>

  // Probe gateway
  const token = serverConfig.gatewayToken || ''
  const { healthy: gatewayHealthy, attachedTabs } = await probeGateway(
    serverConfig.gatewayUrl,
    token,
  )

  // Read cron jobs (all, including disabled)
  const { jobs: rawJobs } = await listOpenClawCrons({ includeDisabled: true, limit: 100 })

  // Build job pulses (fetch recent runs for each)
  const jobPulses: OpenClawCronJobPulse[] = await Promise.all(
    rawJobs.map(async (job) => {
      const { runs } = await getOpenClawCronRuns(job.id, { limit: 10, sortDir: 'desc' })
      const trust = deriveCronTrust(job)

      const delivery = job.delivery ?? job.payload
      let deliveryMode = 'none'
      let deliveryTarget: string | null = null

      if (job.delivery?.mode && job.delivery.mode !== 'none') {
        deliveryMode = job.delivery.channel ?? job.delivery.mode
        deliveryTarget = job.delivery.to ?? job.delivery.accountId ?? null
      } else if (job.payload.kind === 'agentTurn') {
        const p = job.payload
        if (p.deliver && p.channel) {
          deliveryMode = p.channel
          deliveryTarget = p.to ?? null
        }
      }

      return {
        id: job.id,
        name: job.name,
        description: job.description,
        enabled: job.enabled,
        schedule: formatSchedule(job.schedule),
        scheduleRaw: job.schedule,
        lastRunAt: job.state.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
        lastRunStatus: job.state.lastRunStatus ?? job.state.lastStatus ?? null,
        lastRunDurationMs: job.state.lastDurationMs ?? null,
        nextRunAt: job.state.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : null,
        isRunning: Boolean(job.state.runningAtMs && Date.now() - job.state.runningAtMs < 300_000),
        consecutiveErrors: job.state.consecutiveErrors ?? 0,
        delivered: job.state.lastDelivered ?? null,
        deliveryMode,
        deliveryTarget,
        recentRuns: runs,
        trust,
      } satisfies OpenClawCronJobPulse
    })
  )

  const enabledJobs = jobPulses.filter(j => j.enabled)
  const alerts = buildAlerts(gatewayHealthy, jobPulses, now)
  const signalStrength = deriveSignalStrength(gatewayHealthy, jobPulses, alerts)

  const workspacePath = serverConfig.workspacePath
  const workspaceFiles = await listWorkspaceFileNames(workspacePath)

  return {
    generatedAt: now,
    gateway: {
      healthy: gatewayHealthy,
      url: serverConfig.gatewayUrl,
      version: serverConfig.version,
      primaryModel: extractPrimaryModelDirect(rawConfig),
      tokenConfigured: Boolean(token),
      attachedTabs,
      heartbeatInterval: extractHeartbeatInterval(rawConfig),
    },
    crons: {
      total: jobPulses.length,
      enabled: enabledJobs.length,
      healthy: jobPulses.filter(j => j.trust === 'healthy').length,
      degraded: jobPulses.filter(j => j.trust === 'degraded').length,
      failing: jobPulses.filter(j => j.trust === 'failing').length,
      unknown: jobPulses.filter(j => j.trust === 'unknown').length,
      jobs: jobPulses,
    },
    workspace: {
      path: workspacePath,
      files: workspaceFiles,
    },
    alerts,
    signalStrength,
  }
}
