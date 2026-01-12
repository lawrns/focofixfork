import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

interface SavedFilter {
  id: string
  name: string
  workspace_id: string
  filters: Record<string, any>
  created_by: string
  created_at: string
  updated_at: string
}

// In-memory storage for demo purposes. Replace with database in production
const savedFilters: Map<string, SavedFilter> = new Map()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const filterId = params.id
    const filter = savedFilters.get(filterId)

    if (!filter) {
      return NextResponse.json(
        { error: 'Filter not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (filter.created_by !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, filters: filterConditions } = body

    const updatedFilter: SavedFilter = {
      ...filter,
      ...(name && { name }),
      ...(filterConditions && { filters: filterConditions }),
      updated_at: new Date().toISOString(),
    }

    savedFilters.set(filterId, updatedFilter)

    return NextResponse.json({
      success: true,
      data: updatedFilter,
    })
  } catch (error) {
    console.error('Error updating saved filter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const filterId = params.id
    const filter = savedFilters.get(filterId)

    if (!filter) {
      return NextResponse.json(
        { error: 'Filter not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (filter.created_by !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    savedFilters.delete(filterId)

    return NextResponse.json({
      success: true,
      data: { id: filterId },
    })
  } catch (error) {
    console.error('Error deleting saved filter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
