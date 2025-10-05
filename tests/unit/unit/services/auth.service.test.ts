/**
 * Auth Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthService } from '@/lib/services/auth'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn()
    }
  }
}))

import { supabase } from '@/lib/supabase'

describe('AuthService', () => {
  const mockSupabase = vi.mocked(supabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }
      const mockSession = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() + 3600000
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      const result = await AuthService.signIn({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result.success).toBe(true)
      expect(result.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'member'
      })
      expect(result.session).toBe(mockSession)
    })

    it('should handle sign in error', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      })

      const result = await AuthService.signIn({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })

    it('should validate required fields', async () => {
      const result = await AuthService.signIn({
        email: '',
        password: 'password123'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email and password are required')
    })
  })

  describe('signUp', () => {
    it('should register user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'new@example.com'
      }

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await AuthService.signUp({
        email: 'new@example.com',
        password: 'password123'
      })

      expect(result.success).toBe(true)
      expect(result.user).toEqual({
        id: 'user-123',
        email: 'new@example.com',
        role: 'member'
      })
    })

    it('should validate email format', async () => {
      const result = await AuthService.signUp({
        email: 'invalid-email',
        password: 'password123'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Please enter a valid email address')
    })

    it('should validate password length', async () => {
      const result = await AuthService.signUp({
        email: 'test@example.com',
        password: '123'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Password must be at least 8 characters long')
    })
  })

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null })

      const result = await AuthService.signOut()

      expect(result.success).toBe(true)
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle sign out error', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' }
      })

      const result = await AuthService.signOut()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Sign out failed')
    })
  })

  describe('getCurrentSession', () => {
    it('should return current session', async () => {
      const mockSession = { access_token: 'token' }
      const mockUser = { id: 'user-123' }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      })

      const result = await AuthService.getCurrentSession()

      expect(result.session).toBe(mockSession)
      expect(result.user).toBe(mockUser)
    })
  })

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockSession = {
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_at: Date.now() + 3600000
      }

      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      const result = await AuthService.refreshSession()

      expect(result.success).toBe(true)
      expect(result.session).toBe(mockSession)
    })
  })

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: null
      })

      const result = await AuthService.resetPassword('test@example.com')

      expect(result.success).toBe(true)
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: expect.stringContaining('/reset-password') }
      )
    })
  })

  describe('updatePassword', () => {
    it('should update user password', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: {} },
        error: null
      })

      const result = await AuthService.updatePassword('newpassword123')

      expect(result.success).toBe(true)
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123'
      })
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when session exists', () => {
      mockSupabase.auth.getSession.mockReturnValue({
        data: { session: { access_token: 'token' }, user: {} },
        error: null
      })

      const result = await AuthService.isAuthenticated()
      expect(result).toBe(true)
    })

    it('should return false when no session', () => {
      mockSupabase.auth.getSession.mockReturnValue({
        data: { session: null, user: null },
        error: null
      })

      const result = await AuthService.isAuthenticated()
      expect(result).toBe(false)
    })
  })
})


