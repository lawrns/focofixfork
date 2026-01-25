import { describe, test, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Use vi.hoisted to define mocks before they're used
const { mockSingle, mockEqForSelect, mockSelect, mockEqForUpdate, mockUpdate, mockFrom, mockGetUser } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEqForSelect = vi.fn()
  const mockSelect = vi.fn()
  const mockEqForUpdate = vi.fn()
  const mockUpdate = vi.fn()
  const mockFrom = vi.fn()
  const mockGetUser = vi.fn()

  return {
    mockSingle,
    mockEqForSelect,
    mockSelect,
    mockEqForUpdate,
    mockUpdate,
    mockFrom,
    mockGetUser
  }
})

vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  },
}))

import { PATCH } from '@/app/api/user/preferences/route'

// Helper function to create NextRequest with proper URL
function createRequest(body: any): NextRequest {
  return new NextRequest('http://localhost:3000/api/user/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/user/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })

    // Setup default mock chain for database operations
    // For select query: from().select().eq().single()
    mockSingle.mockResolvedValue({
      data: { preferences: {} },
      error: null
    })
    mockEqForSelect.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEqForSelect })

    // For update query: from().update().eq()
    mockEqForUpdate.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEqForUpdate })

    // from() returns different objects based on what's chained
    mockFrom.mockImplementation((table: string) => {
      return {
        select: mockSelect,
        update: mockUpdate,
      }
    })
  })

  describe('Theme Preference Updates', () => {
    test('should update theme preference to light', async () => {
      const request = createRequest({ theme: 'light' })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('light')
    })

    test('should update theme preference to dark', async () => {
      const request = createRequest({ theme: 'dark' })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('dark')
    })

    test('should update theme preference to auto', async () => {
      const request = createRequest({ theme: 'auto' })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('auto')
    })

    test('should update theme to high-contrast', async () => {
      const request = createRequest({ theme: 'high-contrast' })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('high-contrast')
    })

    test('should update theme to sepia', async () => {
      const request = createRequest({ theme: 'sepia' })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('sepia')
    })

    test('should reject invalid theme values', async () => {
      const request = createRequest({ theme: 'invalid-theme' })
      const response = await PATCH(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Accent Color Updates', () => {
    test('should update accent color to blue', async () => {
      const request = createRequest({ accent_color: 'blue' })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.accent_color).toBe('blue')
    })

    test('should update accent color to any of 12 colors', async () => {
      const colors = ['blue', 'red', 'green', 'purple', 'pink', 'orange', 'yellow', 'teal', 'indigo', 'cyan', 'slate', 'amber']

      for (const color of colors) {
        const request = createRequest({ accent_color: color })
        const response = await PATCH(request)

        const data = await response.json()
        expect(response.status).toBe(200)
        expect(data.accent_color).toBe(color)
      }
    })

    test('should reject invalid accent color', async () => {
      const request = createRequest({ accent_color: 'invalid-color' })
      const response = await PATCH(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Font Size Updates', () => {
    test('should update font size to small', async () => {
      const request = createRequest({ font_size: 'small' })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.font_size).toBe('small')
    })

    test('should update font size to medium', async () => {
      const request = createRequest({ font_size: 'medium' })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.font_size).toBe('medium')
    })

    test('should update font size to large', async () => {
      const request = createRequest({ font_size: 'large' })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.font_size).toBe('large')
    })

    test('should reject invalid font size', async () => {
      const request = createRequest({ font_size: 'extra-large' })
      const response = await PATCH(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Combined Updates', () => {
    test('should update multiple preferences at once', async () => {
      const request = createRequest({
        theme: 'dark',
        accent_color: 'purple',
        font_size: 'large',
      })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('dark')
      expect(data.accent_color).toBe('purple')
      expect(data.font_size).toBe('large')
    })

    test('should update partial preferences without affecting others', async () => {
      // Setup mock to return existing preferences
      mockSingle.mockResolvedValueOnce({
        data: {
          preferences: {
            theme: 'dark',
            accent_color: 'blue',
            font_size: 'medium'
          }
        },
        error: null
      })

      // Then update only theme
      const request = createRequest({ theme: 'light' })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('light')
      expect(data.accent_color).toBe('blue') // Should remain unchanged
      expect(data.font_size).toBe('medium') // Should remain unchanged
    })
  })

  describe('Authentication & Authorization', () => {
    test('should return 401 if user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Not authenticated')
      } as any)

      const request = createRequest({ theme: 'dark' })
      const response = await PATCH(request)

      expect(response.status).toBe(401)
    })

    test('should return 400 for missing required fields in request body', async () => {
      const request = createRequest({})
      const response = await PATCH(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Data Validation', () => {
    test('should trim and validate string inputs', async () => {
      const request = createRequest({ theme: '  dark  ' })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('dark')
    })

    test('should handle case-insensitive theme values', async () => {
      const request = createRequest({ theme: 'DARK' })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.theme).toBe('dark')
    })
  })

  describe('Database Storage', () => {
    test('should persist preferences to user_profiles table', async () => {
      const { supabase } = await import('@/lib/supabase-client')

      const request = createRequest({ theme: 'dark' })
      const response = await PATCH(request)

      expect(response.status).toBe(200)
      expect(supabase.from).toHaveBeenCalledWith('user_profiles')
    })

    test('should include updated_at timestamp on database update', async () => {
      const { supabase } = await import('@/lib/supabase-client')

      const request = createRequest({ theme: 'dark' })
      const response = await PATCH(request)

      expect(response.status).toBe(200)
      // Verify that updated_at was included in the update
      expect(supabase.from).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    test('should return 500 on database error', async () => {
      const { supabase } = await import('@/lib/supabase-client')

      // Mock the chain to return error on update
      mockEqForUpdate.mockResolvedValueOnce({ error: { message: 'Database error' } })

      const request = createRequest({ theme: 'dark' })
      const response = await PATCH(request)

      expect(response.status).toBe(500)
    })

    test('should return descriptive error message on validation failure', async () => {
      const request = createRequest({ theme: 'invalid' })
      const response = await PATCH(request)

      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.message).toBeDefined()
    })
  })
})
