import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client for server-side authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map(cookie => ({
              name: cookie.name,
              value: cookie.value,
            }))
          },
          setAll() {
            // Read-only for GET requests
          },
        },
      }
    )

    // Get the current session
    let { data: { session }, error } = await supabase.auth.getSession()

    // If no session or session is expired, try to refresh
    if (!session || (session?.expires_at && new Date(session.expires_at).getTime() < Date.now())) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      if (!refreshError && refreshData.session) {
        session = refreshData.session
      }
    }

    if (error) {
      console.error('Session API error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve session' },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Calculate expires_in (seconds until expiration)
    const expiresIn = session.expires_at
      ? Math.max(0, Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000))
      : 3600 // Default 1 hour

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at,
          last_sign_in_at: session.user.last_sign_in_at,
        },
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: expiresIn,
        }
      }
    })
  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


