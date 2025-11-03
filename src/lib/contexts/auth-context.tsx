'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: any) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        // Log initial token state from localStorage
        const tokenExists = !!localStorage.getItem('supabase.auth.token')
        console.log('[AuthInit] Loading initial session. Token in localStorage:', tokenExists ? 'exists (checking validity)' : 'none')

        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('[AuthInit] Error getting session:', error.message)
          setUser(null)
          setSession(null)
        } else if (session) {
          console.log('[AuthInit] Session loaded from storage. User ID:', session.user?.id, 'Token expiry:', session.expires_at)
          setSession(session)
          setUser(session.user)

          // Refresh the session to ensure it's valid
          try {
            console.log('[AuthRefresh] Attempting refresh at', new Date().toISOString())
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
            
            if (refreshError) {
              console.error('[AuthRefresh] Failed with status:', refreshError.status, 'Message:', refreshError.message)
              if (refreshError.status === 400 || refreshError.message.includes('Invalid Refresh Token')) {
                console.log('[AuthRefresh] Invalid token detected - clearing localStorage')
                localStorage.removeItem('supabase.auth.token')
                setUser(null)
                setSession(null)
              }
              throw refreshError
            }
            
            if (refreshedSession && mounted) {
              console.log('[AuthRefresh] Success. New expiry:', refreshedSession.expires_at)
              setSession(refreshedSession)
              setUser(refreshedSession.user)
            }
          } catch (refreshError) {
            console.warn('[AuthRefresh] Exception during refresh:', refreshError)
            // Ensure cleared on any refresh failure
            if (localStorage.getItem('supabase.auth.token')) {
              console.log('[AuthRefresh] Clearing stale token after failure')
              localStorage.removeItem('supabase.auth.token')
              setUser(null)
              setSession(null)
            }
          }
        } else {
          // No session exists - user is not authenticated
          console.log('[AuthInit] No session found - user not authenticated')
          setUser(null)
          setSession(null)
        }
      } catch (error) {
        console.error('[AuthInit] Error in getInitialSession:', error)
        if (mounted) {
          // On error, ensure user is not authenticated
          setUser(null)
          setSession(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return

        const timestamp = new Date().toISOString()
        console.log(`[AuthState] ${timestamp} - Event: ${event}, User: ${session?.user?.id || 'null'}, Session valid: ${!!session && !!session.user}`)

        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle specific auth events
        if (event === 'SIGNED_IN' && session?.user) {
          // User signed in
          console.log(`[AuthState] ${timestamp} - User signed in: ${session.user.id}, Email: ${session.user.email}`)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Token was refreshed
          console.log(`[AuthState] ${timestamp} - Token refreshed for user: ${session.user.id}, New expiry: ${session.expires_at}`)
        } else if (event === 'SIGNED_OUT') {
          console.log(`[AuthState] ${timestamp} - User signed out, clearing storage`)
          localStorage.removeItem('supabase.auth.token')
        }
        // Note: Other events handled by state updates
      }
    )

    // Cleanup subscription on unmount
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) {
        console.error('Error signing in:', error)
        throw error
      }
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })
      if (error) {
        console.error('Error signing up:', error)
        throw error
      }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        throw error
      }
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  const refreshSession = async () => {
    try {
      console.log('[ManualRefresh] Starting manual session refresh at', new Date().toISOString())
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('[ManualRefresh] Failed:', error.status, error.message)
        if (error.status === 400 || error.message.includes('Invalid Refresh Token')) {
          console.log('[ManualRefresh] Invalid token - clearing localStorage and forcing sign-out')
          localStorage.removeItem('supabase.auth.token')
          setUser(null)
          setSession(null)
          await supabase.auth.signOut() // Force clean sign-out
        }
        throw error
      }
      
      if (data.session) {
        console.log('[ManualRefresh] Success. User:', data.session.user.id)
        setSession(data.session)
        setUser(data.session.user)
      } else {
        console.warn('[ManualRefresh] No session returned - user may need to sign in')
        setUser(null)
        setSession(null)
      }
    } catch (error) {
      console.error('[ManualRefresh] Exception:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth()

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (!user) {
      // Redirect to login or show login form
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to access this page.
            </p>
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
            >
              Sign In
            </a>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}


