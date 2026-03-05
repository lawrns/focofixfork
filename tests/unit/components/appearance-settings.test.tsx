import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'
import { AppearanceSettings } from '@/components/settings/appearance-settings'
import { ThemeProvider } from '@/components/providers/theme-provider'

const setTheme = vi.fn()
const setAccentColor = vi.fn()
const setFontSize = vi.fn()

vi.mock('@/hooks/use-theme-preferences', () => ({
  useThemePreferences: () => ({
    theme: 'light',
    accentColor: 'blue',
    fontSize: 'medium',
    setTheme,
    setAccentColor,
    setFontSize,
    error: null,
  }),
}))

describe('AppearanceSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders primary controls', () => {
    render(
      <ThemeProvider>
        <AppearanceSettings />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-selector')).toBeInTheDocument()
    expect(screen.getByTestId('accent-color-picker')).toBeInTheDocument()
    expect(screen.getByTestId('font-size-slider')).toBeInTheDocument()
    expect(screen.getByTestId('theme-preview')).toBeInTheDocument()
  })

  test('renders 12 accent color options', () => {
    render(
      <ThemeProvider>
        <AppearanceSettings />
      </ThemeProvider>
    )

    expect(screen.getAllByTestId(/accent-color-option-/)).toHaveLength(12)
  })

  test('selects an accent color', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <AppearanceSettings />
      </ThemeProvider>
    )

    await user.click(screen.getByTestId('accent-color-option-green'))
    expect(setAccentColor).toHaveBeenCalledWith('green')
  })

  test('supports reset to defaults action', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <AppearanceSettings />
      </ThemeProvider>
    )

    await user.click(screen.getByRole('button', { name: /reset to defaults/i }))

    expect(setTheme).toHaveBeenCalledWith('light')
    expect(setAccentColor).toHaveBeenCalledWith('blue')
    expect(setFontSize).toHaveBeenCalledWith('medium')
  })
})
