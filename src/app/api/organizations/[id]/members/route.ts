import { NextRequest, NextResponse } from 'next/server'
import { OrganizationsService } from '@/lib/services/organizations'
import { checkOrganizationMembership } from '@/lib/middleware/authorization'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // SECURITY FIX: Verify user is a member of this organization
    const isMember = await checkOrganizationMembership(userId, id)
    if (!isMember) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Not a member of this organization' },
        { status: 403 }
      )
    }

    const result = await OrganizationsService.getOrganizationMembers(id)

    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 500
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Organization members GET API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const body = await request.json()
    const { email, role } = body

    // SECURITY FIX: Get userId from headers, not request body
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // SECURITY FIX: Verify user can manage organization members
    const { canManageOrganizationMembers } = await import('@/lib/middleware/authorization')
    const canManage = await canManageOrganizationMembers(userId, id)

    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only owners and admins can invite members' },
        { status: 403 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const result = await OrganizationsService.inviteMember(id, userId, { email, role })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Organization members POST API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


