import { assertEgressAllowed } from '@/lib/security/egress-filter'

const N8N_URL = process.env.N8N_URL ?? 'http://127.0.0.1:5678'
const N8N_API_KEY = process.env.N8N_API_KEY ?? ''

export interface N8nWorkflowSummary {
  id: string
  name: string
  active: boolean
  updatedAt: string | null
  tags: string[]
}

export interface N8nRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Record<string, string | number | boolean | null | undefined>
  body?: unknown
  timeoutMs?: number
}

function buildUrl(path: string, query?: N8nRequestOptions['query']): string {
  const base = N8N_URL.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${base}${normalizedPath}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

export function assertN8nConfigured(): void {
  if (!N8N_API_KEY) {
    throw new Error('N8N_API_KEY is not configured')
  }
}

export async function n8nRequest<T = unknown>(
  path: string,
  options: N8nRequestOptions = {}
): Promise<T> {
  assertN8nConfigured()

  const url = buildUrl(path, options.query)
  assertEgressAllowed(url)

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': N8N_API_KEY,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
  })

  const text = await res.text().catch(() => '')
  const parsed = (() => {
    try {
      return text ? JSON.parse(text) : {}
    } catch {
      return { message: text || 'Invalid JSON response from n8n' }
    }
  })()

  if (!res.ok) {
    const msg = parsed?.message || parsed?.error || `n8n HTTP ${res.status}`
    throw new Error(msg)
  }

  return parsed as T
}

export function normalizeWorkflows(payload: {
  data?: Array<{
    id?: string
    name?: string
    active?: boolean
    updatedAt?: string
    tags?: Array<{ name?: string }>
  }>
}) {
  return (payload.data ?? []).map((w): N8nWorkflowSummary => ({
    id: w.id ?? '',
    name: w.name ?? '',
    active: w.active ?? false,
    updatedAt: w.updatedAt ?? null,
    tags: (w.tags ?? []).map((t) => t.name ?? '').filter(Boolean),
  }))
}

