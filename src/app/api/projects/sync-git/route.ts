/**
 * POST /api/projects/sync-git
 *
 * Scans one or more directories for git repos,
 * then upserts each as a foco_project with local_path and git_remote populated.
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
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
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
    if (urlMatch) {
      const url = urlMatch[1].split('\n')[0].trim()
      return url || null
    }
    return null
  } catch {
    return null
  }
}

function readGitBranch(repoPath: string): string | null {
  try {
    const headPath = path.join(repoPath, '.git', 'HEAD')
    const head = fs.readFileSync(headPath, 'utf-8').trim()
    if (head.startsWith('ref: refs/heads/')) {
      return head.slice('ref: refs/heads/'.length)
    }
    return null
  } catch {
    return null
  }
}

function getScanDirs(): string[] {
  const home = os.homedir()

  const fromEnv = process.env.PROJECTS_BASE_DIRS
    ? process.env.PROJECTS_BASE_DIRS.split(',').map(d => d.trim()).filter(Boolean)
    : process.env.PROJECTS_BASE_DIR
    ? [process.env.PROJECTS_BASE_DIR.trim()]
    : [home]

  const openclawWorkspace = path.join(home, '.openclaw', 'workspace')
  const dirs = new Set(fromEnv)
  if (fs.existsSync(openclawWorkspace)) {
    dirs.add(openclawWorkspace)
  }

  return Array.from(dirs)
}

export async function POST(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) {
    return mergeAuthResponse(authRequiredResponse(), authResponse)
  }

  if (!supabaseAdmin) {
    return mergeAuthResponse(
      NextResponse.json({ error: 'DB not available' }, { status: 500 }),
      authResponse
    )
  }

  // Resolve workspace for this user
  const { data: memberRow, error: memberErr } = await supabaseAdmin
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberErr || !memberRow?.workspace_id) {
    return mergeAuthResponse(
      NextResponse.json({ error: 'No workspace found for user' }, { status: 404 }),
      authResponse
    )
  }

  const workspaceId = memberRow.workspace_id as string
  const scanDirs = getScanDirs()

  const synced: { name: string; slug: string; id?: string; local_path: string }[] = []
  const errors: string[] = []

  for (const baseDir of scanDirs) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(baseDir, { withFileTypes: true })
    } catch (e) {
      errors.push(`Cannot read dir ${baseDir}: ${e}`)
      continue
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const repoPath = path.join(baseDir, entry.name)
      const gitDir = path.join(repoPath, '.git')
      if (!fs.existsSync(gitDir)) continue

      const name = entry.name
      const slug = toSlug(name)
      const origin = readGitOrigin(repoPath)
      const branch = readGitBranch(repoPath)

      const description = [
        'source:git',
        origin ? `origin:${origin}` : null,
        branch ? `branch:${branch}` : null,
      ].filter(Boolean).join(' | ')

      try {
        const { data, error: upsertErr } = await supabaseAdmin
          .from('foco_projects')
          .upsert(
            {
              workspace_id: workspaceId,
              name,
              slug,
              description,
              local_path: repoPath,
              git_remote: origin ?? null,
              owner_id: user.id,
              status: 'active',
            },
            { onConflict: 'workspace_id,slug', ignoreDuplicates: false }
          )
          .select('id, name, slug, local_path')
          .single()

        if (upsertErr) {
          errors.push(`${name}: ${upsertErr.message}`)
        } else if (data) {
          synced.push({
            name: data.name as string,
            slug: data.slug as string,
            id: data.id as string,
            local_path: data.local_path as string,
          })
        }
      } catch (e) {
        errors.push(`${name}: ${String(e)}`)
      }
    }
  }

  return mergeAuthResponse(
    NextResponse.json({ synced, errors, scan_dirs: scanDirs }),
    authResponse
  )
}
