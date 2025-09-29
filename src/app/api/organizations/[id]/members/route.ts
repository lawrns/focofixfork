import { NextRequest, NextResponse } from 'next/server'
import { OrganizationsService } from '@/lib/services/organizations'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params

    const result = await OrganizationsService.getOrganizationMembers(id)

    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 403
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
    const { email, role, userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
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


