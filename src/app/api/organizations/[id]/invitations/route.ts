import { NextRequest, NextResponse } from 'next/server'
import { OrganizationsService } from '@/lib/services/organizations'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract user ID from headers (set by middleware)
    let userId = request.headers.get('x-user-id')

    const { id: organizationId } = params
    const body = await request.json()
    const { email, role, message, userId: bodyUserId } = body

    // Fallback to userId from request body if header is not set
    if (!userId && bodyUserId) {
      userId = bodyUserId
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: 'Email and role are required' },
        { status: 400 }
      )
    }

    const result = await OrganizationsService.inviteMember(organizationId, {
      email,
      role
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Invite member API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}