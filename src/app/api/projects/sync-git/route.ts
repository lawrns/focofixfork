/**
 * POST /api/projects/sync-git
 *
 * Scans PROJECTS_BASE_DIR (default: /home/laurence) for git repos,
 * then upserts each as a foco_project with source='git'.
 */

import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
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
    // Find the [remote "origin"] section and extract url
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
  const baseDir = process.env.PROJECTS_BASE_DIR ?? '/home/laurence'

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true })
  } catch (e) {
    return mergeAuthResponse(
      NextResponse.json({ error: `Cannot read base dir: ${e}` }, { status: 500 }),
      authResponse
    )
  }

  const synced: { name: string; slug: string; id?: string }[] = []
  const errors: string[] = []

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
            owner_id: user.id,
            status: 'active',
          },
          { onConflict: 'workspace_id,slug', ignoreDuplicates: false }
        )
        .select('id, name, slug')
        .single()

      if (upsertErr) {
        errors.push(`${name}: ${upsertErr.message}`)
      } else if (data) {
        synced.push({ name: data.name as string, slug: data.slug as string, id: data.id as string })
      }
    } catch (e) {
      errors.push(`${name}: ${String(e)}`)
    }
  }

  return mergeAuthResponse(
    NextResponse.json({ synced, errors, base_dir: baseDir }),
    authResponse
  )
}
