/**
 * GET /api/cron/sync-git-projects
 *
 * Periodically scans one or more directories for git repos and upserts them
 * into foco_projects. Designed to be called by:
 *   - systemd timer  (recommended — add to empire-stack or as standalone)
 *   - external cron (curl http://localhost:4000/api/cron/sync-git-projects)
 *   - next.config.js cron routes (Vercel)
 *
 * Authorization: Bearer $CRON_SECRET  (skipped if CRON_SECRET is unset)
 *
 * Env vars:
 *   PROJECTS_BASE_DIRS  comma-separated list of directories to scan (preferred)
 *   PROJECTS_BASE_DIR   single directory fallback (legacy)
 *   Default: /home/laurence
 *
 * ~/.openclaw/workspace is always appended if it exists on disk.
 */

import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
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

function getScanDirs(): string[] {
  const home = os.homedir()

  // Build list from env vars
  const fromEnv = process.env.PROJECTS_BASE_DIRS
    ? process.env.PROJECTS_BASE_DIRS.split(',').map(d => d.trim()).filter(Boolean)
    : process.env.PROJECTS_BASE_DIR
    ? [process.env.PROJECTS_BASE_DIR.trim()]
    : [home]

  // Always include ~/.openclaw/workspace if it exists
  const openclawWorkspace = path.join(home, '.openclaw', 'workspace')
  const dirs = new Set(fromEnv)
  if (fs.existsSync(openclawWorkspace)) {
    dirs.add(openclawWorkspace)
  }

  return Array.from(dirs)
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

  // Get the workspace owner from members table
  const { data: ownerMember } = await supabaseAdmin
    .from('foco_workspace_members')
    .select('user_id')
    .eq('workspace_id', workspace.id)
    .eq('role', 'owner')
    .maybeSingle()

  const ownerId = ownerMember?.user_id ?? null

  const scanDirs = getScanDirs()
  const synced: string[] = []
  const errors: string[] = []

  for (const baseDir of scanDirs) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(baseDir, { withFileTypes: true })
    } catch {
      errors.push(`Cannot read dir ${baseDir}`)
      continue
    }

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
            local_path: repoPath,
            git_remote: origin ?? null,
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
  }

  return { synced, errors, scan_dirs: scanDirs }
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
