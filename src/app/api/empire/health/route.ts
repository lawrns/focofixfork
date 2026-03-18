import { NextRequest, NextResponse } from 'next/server'
import { ensureHeartbeat } from '@/lib/heartbeat/init'
import { supabaseAdmin } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

// Start heartbeat on first import (this route is polled every 30s by System Pulse)
ensureHeartbeat()

export const dynamic = 'force-dynamic'

const OPENCLAW_URL  = process.env.FOCO_OPENCLAW_RELAY       ?? 'http://127.0.0.1:18792'
const TEMPORAL_ADDR = process.env.TEMPORAL_ADDRESS          ?? '127.0.0.1:7233'
const N8N_URL       = process.env.N8N_URL                   ?? 'http://127.0.0.1:5678'
const CHROMADB_URL  = process.env.CHROMADB_URL              ?? 'http://127.0.0.1:8000'

interface ServiceStatus {
  name: string
  status: 'up' | 'down' | 'degraded'
  latencyMs?: number
  detail?: string
  url: string
}

async function probe(
  name: string,
  url: string,
  options: { timeoutMs?: number; headers?: Record<string, string> } = {}
): Promise<ServiceStatus> {
  const { timeoutMs = 3000, headers } = options
  const start = Date.now()
  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    })
    const latencyMs = Date.now() - start
    return {
      name,
      status: res.ok ? 'up' : 'degraded',
      latencyMs,
      detail: res.ok ? undefined : `HTTP ${res.status}`,
      url,
    }
  } catch (err: unknown) {
    return {
      name,
      status: 'down',
      latencyMs: Date.now() - start,
      detail: err instanceof Error ? err.message : 'unreachable',
      url,
    }
  }
}

export async function GET(_req: NextRequest) {
  const temporalUiUrl = `http://127.0.0.1:8233`

  // Check core services - ClawdBot/CRICO/Bosun migrated to OpenClaw
  const [openclaw, temporal, n8n, chromadb] = await Promise.all([
    probe('OpenClaw', `${OPENCLAW_URL}/`),
    probe('Temporal', `${temporalUiUrl}/`),
    probe('n8n',      `${N8N_URL}/healthz`),
    probe('ChromaDB', `${CHROMADB_URL}/api/v2/heartbeat`),
  ])

  const services: ServiceStatus[] = [openclaw, temporal, n8n, chromadb]
  const upCount = services.filter(s => s.status === 'up').length
  const overallStatus = upCount === services.length ? 'up' : upCount >= 2 ? 'degraded' : 'down'

  let heartbeatsPersisted = false
  if (supabaseAdmin) {
    const { error: heartbeatInsertError } = await supabaseAdmin.from('service_heartbeats').insert(
      services.map((service) => ({
        service: service.name,
        status: service.status,
        latency_ms: service.latencyMs ?? null,
        detail: service.detail ?? null,
        metadata: { url: service.url },
      }))
    )

    if (heartbeatInsertError) {
      logger.warn('[EmpireHealth] Failed to persist service heartbeats', {
        error: heartbeatInsertError.message,
      } as any)
    } else {
      heartbeatsPersisted = true
    }
  }

  return NextResponse.json({
    overall: overallStatus,
    timestamp: new Date().toISOString(),
    services,
    // Legacy fields for backward compatibility
    clawdbot: {
      last_checkin: new Date().toISOString(),
      last_checkin_line: 'Migrated to OpenClaw',
      cron_ran_today: true,
    },
    capabilities: null,
    persistence: {
      heartbeats: heartbeatsPersisted,
      capability_snapshot: false,
    },
  })
}
