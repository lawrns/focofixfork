import { NextRequest, NextResponse } from 'next/server'
import { settingsService } from '@/lib/services/settings.service'
export const dynamic = 'force-dynamic'


// GET /api/user/audit-log - Get user audit log
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const action = searchParams.get('action') || undefined

    const auditLog = await settingsService.getUserAuditLog(limit, offset, action)

    return NextResponse.json({ data: auditLog })
  } catch (error) {
    console.error('GET /api/user/audit-log error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch audit log' },
      { status: 500 }
    )
  }
}

