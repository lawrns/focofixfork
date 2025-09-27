'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { designTokens } from '@/lib/design-system/tokens'

type Theme = 'light' | 'dark' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  resolvedTheme: 'light'
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'foco-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (typeof window !== 'undefined' && localStorage.getItem(storageKey)) as Theme || defaultTheme
  )
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    let resolved: 'light' | 'dark'

    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      resolved = theme
    }

    root.classList.add(resolved)
    setResolvedTheme(resolved)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    resolvedTheme
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}

// Theme-aware color utilities
export const useThemeColors = () => {
  const { resolvedTheme } = useTheme()

  const getColor = (lightColor: string, darkColor: string) => {
    return resolvedTheme === 'dark' ? darkColor : lightColor
  }

  const colors = {
    // Background colors
    background: designTokens.colors.background,
    surface: designTokens.colors.neutral_gray,

    // Text colors
    foreground: designTokens.colors.text_primary,

    // Border colors
    border: designTokens.colors.border,

    // Input colors
    input: designTokens.colors.border,

    // Ring colors
    ring: designTokens.colors.accent_premium,

    // Primary colors
    primary: designTokens.colors.accent_premium,

    // Semantic colors
    success: designTokens.colors.accent_emerald,
    warning: designTokens.colors.accent_premium,
    destructive: designTokens.colors.accent_premium,
    muted: designTokens.colors.text_secondary
  }

  return colors
}


