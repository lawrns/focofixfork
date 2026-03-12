import { NextRequest, NextResponse } from 'next/server'
import { listProjectWorkflows } from '@/lib/n8n/project-workflows'
import { accessFailureResponse, requireProjectAccess } from '@/server/auth/access'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params
  const access = await requireProjectAccess({ projectId })
  if (!access.ok) return accessFailureResponse(access)

  try {
    const workflows = await listProjectWorkflows(projectId)
    return NextResponse.json({
      ok: true,
      data: {
        workflows,
        permissions: {
          canReview: access.canReview,
        },
      },
    })
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : 'Failed to load project workflows'
    return NextResponse.json({ ok: false, error: { message } }, { status: 500 })
  }
}
