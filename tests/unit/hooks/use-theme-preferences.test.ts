import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { STORAGE_KEYS } from '@/lib/theme/constants'

const {
  getUserMock,
  upsertMock,
  singleMock,
  eqMock,
  selectMock,
  fromMock,
} = vi.hoisted(() => {
  const getUserMock = vi.fn()
  const upsertMock = vi.fn()
  const singleMock = vi.fn()
  const eqMock = vi.fn(() => ({ single: singleMock }))
  const selectMock = vi.fn(() => ({ eq: eqMock }))
  const fromMock = vi.fn(() => ({ upsert: upsertMock, select: selectMock }))
  return { getUserMock, upsertMock, singleMock, eqMock, selectMock, fromMock }
})

vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    auth: { getUser: getUserMock },
    from: fromMock,
  },
}))

import { useThemePreferences } from '@/hooks/use-theme-preferences'

describe('useThemePreferences Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const store: Record<string, string> = {}
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => store[key] ?? null)
    vi.mocked(localStorage.setItem).mockImplementation((key: string, value: string) => {
      store[key] = value
    })
    vi.mocked(localStorage.removeItem).mockImplementation((key: string) => {
      delete store[key]
    })
    vi.mocked(localStorage.clear).mockImplementation(() => {
      for (const key of Object.keys(store)) delete store[key]
    })

    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    upsertMock.mockResolvedValue({ error: null })
    singleMock.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
  })

  test('initializes with defaults', () => {
    const { result } = renderHook(() => useThemePreferences())

    expect(result.current.theme).toBe('light')
    expect(result.current.accentColor).toBe('blue')
    expect(result.current.fontSize).toBe('medium')
  })

  test('loads values from localStorage on mount', () => {
    localStorage.setItem(STORAGE_KEYS.THEME, 'dark')
    localStorage.setItem(STORAGE_KEYS.ACCENT_COLOR, 'purple')
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, 'large')

    const { result } = renderHook(() => useThemePreferences())

    expect(result.current.theme).toBe('dark')
    expect(result.current.accentColor).toBe('purple')
    expect(result.current.fontSize).toBe('large')
  })

  test('setTheme updates state, storage, and server sync', async () => {
    const { result } = renderHook(() => useThemePreferences())

    act(() => {
      result.current.setTheme('dark')
    })

    expect(result.current.theme).toBe('dark')
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe('dark')

    await waitFor(() => {
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          theme: 'dark',
        })
      )
    })
  })

  test('setAccentColor updates CSS variable and storage', () => {
    const { result } = renderHook(() => useThemePreferences())

    act(() => {
      result.current.setAccentColor('green')
    })

    expect(result.current.accentColor).toBe('green')
    expect(localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR)).toBe('green')
    expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('#10b981')
  })

  test('setFontSize updates CSS variable and storage', () => {
    const { result } = renderHook(() => useThemePreferences())

    act(() => {
      result.current.setFontSize('small')
    })

    expect(result.current.fontSize).toBe('small')
    expect(localStorage.getItem(STORAGE_KEYS.FONT_SIZE)).toBe('small')
    expect(document.documentElement.style.getPropertyValue('--font-size-scale')).toBe('0.875')
  })

  test('reset restores defaults and clears localStorage keys', () => {
    const { result } = renderHook(() => useThemePreferences())

    act(() => {
      result.current.setTheme('dark')
      result.current.setAccentColor('purple')
      result.current.setFontSize('large')
      result.current.reset()
    })

    expect(result.current.theme).toBe('light')
    expect(result.current.accentColor).toBe('blue')
    expect(result.current.fontSize).toBe('medium')
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.FONT_SIZE)).toBeNull()
  })

  test('loads preferences from server when loadFromServer is true', async () => {
    singleMock.mockResolvedValueOnce({
      data: {
        theme: 'dark',
        accent_color: 'amber',
        font_size: 'large',
      },
      error: null,
    })

    const { result } = renderHook(() => useThemePreferences({ loadFromServer: true }))

    await waitFor(() => {
      expect(result.current.theme).toBe('dark')
      expect(result.current.accentColor).toBe('amber')
      expect(result.current.fontSize).toBe('large')
    })
  })

  test('sets error when user is unauthenticated during sync', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } })
    const { result } = renderHook(() => useThemePreferences())

    act(() => {
      result.current.setTheme('dark')
    })

    await waitFor(() => {
      expect(result.current.error).toBe('User not authenticated')
    })
  })
})
