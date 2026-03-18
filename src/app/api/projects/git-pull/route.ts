/**
 * POST /api/projects/git-pull
 *
 * Runs `git fetch && git pull --ff-only` on a project's local_path.
 * Body: { project_id?: string, slug?: string }
 *
 * Returns: { success, stdout, stderr, project_id, local_path }
 */

import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, badRequestResponse, internalErrorResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) {
    return mergeAuthResponse(authRequiredResponse(), authResponse)
  }

  const db = supabaseAdmin ?? supabase

  const body = await req.json().catch(() => ({}))
  const projectId = typeof body?.project_id === 'string' ? body.project_id : null
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : null

  if (!projectId && !slug) {
    return mergeAuthResponse(badRequestResponse('project_id or slug required'), authResponse)
  }

  // Look up the project
  let query = db
    .from('foco_projects')
    .select('id, slug, local_path')

  if (projectId) {
    query = query.eq('id', projectId)
  } else {
    query = query.eq('slug', slug!)
  }

  const { data: project, error: dbError } = await query.maybeSingle()

  if (dbError) {
    return mergeAuthResponse(internalErrorResponse(dbError.message), authResponse)
  }

  if (!project?.local_path) {
    return mergeAuthResponse(
      NextResponse.json({ error: 'Project not found or has no local_path' }, { status: 404 }),
      authResponse
    )
  }

  const localPath = project.local_path as string

  if (!fs.existsSync(localPath) || !fs.existsSync(`${localPath}/.git`)) {
    return mergeAuthResponse(
      NextResponse.json({ error: `Not a git repo: ${localPath}` }, { status: 422 }),
      authResponse
    )
  }

  try {
    // Fetch first (non-destructive), then fast-forward pull
    const { stdout: fetchOut, stderr: fetchErr } = await execAsync('git fetch origin', {
      cwd: localPath,
      timeout: 30_000,
    })

    const { stdout: pullOut, stderr: pullErr } = await execAsync('git pull --ff-only', {
      cwd: localPath,
      timeout: 30_000,
    })

    const stdout = [fetchOut, pullOut].filter(Boolean).join('\n')
    const stderr = [fetchErr, pullErr].filter(Boolean).join('\n')

    // Update the description in DB with latest branch info
    const branch = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: localPath }).then(
      r => r.stdout.trim()
    ).catch(() => null)

    if (branch) {
      const origin = await execAsync('git remote get-url origin', { cwd: localPath }).then(
        r => r.stdout.trim()
      ).catch(() => null)

      const description = [
        'source:git',
        origin ? `origin:${origin}` : null,
        `branch:${branch}`,
      ].filter(Boolean).join(' | ')

      await db
        .from('foco_projects')
        .update({ description, updated_at: new Date().toISOString() })
        .eq('id', project.id as string)
    }

    return mergeAuthResponse(
      NextResponse.json({
        success: true,
        stdout,
        stderr,
        project_id: project.id,
        local_path: localPath,
      }),
      authResponse
    )
  } catch (err: any) {
    const message = err?.stderr || err?.message || String(err)
    return mergeAuthResponse(
      NextResponse.json({ success: false, error: message }, { status: 422 }),
      authResponse
    )
  }
}
