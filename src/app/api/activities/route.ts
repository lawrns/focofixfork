import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // TODO: Implement activities table and query
    // For now, return empty array to prevent 404 errors
    // The activities table needs to be created in the database
    const activities: any[] = []

    return NextResponse.json({
      success: true,
      data: activities,
    })
  } catch (error: any) {
    console.error('Activities API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
