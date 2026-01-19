'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes of inactivity
const SESSION_CHECK_INTERVAL = 60 * 1000 // Check every 1 minute
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // Refresh token when < 5 minutes until expiry

export function useSessionManager() {
  const router = useRouter()
  const lastActivityRef = useRef<number>(0)
  const sessionCheckTimerRef = useRef<NodeJS.Timeout | null>(null)
  const tokenRefreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  // Check if session has timed out due to inactivity
  const checkSessionTimeout = useCallback(async () => {
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current

    if (timeSinceLastActivity > SESSION_TIMEOUT) {
      console.log('Session timed out due to inactivity')

      // Sign out user
      await supabase.auth.signOut()

      // Redirect to login with timeout message
      router.push('/login?reason=timeout')
    }
  }, [router])

  // Refresh access token proactively
  const refreshTokenIfNeeded = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        return
      }

      // Calculate time until token expiry
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
      const now = Date.now()
      const timeUntilExpiry = expiresAt - now

      // Refresh token if it's about to expire
      if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD && timeUntilExpiry > 0) {
        console.log('Refreshing access token proactively')

        const { data, error } = await supabase.auth.refreshSession()

        if (error) {
          console.error('Token refresh error:', error)

          // If refresh fails, sign out user
          await supabase.auth.signOut()
          router.push('/login?reason=session_expired')
        } else if (data.session) {
          console.log('Token refreshed successfully')
        }
      }
    } catch (error) {
      console.error('Error checking token expiry:', error)
    }
  }, [router])

  // Initialize lastActivityRef on client-side to avoid hydration mismatch
  useEffect(() => {
    if (lastActivityRef.current === 0) {
      lastActivityRef.current = Date.now()
    }
  }, [])

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
    }
  }, [updateActivity])

  // Set up session timeout checker
  useEffect(() => {
    sessionCheckTimerRef.current = setInterval(checkSessionTimeout, SESSION_CHECK_INTERVAL)

    return () => {
      if (sessionCheckTimerRef.current) {
        clearInterval(sessionCheckTimerRef.current)
      }
    }
  }, [checkSessionTimeout])

  // Set up token refresh checker
  useEffect(() => {
    // Check immediately on mount
    refreshTokenIfNeeded()

    // Then check periodically
    tokenRefreshTimerRef.current = setInterval(refreshTokenIfNeeded, SESSION_CHECK_INTERVAL)

    return () => {
      if (tokenRefreshTimerRef.current) {
        clearInterval(tokenRefreshTimerRef.current)
      }
    }
  }, [refreshTokenIfNeeded])

  // Listen to Supabase auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('User signed out, redirecting to login')
        router.push('/login')
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed automatically')
      } else if (event === 'USER_UPDATED') {
        console.log('User data updated')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return {
    updateActivity,
    refreshToken: refreshTokenIfNeeded,
  }
}
