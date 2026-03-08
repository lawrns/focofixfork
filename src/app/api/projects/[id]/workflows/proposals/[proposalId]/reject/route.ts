import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, forbiddenResponse, notFoundResponse } from '@/lib/api/response-helpers'
import { getProjectAccess } from '@/lib/projects/access'
import { getWorkflowProposal, updateWorkflowProposal } from '@/lib/n8n/project-workflows'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string; proposalId: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { id: projectId, proposalId } = await params
  const access = await getProjectAccess(projectId, user)
  if (!access) return mergeAuthResponse(forbiddenResponse('You do not have access to this project'), authResponse)
  if (!access.canReview) return mergeAuthResponse(forbiddenResponse('Only workspace admins can reject workflows'), authResponse)

  try {
    const proposal = await getWorkflowProposal(projectId, proposalId)
    if (!proposal) return mergeAuthResponse(notFoundResponse('Workflow proposal', proposalId), authResponse)

    const body = await req.json().catch(() => ({}))
    const updated = await updateWorkflowProposal(proposal.id, {
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: typeof body?.reason === 'string' ? body.reason : null,
    })

    return mergeAuthResponse(NextResponse.json({ ok: true, data: { proposal: updated } }), authResponse)
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : 'Failed to reject workflow proposal'
    return mergeAuthResponse(NextResponse.json({ ok: false, error: { message } }, { status: 500 }), authResponse)
  }
}
