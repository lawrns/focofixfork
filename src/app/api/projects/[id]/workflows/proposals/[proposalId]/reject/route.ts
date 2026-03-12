import { NextRequest, NextResponse } from 'next/server'
import { notFoundResponse } from '@/lib/api/response-helpers'
import { getWorkflowProposal, updateWorkflowProposal } from '@/lib/n8n/project-workflows'
import { accessFailureResponse, requireProjectAccess } from '@/server/auth/access'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string; proposalId: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: projectId, proposalId } = await params
  const access = await requireProjectAccess({ projectId, minimumRole: 'admin' })
  if (!access.ok) return accessFailureResponse(access)

  try {
    const proposal = await getWorkflowProposal(projectId, proposalId)
    if (!proposal) return notFoundResponse('Workflow proposal', proposalId)

    const body = await req.json().catch(() => ({}))
    const updated = await updateWorkflowProposal(proposal.id, {
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: typeof body?.reason === 'string' ? body.reason : null,
    })

    return NextResponse.json({ ok: true, data: { proposal: updated } })
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : 'Failed to reject workflow proposal'
    return NextResponse.json({ ok: false, error: { message } }, { status: 500 })
  }
}
