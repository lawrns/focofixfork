import { NextRequest, NextResponse } from 'next/server'
import { settingsService } from '@/lib/services/settings.service'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/organizations/[id]/audit-log - Get organization audit log (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const organizationId = params.id
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const userId = searchParams.get('userId') || undefined

    const auditLog = await settingsService.getOrganizationAuditLog(
      organizationId,
      limit,
      userId
    )

    return NextResponse.json({ data: auditLog })
  } catch (error) {
    console.error('GET /api/organizations/[id]/audit-log error:', error)

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch organization audit log' },
      { status: 500 }
    )
  }
}

