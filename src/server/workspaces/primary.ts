import type { SupabaseClient } from '@supabase/supabase-js'
import { hasFounderFullAccess } from '@/lib/auth/founder-access'
import { supabaseAdmin } from '@/lib/supabase-server'

type WorkspaceClient = Pick<SupabaseClient, 'from'>
type WorkspaceUser = {
  id: string
  email?: string | null
  user_metadata?: unknown
}

function founderAccessUser(user: Pick<WorkspaceUser, 'id' | 'email'>) {
  return {
    id: user.id,
    email: user.email ?? undefined,
  }
}

export type PrimaryWorkspaceResolution =
  | {
      ok: true
      workspaceId: string | null
      workspaceIds: string[]
      wasCreated: boolean
    }
  | {
      ok: false
      code: 'DATABASE_ERROR' | 'WORKSPACE_FORBIDDEN' | 'WORKSPACE_NOT_FOUND'
      message: string
      details?: unknown
    }

interface ResolvePrimaryWorkspaceArgs {
  user: WorkspaceUser
  requestedWorkspaceId?: string | null
  createIfMissing?: boolean
  client?: WorkspaceClient | null
}

function workspaceClient(client?: WorkspaceClient | null): WorkspaceClient {
  const resolved = client ?? supabaseAdmin
  if (!resolved) {
    throw new Error('A server-side workspace client is required')
  }
  return resolved
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'projects'
}

function displayNameForWorkspace(user: Pick<WorkspaceUser, 'email' | 'user_metadata'>): string {
  const metadata = user.user_metadata as Record<string, unknown> | undefined
  const raw =
    (typeof metadata?.full_name === 'string' && metadata.full_name) ||
    (typeof metadata?.name === 'string' && metadata.name) ||
    (typeof user.email === 'string' && user.email.split('@')[0]) ||
    'Personal'

  return raw.trim().slice(0, 40) || 'Personal'
}

async function listAccessibleWorkspaceIds(
  client: WorkspaceClient,
  user: Pick<WorkspaceUser, 'id' | 'email'>
): Promise<{ workspaceIds: string[]; error: unknown | null }> {
  if (hasFounderFullAccess(founderAccessUser(user))) {
    const { data, error } = await client
      .from('foco_workspaces')
      .select('id')
      .order('created_at', { ascending: true })

    return {
      workspaceIds: Array.from(new Set((data ?? []).map((row: { id: string | null }) => row.id).filter(Boolean))) as string[],
      error,
    }
  }

  const { data, error } = await client
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return {
    workspaceIds: Array.from(
      new Set((data ?? []).map((row: { workspace_id: string | null }) => row.workspace_id).filter(Boolean))
    ) as string[],
    error,
  }
}

async function workspaceIdExists(client: WorkspaceClient, workspaceId: string): Promise<boolean> {
  const { data, error } = await client
    .from('foco_workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()

  return !error && Boolean(data?.id)
}

async function workspaceSlugExists(client: WorkspaceClient, slug: string): Promise<boolean> {
  const { data, error } = await client
    .from('foco_workspaces')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  return !error && Boolean(data?.id)
}

async function createPersonalWorkspace(
  client: WorkspaceClient,
  user: WorkspaceUser
): Promise<PrimaryWorkspaceResolution> {
  const displayName = displayNameForWorkspace(user)
  const workspaceName = `${displayName} Projects`
  const baseSlug = slugify(`${displayName}-projects`)

  let slug = baseSlug
  for (let counter = 0; counter < 50; counter += 1) {
    const suffix = counter === 0 ? '' : `-${counter + 1}`
    const candidate = `${baseSlug}${suffix}`.slice(0, 60)
    const exists = await workspaceSlugExists(client, candidate)
    if (!exists) {
      slug = candidate
      break
    }
  }

  const { data: createdWorkspace, error: createWorkspaceError } = await client
    .from('foco_workspaces')
    .insert({
      name: workspaceName,
      slug,
      description: 'Auto-created personal workspace used to scope your projects internally.',
    })
    .select('id')
    .single()

  if (createWorkspaceError || !createdWorkspace?.id) {
    return {
      ok: false,
      code: 'DATABASE_ERROR',
      message: 'Failed to create a personal project scope',
      details: createWorkspaceError,
    }
  }

  const { error: membershipError } = await client
    .from('foco_workspace_members')
    .insert({
      workspace_id: createdWorkspace.id,
      user_id: user.id,
      role: 'owner',
    })

  if (membershipError) {
    await client.from('foco_workspaces').delete().eq('id', createdWorkspace.id)
    return {
      ok: false,
      code: 'DATABASE_ERROR',
      message: 'Failed to finalize the personal project scope',
      details: membershipError,
    }
  }

  return {
    ok: true,
    workspaceId: createdWorkspace.id,
    workspaceIds: [createdWorkspace.id],
    wasCreated: true,
  }
}

export async function resolvePrimaryWorkspace(args: ResolvePrimaryWorkspaceArgs): Promise<PrimaryWorkspaceResolution> {
  const client = workspaceClient(args.client)
  const memberships = await listAccessibleWorkspaceIds(client, args.user)

  if (memberships.error) {
    return {
      ok: false,
      code: 'DATABASE_ERROR',
      message: 'Failed to resolve project scope',
      details: memberships.error,
    }
  }

  const workspaceIds = memberships.workspaceIds
  if (args.requestedWorkspaceId) {
    if (workspaceIds.includes(args.requestedWorkspaceId)) {
      return {
        ok: true,
        workspaceId: args.requestedWorkspaceId,
        workspaceIds,
        wasCreated: false,
      }
    }

    if (hasFounderFullAccess(founderAccessUser(args.user)) && await workspaceIdExists(client, args.requestedWorkspaceId)) {
      return {
        ok: true,
        workspaceId: args.requestedWorkspaceId,
        workspaceIds,
        wasCreated: false,
      }
    }

    return {
      ok: false,
      code: workspaceIds.length > 0 ? 'WORKSPACE_FORBIDDEN' : 'WORKSPACE_NOT_FOUND',
      message: workspaceIds.length > 0
        ? 'Requested workspace is not available to this user'
        : 'Requested workspace could not be resolved',
      details: { requestedWorkspaceId: args.requestedWorkspaceId, workspaceIds },
    }
  }

  if (workspaceIds.length > 0) {
    return {
      ok: true,
      workspaceId: workspaceIds[0],
      workspaceIds,
      wasCreated: false,
    }
  }

  if (args.createIfMissing) {
    return createPersonalWorkspace(client, args.user)
  }

  return {
    ok: true,
    workspaceId: null,
    workspaceIds: [],
    wasCreated: false,
  }
}
