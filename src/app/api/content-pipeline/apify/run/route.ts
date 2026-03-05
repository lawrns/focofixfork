import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  badRequestResponse,
  databaseErrorResponse,
  notFoundResponse,
  successResponse,
} from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getDatasetItems, mapApifyItemsToRawContent, startApifyRun } from '@/features/content-pipeline/services/apify-client'
import { SourcePoller } from '@/features/content-pipeline/services/source-poller'
import { resolveWorkspaceScope, scopeProjectIds } from '@/features/content-pipeline/server/workspace-scope'
import { getSourceProviderConfig } from '@/features/content-pipeline/server/source-record'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => ({}))
  const sourceId = String(body.source_id ?? '')
  const waitForFinish = body.wait_for_finish !== false

  if (!sourceId) {
    return mergeAuthResponse(badRequestResponse('source_id is required'), authResponse)
  }

  const { scope, error: scopeError } = await resolveWorkspaceScope(user.id)
  if (scopeError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to resolve workspace scope', scopeError), authResponse)
  }

  const allowedProjectIds = scopeProjectIds(scope)
  if (allowedProjectIds.length === 0) {
    return mergeAuthResponse(notFoundResponse('Content source', sourceId), authResponse)
  }

  const { data: source, error: sourceError } = await supabaseAdmin
    .from('content_sources')
    .select('*')
    .eq('id', sourceId)
    .in('project_id', allowedProjectIds)
    .maybeSingle()

  if (sourceError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to fetch source', sourceError), authResponse)
  }
  if (!source) {
    return mergeAuthResponse(notFoundResponse('Content source', sourceId), authResponse)
  }
  if (source.type !== 'apify') {
    return mergeAuthResponse(badRequestResponse('Source type must be apify'), authResponse)
  }

  try {
    const run = await startApifyRun(getSourceProviderConfig(source), {
      waitForFinishSeconds: waitForFinish ? 120 : 0,
    })

    const { data: runRow, error: runErr } = await supabaseAdmin
      .from('apify_runs')
      .upsert({
        source_id: source.id,
        external_run_id: run.runId,
        dataset_id: run.defaultDatasetId ?? null,
        status: run.status === 'succeeded' ? 'succeeded' : 'running',
        metrics: {},
        started_at: new Date().toISOString(),
        completed_at: run.status === 'succeeded' ? new Date().toISOString() : null,
      }, {
        onConflict: 'source_id,external_run_id',
      })
      .select('*')
      .single()

    if (runErr) {
      return mergeAuthResponse(databaseErrorResponse('Failed to persist Apify run', runErr), authResponse)
    }

    let ingest = { itemsProcessed: 0, itemsNew: 0 }
    if (run.status === 'succeeded' && run.defaultDatasetId) {
      const datasetItems = await getDatasetItems(run.defaultDatasetId)
      const mapped = mapApifyItemsToRawContent(datasetItems)
      ingest = await SourcePoller.processNewItems(source, mapped)

      await supabaseAdmin
        .from('apify_runs')
        .update({
          status: 'succeeded',
          metrics: {
            items_processed: ingest.itemsProcessed,
            items_new: ingest.itemsNew,
          },
          completed_at: new Date().toISOString(),
        })
        .eq('id', runRow.id)
    }

    return mergeAuthResponse(successResponse({
      run: runRow,
      status: run.status,
      ingested: ingest,
    }), authResponse)
  } catch (runError) {
    const message = runError instanceof Error ? runError.message : 'Unknown error'
    return mergeAuthResponse(databaseErrorResponse('Failed to run Apify actor', message), authResponse)
  }
}
