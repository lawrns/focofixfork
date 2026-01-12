import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

interface QuickFilterCounts {
  assigned_to_me: number
  created_by_me: number
  due_today: number
  due_this_week: number
  overdue: number
  high_priority: number
  no_assignee: number
  completed: number
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    // For now, return mock data. In production, query the database
    // This would be replaced with actual database queries based on your schema
    const counts: QuickFilterCounts = {
      assigned_to_me: 5,
      created_by_me: 3,
      due_today: 2,
      due_this_week: 8,
      overdue: 1,
      high_priority: 4,
      no_assignee: 6,
      completed: 12,
    }

    return NextResponse.json({
      success: true,
      data: counts,
    })
  } catch (error) {
    console.error('Error fetching quick filter counts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
