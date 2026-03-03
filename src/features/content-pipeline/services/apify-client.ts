import crypto from 'crypto'
import { assertEgressAllowed } from '@/lib/security/egress-filter'
import type { RawContentItem } from '../types'

const APIFY_BASE_URL = 'https://api.apify.com/v2'

export interface ApifyRunResult {
  runId: string
  status: string
  defaultDatasetId?: string
}

function getApifyToken(): string {
  return process.env.APIFY_TOKEN ?? ''
}

function getActorId(config: Record<string, unknown>): string {
  const actorId = String(config.actor_id ?? '').trim()
  if (!actorId) {
    throw new Error('Missing provider_config.actor_id for Apify source')
  }
  return actorId
}

function getActorInput(config: Record<string, unknown>): Record<string, unknown> {
  const input = config.actor_input
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {}
  }
  return input as Record<string, unknown>
}

export async function startApifyRun(
  config: Record<string, unknown>,
  options: { waitForFinishSeconds?: number } = {}
): Promise<ApifyRunResult> {
  const token = getApifyToken()
  if (!token) throw new Error('APIFY_TOKEN is not configured')

  const actorId = getActorId(config)
  const waitForFinish = options.waitForFinishSeconds ?? 0
  const url = `${APIFY_BASE_URL}/acts/${encodeURIComponent(actorId)}/runs?waitForFinish=${waitForFinish}`
  assertEgressAllowed(url)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(getActorInput(config)),
    signal: AbortSignal.timeout(45_000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Apify run failed (${response.status}): ${text}`)
  }

  const json = await response.json()
  const data = json.data ?? {}

  return {
    runId: String(data.id),
    status: String(data.status ?? 'RUNNING').toLowerCase(),
    defaultDatasetId: data.defaultDatasetId ? String(data.defaultDatasetId) : undefined,
  }
}

export async function getDatasetItems(datasetId: string): Promise<Record<string, unknown>[]> {
  const token = getApifyToken()
  if (!token) throw new Error('APIFY_TOKEN is not configured')

  const url = `${APIFY_BASE_URL}/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json`
  assertEgressAllowed(url)

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(60_000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Apify dataset fetch failed (${response.status}): ${text}`)
  }

  const data = await response.json()
  if (!Array.isArray(data)) return []
  return data as Record<string, unknown>[]
}

export function mapApifyItemsToRawContent(items: Record<string, unknown>[]): RawContentItem[] {
  return items.map((item, idx) => {
    const title =
      String(item.title ?? item.name ?? item.username ?? item.companyName ?? 'Untitled')
    const published =
      String(item.publishedAt ?? item.date ?? item.createdAt ?? '') || undefined
    const externalRaw =
      item.id ?? item.url ?? item.link ?? item.postUrl ?? item.handle ?? `${Date.now()}-${idx}`
    const externalId = crypto.createHash('sha256').update(String(externalRaw)).digest('hex')

    return {
      external_id: externalId,
      title,
      content: JSON.stringify(item),
      published_at: published,
    }
  })
}

