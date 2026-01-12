import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { data: { session } } = await supabase.auth.getSession()

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

    // Filter by workspace and user
    const filters = Array.from(savedFilters.values()).filter(
      f => f.workspace_id === workspaceId && f.created_by === session.user.id
    )

    return NextResponse.json({
      success: true,
      data: filters,
    })
  } catch (error) {
    console.error('Error fetching saved filters:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, workspace_id, filters } = body

    if (!name || !workspace_id) {
      return NextResponse.json(
        { error: 'name and workspace_id are required' },
        { status: 400 }
      )
    }

    const id = `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    const newFilter: SavedFilter = {
      id,
      name,
      workspace_id,
      filters: filters || {},
      created_by: session.user.id,
      created_at: now,
      updated_at: now,
    }

    savedFilters.set(id, newFilter)

    return NextResponse.json({
      success: true,
      data: newFilter,
    })
  } catch (error) {
    console.error('Error creating saved filter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
