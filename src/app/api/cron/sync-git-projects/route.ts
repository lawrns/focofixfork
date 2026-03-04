/**
 * GET /api/cron/sync-git-projects
 *
 * Periodically scans PROJECTS_BASE_DIR for git repos and upserts them
 * into foco_projects. Designed to be called by:
 *   - systemd timer  (recommended — add to empire-stack or as standalone)
 *   - external cron (curl http://localhost:4000/api/cron/sync-git-projects)
 *   - next.config.js cron routes (Vercel)
 *
 * Authorization: Bearer $CRON_SECRET  (skipped if CRON_SECRET is unset)
 */

import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function readGitOrigin(repoPath: string): string | null {
  try {
    const configPath = path.join(repoPath, '.git', 'config')
    const config = fs.readFileSync(configPath, 'utf-8')
    const sectionIdx = config.indexOf('[remote "origin"]')
    if (sectionIdx === -1) return null
    const after = config.slice(sectionIdx)
    const urlMatch = after.match(/url\s*=\s*(.+)/)
    return urlMatch ? urlMatch[1].split('\n')[0].trim() || null : null
  } catch {
    return null
  }
}

function readGitBranch(repoPath: string): string | null {
  try {
    const head = fs.readFileSync(path.join(repoPath, '.git', 'HEAD'), 'utf-8').trim()
    return head.startsWith('ref: refs/heads/') ? head.slice('ref: refs/heads/'.length) : null
  } catch {
    return null
  }
}

async function runSync() {
  if (!supabaseAdmin) throw new Error('supabaseAdmin not available — SUPABASE_SERVICE_ROLE_KEY missing')

  // Find the first workspace (single-tenant setup)
  const { data: workspace } = await supabaseAdmin
    .from('foco_workspaces')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!workspace) throw new Error('No workspace found')

  // Get the workspace owner from members table (foco_workspaces has no owner_id column)
  const { data: ownerMember } = await supabaseAdmin
    .from('foco_workspace_members')
    .select('user_id')
    .eq('workspace_id', workspace.id)
    .eq('role', 'owner')
    .maybeSingle()

  const ownerId = ownerMember?.user_id ?? null

  const baseDir = process.env.PROJECTS_BASE_DIR ?? '/home/laurence'
  const entries = fs.readdirSync(baseDir, { withFileTypes: true })

  const synced: string[] = []
  const errors: string[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const repoPath = path.join(baseDir, entry.name)
    if (!fs.existsSync(path.join(repoPath, '.git'))) continue

    const name = entry.name
    const slug = toSlug(name)
    const origin = readGitOrigin(repoPath)
    const branch = readGitBranch(repoPath)

    const description = [
      'source:git',
      origin ? `origin:${origin}` : null,
      branch ? `branch:${branch}` : null,
    ].filter(Boolean).join(' | ')

    const { error: upsertErr } = await supabaseAdmin
      .from('foco_projects')
      .upsert(
        {
          workspace_id: workspace.id,
          name,
          slug,
          description,
          owner_id: ownerId,
          status: 'active',
        },
        { onConflict: 'workspace_id,slug', ignoreDuplicates: false }
      )

    if (upsertErr) {
      errors.push(`${name}: ${upsertErr.message}`)
    } else {
      synced.push(name)
    }
  }

  return { synced, errors, base_dir: baseDir }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runSync()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron/sync-git-projects]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
