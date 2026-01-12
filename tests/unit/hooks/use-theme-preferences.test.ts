import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useThemePreferences } from '@/hooks/use-theme-preferences'

// Mock the API
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    patch: vi.fn(),
  },
}))

describe('useThemePreferences Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Theme Management', () => {
    test('should initialize with default theme', () => {
      const { result } = renderHook(() => useThemePreferences())

      expect(result.current.theme).toBe('light')
    })

    test('should load theme from localStorage', () => {
      localStorage.setItem('foco-theme', 'dark')

      const { result } = renderHook(() => useThemePreferences())

      expect(result.current.theme).toBe('dark')
    })

    test('should update theme', async () => {
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setTheme('dark')
      })

      expect(result.current.theme).toBe('dark')
    })

    test('should persist theme to localStorage', async () => {
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setTheme('dark')
      })

      await waitFor(() => {
        expect(localStorage.getItem('foco-theme')).toBe('dark')
      })
    })

    test('should support all theme options', async () => {
      const { result } = renderHook(() => useThemePreferences())
      const themes = ['light', 'dark', 'auto', 'high-contrast', 'sepia']

      for (const theme of themes) {
        act(() => {
          result.current.setTheme(theme)
        })

        await waitFor(() => {
          expect(result.current.theme).toBe(theme)
        })
      }
    })

    test('should sync theme across tabs via storage event', async () => {
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'foco-theme',
          newValue: 'dark',
          storageArea: localStorage,
        })
        window.dispatchEvent(event)
      })

      await waitFor(() => {
        expect(result.current.theme).toBe('dark')
      })
    })
  })

  describe('Accent Color Management', () => {
    test('should initialize with default accent color', () => {
      const { result } = renderHook(() => useThemePreferences())

      expect(result.current.accentColor).toBe('blue')
    })

    test('should update accent color', async () => {
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setAccentColor('purple')
      })

      expect(result.current.accentColor).toBe('purple')
    })

    test('should persist accent color to localStorage', async () => {
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setAccentColor('green')
      })

      await waitFor(() => {
        expect(localStorage.getItem('foco-accent-color')).toBe('green')
      })
    })

    test('should support all 12 accent colors', async () => {
      const { result } = renderHook(() => useThemePreferences())
      const colors = ['blue', 'red', 'green', 'purple', 'pink', 'orange', 'yellow', 'teal', 'indigo', 'cyan', 'slate', 'amber']

      for (const color of colors) {
        act(() => {
          result.current.setAccentColor(color)
        })

        await waitFor(() => {
          expect(result.current.accentColor).toBe(color)
        })
      }
    })

    test('should apply accent color as CSS variable', async () => {
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setAccentColor('red')
      })

      await waitFor(() => {
        expect(document.documentElement.style.getPropertyValue('--color-accent')).toBeTruthy()
      })
    })
  })

  describe('Font Size Management', () => {
    test('should initialize with default font size', () => {
      const { result } = renderHook(() => useThemePreferences())

      expect(result.current.fontSize).toBe('medium')
    })

    test('should update font size', async () => {
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setFontSize('large')
      })

      expect(result.current.fontSize).toBe('large')
    })

    test('should persist font size to localStorage', async () => {
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setFontSize('small')
      })

      await waitFor(() => {
        expect(localStorage.getItem('foco-font-size')).toBe('small')
      })
    })

    test('should support small, medium, and large sizes', async () => {
      const { result } = renderHook(() => useThemePreferences())
      const sizes = ['small', 'medium', 'large']

      for (const size of sizes) {
        act(() => {
          result.current.setFontSize(size)
        })

        await waitFor(() => {
          expect(result.current.fontSize).toBe(size)
        })
      }
    })

    test('should apply font size as CSS variable', async () => {
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setFontSize('large')
      })

      await waitFor(() => {
        const scale = document.documentElement.style.getPropertyValue('--font-size-scale')
        expect(scale).toBeTruthy()
      })
    })
  })

  describe('Syncing with Server', () => {
    test('should sync theme to server', async () => {
      const { apiClient } = await import('@/lib/api-client')
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setTheme('dark')
      })

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith('/api/user/preferences', expect.objectContaining({
          theme: 'dark',
        }))
      })
    })

    test('should sync accent color to server', async () => {
      const { apiClient } = await import('@/lib/api-client')
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setAccentColor('purple')
      })

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith('/api/user/preferences', expect.objectContaining({
          accent_color: 'purple',
        }))
      })
    })

    test('should sync font size to server', async () => {
      const { apiClient } = await import('@/lib/api-client')
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setFontSize('large')
      })

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith('/api/user/preferences', expect.objectContaining({
          font_size: 'large',
        }))
      })
    })

    test('should handle sync errors gracefully', async () => {
      const { apiClient } = await import('@/lib/api-client')
      vi.mocked(apiClient.patch).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setTheme('dark')
      })

      // Should still update locally even if server sync fails
      expect(result.current.theme).toBe('dark')
    })
  })

  describe('Loading Preferences from Server', () => {
    test('should load preferences from server on mount', async () => {
      const { apiClient } = await import('@/lib/api-client')
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        theme: 'dark',
        accent_color: 'purple',
        font_size: 'large',
      })

      const { result } = renderHook(() => useThemePreferences({ loadFromServer: true }))

      await waitFor(() => {
        expect(result.current.theme).toBe('dark')
        expect(result.current.accentColor).toBe('purple')
        expect(result.current.fontSize).toBe('large')
      })
    })

    test('should prioritize server preferences over localStorage', async () => {
      localStorage.setItem('foco-theme', 'light')

      const { apiClient } = await import('@/lib/api-client')
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        theme: 'dark',
        accent_color: 'blue',
        font_size: 'medium',
      })

      const { result } = renderHook(() => useThemePreferences({ loadFromServer: true }))

      await waitFor(() => {
        expect(result.current.theme).toBe('dark')
      })
    })
  })

  describe('CSS Variable Updates', () => {
    test('should update CSS variables on mount', () => {
      renderHook(() => useThemePreferences())

      expect(document.documentElement.style.getPropertyValue('--font-size-scale')).toBeTruthy()
      expect(document.documentElement.style.getPropertyValue('--color-accent')).toBeTruthy()
    })

    test('should map font size to correct scale values', async () => {
      const { result } = renderHook(() => useThemePreferences())
      const fontSizeScales = {
        small: '0.875',
        medium: '1',
        large: '1.125',
      }

      for (const [size, scale] of Object.entries(fontSizeScales)) {
        act(() => {
          result.current.setFontSize(size)
        })

        await waitFor(() => {
          expect(document.documentElement.style.getPropertyValue('--font-size-scale')).toBe(scale)
        })
      }
    })

    test('should map accent colors to correct hex values', async () => {
      const { result } = renderHook(() => useThemePreferences())

      const colorMap = {
        blue: '#3b82f6',
        red: '#ef4444',
        green: '#10b981',
        purple: '#a855f7',
        pink: '#ec4899',
        orange: '#f97316',
        yellow: '#eab308',
        teal: '#14b8a6',
        indigo: '#6366f1',
        cyan: '#06b6d4',
        slate: '#64748b',
        amber: '#f59e0b',
      }

      for (const [color, hex] of Object.entries(colorMap)) {
        act(() => {
          result.current.setAccentColor(color)
        })

        await waitFor(() => {
          expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe(hex)
        })
      }
    })
  })

  describe('Reset Preferences', () => {
    test('should reset all preferences to defaults', async () => {
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setTheme('dark')
        result.current.setAccentColor('purple')
        result.current.setFontSize('large')
      })

      act(() => {
        result.current.reset()
      })

      await waitFor(() => {
        expect(result.current.theme).toBe('light')
        expect(result.current.accentColor).toBe('blue')
        expect(result.current.fontSize).toBe('medium')
      })
    })

    test('should clear localStorage on reset', async () => {
      const { result } = renderHook(() => useThemePreferences())

      act(() => {
        result.current.setTheme('dark')
      })

      act(() => {
        result.current.reset()
      })

      await waitFor(() => {
        expect(localStorage.getItem('foco-theme')).toBeNull()
      })
    })
  })
})
