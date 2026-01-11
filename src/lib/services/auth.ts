/**
 * Authentication Service Layer
 * Handles user authentication, session management, and user-related operations
 *
 * Note: This service is designed for server-side API routes only.
 * For client-side authentication, use the auth context/hooks directly.
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
   * Note: For server-side use only. Client should use Supabase client directly.
   */
  static async signIn(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Verify user exists with admin client
      const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers()

      if (listError) {
        return {
          success: false,
          error: listError.message
        }
      }

      const users = data?.users || []
      const user = users.find((u: any) => u.email === credentials.email)

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        }
      }

      // Get user role from database
      const { data: userData, error: userError } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .single()

      const role = userData?.role || 'member'

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email!,
          role: role as 'director' | 'lead' | 'member'
        }
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
      // TODO: Re-enable email_confirm when email service is configured in Supabase
      const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: false // Disabled until email service is configured
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
   * Note: Server-side sign out is handled by clearing cookies in the API route
   */
  static async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      // Server-side sign out - just return success
      // Actual session clearing is done in the API route via cookies
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
   * Note: For server-side use, session should be passed from middleware/cookies
   */
  static async getCurrentSession(): Promise<{ session: Session | null; user: User | null }> {
    try {
      // Server-side doesn't have direct session access
      // Session should be retrieved from cookies in the API route
      return { session: null, user: null }
    } catch (error) {
      console.error('Get session error:', error)
      return { session: null, user: null }
    }
  }

  /**
   * Refresh current session
   * Note: For server-side use, session refresh should be handled via cookies
   */
  static async refreshSession(): Promise<AuthResponse> {
    try {
      // Server-side refresh is not supported in this way
      // Use client-side refresh or middleware
      return {
        success: false,
        error: 'Session refresh must be done client-side'
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
      // Generate password reset link for user
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
      })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      // In production, you would send this link via email service
      // For now, just return success
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
  static async updatePassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
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
   * Note: This method should only be called from client-side code
   */
  static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    // Auth state changes are client-side only
    // This method should not be called from server-side API routes
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
   * Note: For server-side, check session from cookies/middleware instead
   */
  static async isAuthenticated(): Promise<boolean> {
    // Server-side authentication check should be done via middleware
    // This always returns false for server-side calls
    return false
  }
}


