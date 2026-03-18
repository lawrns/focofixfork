import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { hasFounderFullAccess } from '@/lib/auth/founder-access'
import { authRequiredResponse, badRequestResponse } from '@/lib/api/response-helpers'
import { listProjectDelegationQueue, queueProjectTasksForDelegation } from '@/lib/delegation/queue'
import { accessFailureResponse, requireProjectAccess } from '@/server/auth/access'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params
  const { user, error, response: authResponse } = await getAuthUser(_req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  if (!hasFounderFullAccess(user)) {
    const access = await requireProjectAccess({ projectId })
    if (!access.ok) return accessFailureResponse(access)
  }

  try {
    const items = await listProjectDelegationQueue(projectId)
    return NextResponse.json({
      ok: true,
      data: {
        items,
        permissions: {
          canQueue: true,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load AI queue'
    return NextResponse.json({ ok: false, error: { message } }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  if (!hasFounderFullAccess(user)) {
    const access = await requireProjectAccess({ projectId })
    if (!access.ok) return accessFailureResponse(access)
  }

  const body = await req.json().catch(() => ({}))
  const rawTaskIds = Array.isArray(body?.task_ids)
    ? body.task_ids
    : typeof body?.task_id === 'string'
      ? [body.task_id]
      : []
  const taskIds = rawTaskIds.filter((taskId: unknown): taskId is string => typeof taskId === 'string' && taskId.trim().length > 0)

  if (taskIds.length === 0) {
    return badRequestResponse('task_ids is required')
  }

  try {
    const items = await queueProjectTasksForDelegation({
      projectId,
      taskIds,
      actorId: user.id,
    })

    return NextResponse.json({
      ok: true,
      data: {
        queued_task_ids: taskIds,
        items,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to queue tasks for AI delegation'
    return NextResponse.json({ ok: false, error: { message } }, { status: 500 })
  }
}
