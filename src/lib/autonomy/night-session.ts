import { access } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { z } from 'zod'

import type { SupabaseClient } from '@supabase/supabase-js'

import { supabaseAdmin } from '@/lib/supabase-server'

const execFileAsync = promisify(execFile)

const PROTECTED_BRANCHES = ['main', 'master', 'develop', 'dev', 'production', 'staging'] as const
const NIGHT_BRANCH_PREFIX = 'autonomy'

export const nightlyAgentSchema = z.object({
  id: z.string().min(1).max(200),
  kind: z.enum(['system', 'custom', 'persona', 'lane']),
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(160),
  expertise: z.array(z.string().min(1).max(120)).max(20).default([]),
  incentives: z.array(z.string().min(1).max(160)).max(20).default([]),
  risk_model: z.string().min(1).max(2000),
  description: z.string().max(1200).optional().nullable(),
  source: z.string().max(120).optional().nullable(),
})

export const nightlyGitStrategySchema = z.object({
  syncBeforeRun: z.boolean().default(true),
  branchPrefix: z.string().min(2).max(40).default(NIGHT_BRANCH_PREFIX),
  allowPush: z.boolean().default(true),
  allowCommit: z.boolean().default(true),
  baseBranch: z.string().min(1).max(120).optional().nullable(),
})

export const nightlySessionRequestSchema = z.object({
  workspace_id: z.string().uuid(),
  selected_agent: nightlyAgentSchema,
  selected_project_ids: z.array(z.string().uuid()).min(1).max(12),
  objective: z.string().trim().max(4000).optional().nullable(),
  git_strategy: nightlyGitStrategySchema.default({}),
})

export type NightlyAgent = z.infer<typeof nightlyAgentSchema>
export type NightlyGitStrategy = z.infer<typeof nightlyGitStrategySchema>
export type NightlySessionRequest = z.infer<typeof nightlySessionRequestSchema>

export interface LaunchProjectOption {
  id: string
  workspace_id: string
  name: string
  slug: string
  description: string | null
  local_path: string
  git_remote: string | null
}

export interface RepoPreflightResult {
  projectId: string
  projectName: string
  localPath: string
  ok: boolean
  reason: string | null
  remote: string | null
  baseBranch: string | null
  currentBranch: string | null
  targetBranch: string | null
  hasUncommittedChanges: boolean
  syncBeforeRun: boolean
  allowPush: boolean
}

interface ProjectRow {
  id: string
  workspace_id: string
  name: string
  slug: string
  description: string | null
  local_path: string | null
  git_remote: string | null
}

interface ProjectRowWithLocalPath extends ProjectRow {
  local_path: string
}

export function isProtectedBranch(branch: string | null | undefined): boolean {
  if (!branch) return false
  return PROTECTED_BRANCHES.includes(branch.trim().toLowerCase() as (typeof PROTECTED_BRANCHES)[number])
}

export function sanitizeBranchSegment(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^[-/]+|[-/]+$/g, '')
    .slice(0, 48)

  return normalized || 'night'
}

export function buildNightBranchName(agent: Pick<NightlyAgent, 'name' | 'id'>, strategy: Pick<NightlyGitStrategy, 'branchPrefix'>, now: Date = new Date()): string {
  const prefix = sanitizeBranchSegment(strategy.branchPrefix || NIGHT_BRANCH_PREFIX)
  const agentSegment = sanitizeBranchSegment(agent.name || agent.id)
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  return `${prefix}/${agentSegment}/${stamp}`
}

async function runGit(projectPath: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd: projectPath,
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  })
  return stdout.trim()
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.R_OK)
    return true
  } catch {
    return false
  }
}

export async function loadNightLaunchProjects(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<LaunchProjectOption[]> {
  const db = supabaseAdmin ?? supabase

  const { data: memberships, error: membershipError } = await db
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .limit(1)

  if (membershipError || !memberships || memberships.length === 0) {
    return []
  }

  const { data: projects, error: projectError } = await db
    .from('foco_projects')
    .select('id, workspace_id, name, slug, description, local_path, git_remote')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)
    .not('local_path', 'is', null)
    .order('name', { ascending: true })

  if (projectError) {
    throw new Error(projectError.message)
  }

  return ((projects ?? []) as ProjectRow[])
    .filter((project): project is ProjectRowWithLocalPath => typeof project.local_path === 'string' && project.local_path.trim().length > 0)
    .map((project) => ({
      id: project.id,
      workspace_id: project.workspace_id,
      name: project.name,
      slug: project.slug,
      description: project.description ?? null,
      local_path: project.local_path.trim(),
      git_remote: project.git_remote ?? null,
    }))
}

export async function preflightProjectRepo(
  project: LaunchProjectOption,
  agent: NightlyAgent,
  strategy: NightlyGitStrategy,
): Promise<RepoPreflightResult> {
  const targetBranch = buildNightBranchName(agent, strategy)
  const result: RepoPreflightResult = {
    projectId: project.id,
    projectName: project.name,
    localPath: project.local_path,
    ok: false,
    reason: null,
    remote: project.git_remote ?? null,
    baseBranch: strategy.baseBranch ?? null,
    currentBranch: null,
    targetBranch,
    hasUncommittedChanges: false,
    syncBeforeRun: strategy.syncBeforeRun,
    allowPush: strategy.allowPush,
  }

  if (!(await pathExists(project.local_path))) {
    result.reason = 'Local path is not readable'
    return result
  }

  try {
    const isGitDir = await runGit(project.local_path, ['rev-parse', '--is-inside-work-tree'])
    if (isGitDir !== 'true') {
      result.reason = 'Project path is not a git worktree'
      return result
    }

    const [currentBranch, statusSummary, remote, originHead] = await Promise.all([
      runGit(project.local_path, ['rev-parse', '--abbrev-ref', 'HEAD']),
      runGit(project.local_path, ['status', '--porcelain']),
      runGit(project.local_path, ['remote', 'get-url', 'origin']).catch(() => ''),
      runGit(project.local_path, ['symbolic-ref', 'refs/remotes/origin/HEAD']).catch(() => ''),
    ])

    result.currentBranch = currentBranch || null
    result.hasUncommittedChanges = statusSummary.length > 0
    result.remote = remote || result.remote

    const resolvedBaseBranch = strategy.baseBranch
      ?? (originHead.replace('refs/remotes/origin/', '').trim() || currentBranch)

    result.baseBranch = resolvedBaseBranch || null

    if (result.hasUncommittedChanges) {
      result.reason = 'Repository has uncommitted changes'
      return result
    }

    if (isProtectedBranch(result.targetBranch) || result.targetBranch === result.baseBranch) {
      result.reason = 'Night branch resolves to a protected branch'
      return result
    }

    if (strategy.allowPush && !result.remote) {
      result.reason = 'Push is enabled but origin remote is missing'
      return result
    }

    result.ok = true
    return result
  } catch (error) {
    result.reason = error instanceof Error ? error.message : 'Git preflight failed'
    return result
  }
}
