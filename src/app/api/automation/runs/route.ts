import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET /api/automation/runs — list automation runs across all jobs
export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspace_id')
  const jobId = searchParams.get('job_id')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Get user's workspace access
  const { data: memberships } = await supabase
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)

  const accessibleWorkspaceIds = memberships?.map((m) => m.workspace_id) || []

  if (accessibleWorkspaceIds.length === 0) {
    return NextResponse.json({ data: [], count: 0 })
  }

  // Get jobs in accessible workspaces
  let jobQuery = supabase
    .from('automation_jobs')
    .select('id')
    .in('workspace_id', accessibleWorkspaceIds)

  if (workspaceId) {
    jobQuery = jobQuery.eq('workspace_id', workspaceId)
  }

  const { data: accessibleJobs } = await jobQuery
  const accessibleJobIds = accessibleJobs?.map((j) => j.id) || []

  if (accessibleJobIds.length === 0) {
    return NextResponse.json({ data: [], count: 0 })
  }

  // Get runs for accessible jobs
  let query = supabase
    .from('automation_runs')
    .select(`
      *,
      job:automation_jobs(id, name, handler, job_type, workspace_id)
    `)
    .in('job_id', accessibleJobIds)
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (jobId) query = query.eq('job_id', jobId)
  if (status) query = query.eq('status', status)

  const { data, error: dbError } = await query

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data })
}
