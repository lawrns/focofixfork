'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ThemeOption, AccentColor, FontSize, UserPreferences } from '@/lib/theme/types'
import {
  THEME_OPTIONS,
  ACCENT_COLORS,
  FONT_SIZE_OPTIONS,
  ACCENT_COLOR_MAP,
  FONT_SIZE_SCALE_MAP,
  DEFAULT_THEME,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_FONT_SIZE,
  STORAGE_KEYS,
} from '@/lib/theme/constants'
import { supabase } from '@/lib/supabase-client'

// Use untyped supabase client to avoid type instantiation depth issues
const untypedSupabase = supabase as any

interface UseThemePreferencesOptions {
  loadFromServer?: boolean
}

/**
 * Hook for managing theme preferences with persistence
 */
export function useThemePreferences(options: UseThemePreferencesOptions = {}) {
  const { loadFromServer = false } = options
  const [theme, setThemeState] = useState<ThemeOption>(DEFAULT_THEME)
  const [accentColor, setAccentColorState] = useState<AccentColor>(DEFAULT_ACCENT_COLOR)
  const [fontSize, setFontSizeState] = useState<FontSize>(DEFAULT_FONT_SIZE)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load preferences from localStorage on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeOption | null
    const storedAccentColor = localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR) as AccentColor | null
    const storedFontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE) as FontSize | null

    if (storedTheme && THEME_OPTIONS.includes(storedTheme)) {
      setThemeState(storedTheme)
    }
    if (storedAccentColor && ACCENT_COLORS.includes(storedAccentColor)) {
      setAccentColorState(storedAccentColor)
    }
    if (storedFontSize && FONT_SIZE_OPTIONS.includes(storedFontSize)) {
      setFontSizeState(storedFontSize)
    }
  }, [])

  // Load preferences from server if requested
  useEffect(() => {
    if (!loadFromServer) return

    const loadFromServerAsync = async () => {
      setIsLoading(true)
      try {
        const { data: { user } } = await untypedSupabase.auth.getUser()
        if (!user) {
          setError('User not authenticated')
          return
        }

        const { data: profile, error: err } = await untypedSupabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (err && err.code !== 'PGRST116') {
          setError(err.message)
          return
        }

        if (profile) {
          const theme = (profile as any)?.theme
          const accentColor = (profile as any)?.accent_color
          const fontSize = (profile as any)?.font_size
          
          if (theme && THEME_OPTIONS.includes(theme)) {
            setThemeState(theme)
          }
          if (accentColor && ACCENT_COLORS.includes(accentColor)) {
            setAccentColorState(accentColor)
          }
          if (fontSize && FONT_SIZE_OPTIONS.includes(fontSize)) {
            setFontSizeState(fontSize)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences')
      } finally {
        setIsLoading(false)
      }
    }

    loadFromServerAsync()
  }, [loadFromServer])

  // Apply CSS variables
  useEffect(() => {
    const root = document.documentElement
    const accentHex = ACCENT_COLOR_MAP[accentColor]
    const fontScale = FONT_SIZE_SCALE_MAP[fontSize]

    if (accentHex) {
      root.style.setProperty('--color-accent', accentHex)
    }
    if (fontScale !== undefined) {
      root.style.setProperty('--font-size-scale', fontScale.toString())
    }
  }, [accentColor, fontSize])

  // Sync to localStorage
  const syncToStorage = useCallback((newTheme: ThemeOption, newAccent: AccentColor, newFontSize: FontSize) => {
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme)
    localStorage.setItem(STORAGE_KEYS.ACCENT_COLOR, newAccent)
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, newFontSize)
  }, [])

  // Sync to server
  const syncToServer = useCallback(async (updates: Partial<UserPreferences>) => {
    try {
      const { data: { user } } = await untypedSupabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        return
      }

      const { error: err } = await untypedSupabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })

      if (err) {
        setError(err.message)
        console.error('Failed to sync preferences to server:', err)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync preferences'
      setError(errorMsg)
      console.error('Error syncing preferences:', err)
    }
  }, [])

  const setTheme = useCallback((newTheme: ThemeOption) => {
    if (!THEME_OPTIONS.includes(newTheme)) {
      setError('Invalid theme option')
      return
    }

    setThemeState(newTheme)
    syncToStorage(newTheme, accentColor, fontSize)
    syncToServer({ theme: newTheme })
  }, [accentColor, fontSize, syncToStorage, syncToServer])

  const setAccentColor = useCallback((newColor: AccentColor) => {
    if (!ACCENT_COLORS.includes(newColor)) {
      setError('Invalid accent color')
      return
    }

    setAccentColorState(newColor)
    syncToStorage(theme, newColor, fontSize)
    syncToServer({ accent_color: newColor })
  }, [theme, fontSize, syncToStorage, syncToServer])

  const setFontSize = useCallback((newSize: FontSize) => {
    if (!FONT_SIZE_OPTIONS.includes(newSize)) {
      setError('Invalid font size')
      return
    }

    setFontSizeState(newSize)
    syncToStorage(theme, accentColor, newSize)
    syncToServer({ font_size: newSize })
  }, [theme, accentColor, syncToStorage, syncToServer])

  const reset = useCallback(() => {
    setThemeState(DEFAULT_THEME)
    setAccentColorState(DEFAULT_ACCENT_COLOR)
    setFontSizeState(DEFAULT_FONT_SIZE)
    localStorage.removeItem(STORAGE_KEYS.THEME)
    localStorage.removeItem(STORAGE_KEYS.ACCENT_COLOR)
    localStorage.removeItem(STORAGE_KEYS.FONT_SIZE)
  }, [])

  return {
    theme,
    accentColor,
    fontSize,
    setTheme,
    setAccentColor,
    setFontSize,
    reset,
    isLoading,
    error,
  }
}
