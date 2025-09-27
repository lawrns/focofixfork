'use client'

import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'

interface UseAuthReturn {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

/**
 * Custom hook for authentication state management
 * Provides user session data and authentication methods
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
        }

        setSession(session)
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Session retrieval error:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id)

        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        throw error
      }
    } catch (error) {
      console.error('Sign out operation failed:', error)
      throw error
    }
  }

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Session refresh error:', error)
        throw error
      }

      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
      }
    } catch (error) {
      console.error('Session refresh operation failed:', error)
      throw error
    }
  }

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signOut,
    refreshSession,
  }
}

/**
 * Hook for checking if user has specific permissions
 */
export function usePermissions() {
  const { user } = useAuth()

  const canAccessOrganization = async (organizationId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Permission check error:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.error('Permission check failed:', error)
      return false
    }
  }

  const canManageOrganization = async (organizationId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Role check error:', error)
        return false
      }

      return data?.role === 'owner' || data?.role === 'admin'
    } catch (error) {
      console.error('Role check failed:', error)
      return false
    }
  }

  const isOrganizationOwner = async (organizationId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Owner check error:', error)
        return false
      }

      return data?.role === 'owner'
    } catch (error) {
      console.error('Owner check failed:', error)
      return false
    }
  }

  return {
    canAccessOrganization,
    canManageOrganization,
    isOrganizationOwner,
  }
}

/**
 * Hook for user profile management
 */
export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') { // Not found is ok for new users
          console.error('Profile fetch error:', error)
        }

        setProfile(data)
      } catch (error) {
        console.error('Profile fetch failed:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  const updateProfile = async (updates: Partial<any>) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          ...updates,
        })
        .select()
        .single()

      if (error) {
        console.error('Profile update error:', error)
        throw error
      }

      setProfile(data)
      return data
    } catch (error) {
      console.error('Profile update failed:', error)
      throw error
    }
  }

  return {
    profile,
    loading,
    updateProfile,
  }
}


