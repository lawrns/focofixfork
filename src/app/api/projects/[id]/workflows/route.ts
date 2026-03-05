import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, forbiddenResponse } from '@/lib/api/response-helpers'
import { getProjectAccess } from '@/lib/projects/access'
import { listProjectWorkflows } from '@/lib/n8n/project-workflows'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { id: projectId } = await params
  const access = await getProjectAccess(projectId, user)
  if (!access) return mergeAuthResponse(forbiddenResponse('You do not have access to this project'), authResponse)

  try {
    const workflows = await listProjectWorkflows(projectId)
    return mergeAuthResponse(NextResponse.json({ ok: true, data: { workflows } }), authResponse)
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : 'Failed to load project workflows'
    return mergeAuthResponse(NextResponse.json({ ok: false, error: { message } }, { status: 500 }), authResponse)
  }
}
