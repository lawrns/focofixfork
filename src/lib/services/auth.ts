/**
 * Authentication Service Layer
 * Handles user authentication, session management, and user-related operations
 */

import { supabaseAdmin } from '../supabase-server'
import type { User, Session } from '@supabase/supabase-js'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  organizationName?: string
}

export interface AuthUser {
  id: string
  email: string
  role: 'director' | 'lead' | 'member'
}

export interface AuthResponse {
  success: boolean
  user?: AuthUser
  session?: Session
  error?: string
}

export class AuthService {
  /**
   * Sign in user with email and password
   */
  static async signIn(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          error: 'Authentication failed'
        }
      }

      // Get user role from database
      const { data: userData, error: userError } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('user_id', data.user.id)
        .single()

      const role = userData?.role || 'member'

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email!,
          role: role as 'director' | 'lead' | 'member'
        },
        session: data.session
      }
    } catch (error) {
      console.error('Sign in error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during sign in'
      }
    }
  }

  /**
   * Register new user
   */
  static async signUp(data: RegisterData): Promise<AuthResponse> {
    try {
      const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true
      })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Registration failed'
        }
      }

      return {
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email!,
          role: 'member'
        }
      }
    } catch (error) {
      console.error('Sign up error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during registration'
      }
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin.auth.signOut()

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during sign out'
      }
    }
  }

  /**
   * Get current user session
   */
  static async getCurrentSession(): Promise<{ session: Session | null; user: User | null }> {
    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      return { session, user: session?.user || null }
    } catch (error) {
      console.error('Get session error:', error)
      return { session: null, user: null }
    }
  }

  /**
   * Refresh current session
   */
  static async refreshSession(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabaseAdmin.auth.refreshSession()

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          error: 'Session refresh failed'
        }
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email!,
          role: 'member' // Will be updated by role checking
        },
        session: data.session
      }
    } catch (error) {
      console.error('Refresh session error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during session refresh'
      }
    }
  }

  /**
   * Reset user password
   */
  static async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://foco.mx'}/reset-password`,
      })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Reset password error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during password reset'
      }
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin.auth.updateUser({
        password: newPassword
      })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Update password error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during password update'
      }
    }
  }

  /**
   * Listen to authentication state changes
   */
  static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabaseAdmin.auth.onAuthStateChange(callback)
  }

  /**
   * Get user role from organization context
   */
  static async getUserRole(userId: string, organizationId?: string): Promise<'director' | 'lead' | 'member'> {
    try {
      let query = supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('user_id', userId)

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query.single()

      if (error || !data) {
        return 'member' // Default role
      }

      return data.role as 'director' | 'lead' | 'member'
    } catch (error) {
      console.error('Get user role error:', error)
      return 'member'
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabaseAdmin.auth.getSession()
    return !!session
  }
}


