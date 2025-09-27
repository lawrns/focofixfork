import { NextRequest, NextResponse } from 'next/server'
import { OrganizationsService } from '@/lib/services/organizations'

interface RouteParams {
  params: {
    id: string
    memberId: string
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, memberId } = params
    const body = await request.json()
    const { role } = body

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role is required' },
        { status: 400 }
      )
    }

    const result = await OrganizationsService.updateMemberRole(id, memberId, { role })

    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 403
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Organization member PUT API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, memberId } = params

    const result = await OrganizationsService.removeMember(id, memberId)

    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 403
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Organization member DELETE API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


