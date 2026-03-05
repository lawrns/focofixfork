import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  badRequestResponse,
  databaseErrorResponse,
  notFoundResponse,
  successResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

async function getUserWorkspaceIds(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
  return { ids: (data ?? []).map((row) => row.workspace_id), error }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response
    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { ids: workspaceIds, error: wsError } = await getUserWorkspaceIds(supabase, user.id)
    if (wsError || workspaceIds.length === 0) {
      return mergeAuthResponse(databaseErrorResponse('Failed to resolve workspace memberships', wsError), authResponse)
    }

    const body = await req.json()
    const updates: Record<string, unknown> = {}
    const allowed = [
      'title',
      'description',
      'status',
      'priority',
      'start_date',
      'due_date',
      'completed_at',
      'project_id',
      'assigned_to',
      'position',
      'tags',
      'metadata',
    ]
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updates[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return mergeAuthResponse(badRequestResponse('No mutable fields provided'), authResponse)
    }

    const { data, error: dbError } = await supabase
      .from('milestones')
      .update(updates)
      .eq('id', params.id)
      .in('workspace_id', workspaceIds)
      .select('*')
      .single()

    if (dbError || !data) {
      return mergeAuthResponse(notFoundResponse('milestone', params.id), authResponse)
    }

    return mergeAuthResponse(successResponse(data), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(databaseErrorResponse('Failed to update milestone', message), authResponse)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response
    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { ids: workspaceIds, error: wsError } = await getUserWorkspaceIds(supabase, user.id)
    if (wsError || workspaceIds.length === 0) {
      return mergeAuthResponse(databaseErrorResponse('Failed to resolve workspace memberships', wsError), authResponse)
    }

    const { data, error: dbError } = await supabase
      .from('milestones')
      .delete()
      .eq('id', params.id)
      .in('workspace_id', workspaceIds)
      .select('id')
      .single()

    if (dbError || !data) {
      return mergeAuthResponse(notFoundResponse('milestone', params.id), authResponse)
    }

    return mergeAuthResponse(successResponse({ deleted: true, id: params.id }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(databaseErrorResponse('Failed to delete milestone', message), authResponse)
  }
}
