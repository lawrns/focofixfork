import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refresh_token } = body

    if (!refresh_token) {
      return NextResponse.json(
        { success: false, error: 'Refresh token is required' },
        { status: 400 }
      )
    }

    // Note: In a real implementation, you'd validate the refresh token
    // For now, we'll rely on Supabase's built-in token refresh
    const result = await AuthService.refreshSession()

    if (!result.success) {
      return NextResponse.json(result, { status: 401 })
    }

    // Update session cookies
    const response = NextResponse.json(result)

    if (result.session) {
      response.cookies.set('sb-access-token', result.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })

      response.cookies.set('sb-refresh-token', result.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })
    }

    return response
  } catch (error) {
    console.error('Auth refresh API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


