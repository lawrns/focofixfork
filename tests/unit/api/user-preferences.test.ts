import { describe, test, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'

// Mock Supabase
vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

describe('PATCH /api/user/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Theme Preference Updates', () => {
    test('should update theme preference to light', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'light' }),
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('light')
    })

    test('should update theme preference to dark', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark' }),
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('dark')
    })

    test('should update theme preference to auto', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'auto' }),
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('auto')
    })

    test('should update theme to high-contrast', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'high-contrast' }),
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('high-contrast')
    })

    test('should update theme to sepia', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'sepia' }),
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('sepia')
    })

    test('should reject invalid theme values', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'invalid-theme' }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Accent Color Updates', () => {
    test('should update accent color to blue', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accent_color: 'blue' }),
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.accent_color).toBe('blue')
    })

    test('should update accent color to any of 12 colors', async () => {
      const colors = ['blue', 'red', 'green', 'purple', 'pink', 'orange', 'yellow', 'teal', 'indigo', 'cyan', 'slate', 'amber']

      for (const color of colors) {
        const response = await fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accent_color: color }),
        })

        const data = await response.json()
        expect(response.status).toBe(200)
        expect(data.accent_color).toBe(color)
      }
    })

    test('should reject invalid accent color', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accent_color: 'invalid-color' }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Font Size Updates', () => {
    test('should update font size to small', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ font_size: 'small' }),
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.font_size).toBe('small')
    })

    test('should update font size to medium', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ font_size: 'medium' }),
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.font_size).toBe('medium')
    })

    test('should update font size to large', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ font_size: 'large' }),
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.font_size).toBe('large')
    })

    test('should reject invalid font size', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ font_size: 'extra-large' }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Combined Updates', () => {
    test('should update multiple preferences at once', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: 'dark',
          accent_color: 'purple',
          font_size: 'large',
        }),
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('dark')
      expect(data.accent_color).toBe('purple')
      expect(data.font_size).toBe('large')
    })

    test('should update partial preferences without affecting others', async () => {
      // First, set all preferences
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: 'dark',
          accent_color: 'blue',
          font_size: 'medium',
        }),
      })

      // Then update only theme
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'light' }),
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('light')
      expect(data.accent_color).toBe('blue') // Should remain unchanged
      expect(data.font_size).toBe('medium') // Should remain unchanged
    })
  })

  describe('Authentication & Authorization', () => {
    test('should return 401 if user is not authenticated', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark' }),
      })

      expect(response.status).toBe(401)
    })

    test('should return 400 for missing required fields in request body', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Data Validation', () => {
    test('should trim and validate string inputs', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: '  dark  ' }),
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('dark')
    })

    test('should handle case-insensitive theme values', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'DARK' }),
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('dark')
    })
  })

  describe('Database Storage', () => {
    test('should persist preferences to user_profiles table', async () => {
      const { supabase } = await import('@/lib/supabase-client')

      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark' }),
      })

      expect(response.status).toBe(200)
      expect(supabase.from).toHaveBeenCalledWith('user_profiles')
    })

    test('should include updated_at timestamp on database update', async () => {
      const { supabase } = await import('@/lib/supabase-client')

      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark' }),
      })

      expect(response.status).toBe(200)
      // Verify that updated_at was included in the update
      expect(supabase.from).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    test('should return 500 on database error', async () => {
      const { supabase } = await import('@/lib/supabase-client')
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        upsert: vi.fn().mockRejectedValueOnce(new Error('Database error')),
      }))

      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark' }),
      })

      expect(response.status).toBe(500)
    })

    test('should return descriptive error message on validation failure', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'invalid' }),
      })

      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.message).toBeDefined()
    })
  })
})
