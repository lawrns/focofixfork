import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { badRequestResponse, successResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getDatasetItems, mapApifyItemsToRawContent } from '@/features/content-pipeline/services/apify-client'
import { SourcePoller } from '@/features/content-pipeline/services/source-poller'
import { getSourceWebhookSecret } from '@/features/content-pipeline/server/source-record'

export const dynamic = 'force-dynamic'

function verifyWebhookSecret(req: NextRequest, secret: string): boolean {
  const candidate = req.headers.get('x-apify-webhook-secret') ?? req.nextUrl.searchParams.get('secret') ?? ''
  if (!candidate || !secret) return false
  const ab = Buffer.from(candidate)
  const bb = Buffer.from(secret)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse('Invalid JSON payload')

  const eventData = body.resource ?? body
  const runId = String(eventData.actorRunId ?? eventData.id ?? '')
  const status = String(eventData.status ?? '').toLowerCase()
  const datasetId = String(eventData.defaultDatasetId ?? '')

  if (!runId) return badRequestResponse('Missing actor run id')

  const { data: runRow } = await supabaseAdmin
    .from('apify_runs')
    .select('id, source_id')
    .eq('external_run_id', runId)
    .maybeSingle()

  if (!runRow) {
    return successResponse({ ignored: true, reason: 'run_not_found' })
  }

  const { data: source } = await supabaseAdmin
    .from('content_sources')
    .select('*')
    .eq('id', runRow.source_id)
    .single()

  if (!source) {
    return successResponse({ ignored: true, reason: 'source_not_found' })
  }

  const webhookSecret = getSourceWebhookSecret(source)
  if (webhookSecret && !verifyWebhookSecret(req, webhookSecret)) {
    return badRequestResponse('Invalid webhook secret')
  }

  await supabaseAdmin
    .from('apify_runs')
    .update({
      status: status === 'succeeded' ? 'succeeded' : status === 'aborted' ? 'aborted' : status === 'failed' ? 'failed' : 'running',
      dataset_id: datasetId || null,
      completed_at: ['succeeded', 'aborted', 'failed', 'timed-out'].includes(status)
        ? new Date().toISOString()
        : null,
      error: eventData.statusMessage ? String(eventData.statusMessage) : null,
    })
    .eq('id', runRow.id)

  if (status !== 'succeeded' || !datasetId) {
    return successResponse({ acknowledged: true, ingested: { itemsProcessed: 0, itemsNew: 0 } })
  }

  const items = await getDatasetItems(datasetId)
  const mapped = mapApifyItemsToRawContent(items)
  const ingest = await SourcePoller.processNewItems(source, mapped)

  await supabaseAdmin
    .from('apify_runs')
    .update({
      metrics: {
        items_processed: ingest.itemsProcessed,
        items_new: ingest.itemsNew,
      },
    })
    .eq('id', runRow.id)

  return successResponse({ acknowledged: true, ingested: ingest })
}
