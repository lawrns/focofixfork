'use client'

import { useState, useEffect } from 'react'
import { useAuth as useAuthContext } from '@/lib/contexts/auth-context'
import { supabase } from '@/lib/supabase-client'

// Re-export the auth context hook to maintain compatibility
// This prevents breaking changes while consolidating auth management
export { useAuth } from '@/lib/contexts/auth-context'

/**
 * Hook for checking if user has specific permissions
 */
export function usePermissions() {
  const { user } = useAuthContext()

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
  const { user } = useAuthContext()
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


