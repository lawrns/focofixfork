import { NextRequest, NextResponse } from 'next/server'
import { OrganizationsService } from '@/lib/services/organizations'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from headers (set by middleware)
    let userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const result = await OrganizationsService.getUserOrganizations(userId)

    if (!result.success) {
      return NextResponse.json(result, { status: 403 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Organizations GET API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract user ID from headers (set by middleware)
    let userId = request.headers.get('x-user-id')

    const body = await request.json()
    const { name, userId: bodyUserId } = body

    console.log('Organization creation API called:', { userId, bodyUserId, name })

    // Fallback to userId from request body if header is not set
    if (!userId && bodyUserId) {
      userId = bodyUserId
    }

    if (!userId) {
      console.error('No user ID found')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!name) {
      console.error('No organization name provided')
      return NextResponse.json(
        { success: false, error: 'Organization name is required' },
        { status: 400 }
      )
    }

    console.log('Calling OrganizationsService.createOrganization with:', { name, created_by: userId })
    const result = await OrganizationsService.createOrganization({ name, created_by: userId })
    console.log('OrganizationsService result:', result)

    if (!result.success) {
      console.error('Organization creation failed:', result.error)
      return NextResponse.json(result, { status: 403 })
    }

    console.log('Organization created successfully:', result.data)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Organizations POST API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


