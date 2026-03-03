import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorizeOpenClawRequest } from '@/lib/security/openclaw-auth'

export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/openclaw/sync — sync jobs from OpenClaw gateway
export async function GET(req: NextRequest) {
  if (!authorizeOpenClawRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspace_id')
  const includeInactive = searchParams.get('include_inactive') === 'true'

  try {
    // Fetch jobs from OpenClaw gateway
    const jobs = await fetchJobsFromGateway(includeInactive)

    // Upsert jobs into automation_jobs table
    const syncResult = await syncJobsToDatabase(jobs, workspaceId)

    return NextResponse.json({
      success: true,
      synced: syncResult.synced,
      created: syncResult.created,
      updated: syncResult.updated,
      failed: syncResult.failed,
      errors: syncResult.errors,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// POST /api/openclaw/sync — manual sync with specific job data
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  if (!authorizeOpenClawRequest(req, rawBody)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = rawBody ? JSON.parse(rawBody) : {}
    const { jobs, workspace_id } = body

    if (!Array.isArray(jobs)) {
      return NextResponse.json({ error: 'jobs array required' }, { status: 400 })
    }

    const syncResult = await syncJobsToDatabase(jobs, workspace_id)

    return NextResponse.json({
      success: true,
      synced: syncResult.synced,
      created: syncResult.created,
      updated: syncResult.updated,
      failed: syncResult.failed,
      errors: syncResult.errors,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// Fetch jobs from OpenClaw gateway
async function fetchJobsFromGateway(includeInactive = false): Promise<OpenClawJob[]> {
  const response = await fetch(`${GATEWAY_URL}/jobs${includeInactive ? '?include_inactive=true' : ''}`, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENCLAW_SERVICE_TOKEN || process.env.BOSUN_SERVICE_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Gateway returned ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  return data.jobs || data.data || []
}

// Sync jobs to database
async function syncJobsToDatabase(
  jobs: OpenClawJob[],
  defaultWorkspaceId?: string | null
): Promise<SyncResult> {
  const supabase = supabaseAdmin()
  const result: SyncResult = {
    synced: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  for (const job of jobs) {
    try {
      // Check if job already exists by external_id
      const { data: existingJob } = await supabase
        .from('automation_jobs')
        .select('id, updated_at')
        .eq('external_id', job.id)
        .maybeSingle()

      const jobData = {
        external_id: job.id,
        name: job.name,
        description: job.description || null,
        job_type: job.type || 'cron',
        schedule: job.schedule || null,
        enabled: job.enabled ?? true,
        handler: job.handler || job.command || 'unknown',
        payload: job.payload || job.config || {},
        policy: job.policy || {},
        project_id: job.project_id || null,
        workspace_id: job.workspace_id || defaultWorkspaceId || null,
        last_run_at: job.last_run_at || null,
        last_status: job.last_status || 'pending',
        next_run_at: job.next_run_at || null,
        metadata: {
          source: 'openclaw_gateway',
          last_synced_at: new Date().toISOString(),
          ...(job.metadata || {}),
        },
      }

      if (existingJob) {
        // Update existing job
        const { error } = await supabase
          .from('automation_jobs')
          .update({
            ...jobData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingJob.id)

        if (error) throw error
        result.updated++
      } else {
        // Create new job
        const { error } = await supabase
          .from('automation_jobs')
          .insert(jobData)

        if (error) throw error
        result.created++
      }

      result.synced++
    } catch (error) {
      result.failed++
      result.errors.push({
        job_id: job.id,
        error: (error as Error).message,
      })
    }
  }

  return result
}

// Types
interface OpenClawJob {
  id: string
  name: string
  description?: string
  type?: 'cron' | 'webhook' | 'event_triggered'
  schedule?: string
  enabled?: boolean
  handler?: string
  command?: string
  payload?: Record<string, unknown>
  config?: Record<string, unknown>
  policy?: Record<string, unknown>
  project_id?: string
  workspace_id?: string
  last_run_at?: string
  last_status?: string
  next_run_at?: string
  metadata?: Record<string, unknown>
}

interface SyncResult {
  synced: number
  created: number
  updated: number
  failed: number
  errors: Array<{ job_id: string; error: string }>
}
