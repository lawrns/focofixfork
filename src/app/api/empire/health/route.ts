import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CLAWDBOT_API  = process.env.CLAWDBOT_API_URL         ?? 'http://127.0.0.1:18794'
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
  const clawdbotToken = process.env.OPENCLAW_SERVICE_TOKEN ?? ''
  const temporalUiUrl = `http://127.0.0.1:8233`

  const [clawdbot, openclaw, temporal, n8n, chromadb] = await Promise.all([
    probe('ClawdBot API',   `${CLAWDBOT_API}/health`, {
      headers: clawdbotToken ? { Authorization: `Bearer ${clawdbotToken}` } : undefined,
    }),
    probe('OpenClaw Relay', `${OPENCLAW_URL}/`),
    probe('Temporal',       `${temporalUiUrl}/`),
    probe('n8n',            `${N8N_URL}/healthz`),
    probe('ChromaDB',       `${CHROMADB_URL}/api/v2/heartbeat`),
  ])

  const services: ServiceStatus[] = [clawdbot, openclaw, temporal, n8n, chromadb]
  const upCount = services.filter(s => s.status === 'up').length
  const overallStatus = upCount === services.length ? 'up' : upCount >= 3 ? 'degraded' : 'down'

  return NextResponse.json({
    overall: overallStatus,
    timestamp: new Date().toISOString(),
    services,
  })
}
