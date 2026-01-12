import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'
import { AppearanceSettings } from '@/components/settings/appearance-settings'
import { ThemeProvider } from '@/components/providers/theme-provider'

// Mock the API call
vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

describe('AppearanceSettings Component', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // Mock window.matchMedia for theme detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  describe('Theme Selector UI', () => {
    test('should render theme dropdown with all theme options', () => {
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const themeSelect = screen.getByTestId('theme-selector')
      expect(themeSelect).toBeInTheDocument()

      // Open dropdown to see options
      fireEvent.click(themeSelect)
      expect(screen.getByText('Light')).toBeInTheDocument()
      expect(screen.getByText('Dark')).toBeInTheDocument()
      expect(screen.getByText('Auto')).toBeInTheDocument()
      expect(screen.getByText('High Contrast')).toBeInTheDocument()
      expect(screen.getByText('Sepia')).toBeInTheDocument()
    })

    test('should render accent color picker with 12 color options', () => {
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const colorPicker = screen.getByTestId('accent-color-picker')
      expect(colorPicker).toBeInTheDocument()

      // Check for color buttons
      const colorButtons = screen.getAllByTestId(/accent-color-option-/)
      expect(colorButtons.length).toBe(12)
    })

    test('should render font size slider', () => {
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const fontSizeSlider = screen.getByTestId('font-size-slider')
      expect(fontSizeSlider).toBeInTheDocument()

      // Check for font size labels
      expect(screen.getByText('Small')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
      expect(screen.getByText('Large')).toBeInTheDocument()
    })

    test('should render live preview section', () => {
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const preview = screen.getByTestId('theme-preview')
      expect(preview).toBeInTheDocument()
    })
  })

  describe('Theme Switching', () => {
    test('should switch theme when theme option is selected', async () => {
      const user = userEvent.setup()
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const themeSelect = screen.getByTestId('theme-selector')

      // Click to open dropdown
      await user.click(themeSelect)

      // Select Dark theme
      const darkOption = screen.getByText('Dark')
      await user.click(darkOption)

      // Verify the selection
      expect(themeSelect).toHaveValue('dark')
    })

    test('should update theme in localStorage when theme changes', async () => {
      const user = userEvent.setup()
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const themeSelect = screen.getByTestId('theme-selector')

      // Change to dark theme
      await user.click(themeSelect)
      await user.click(screen.getByText('Dark'))

      // Check localStorage
      await waitFor(() => {
        expect(localStorage.getItem('foco-theme')).toBe('dark')
      })
    })

    test('should apply theme class to document element', async () => {
      const user = userEvent.setup()
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const themeSelect = screen.getByTestId('theme-selector')

      // Change to dark theme
      await user.click(themeSelect)
      await user.click(screen.getByText('Dark'))

      // Check if dark class is applied to html element
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })
    })

    test('should switch between all theme options', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const themeSelect = screen.getByTestId('theme-selector')
      const themes = ['light', 'dark', 'auto', 'high-contrast', 'sepia']

      for (const theme of themes) {
        await user.click(themeSelect)
        await user.click(screen.getByText(
          theme === 'high-contrast' ? 'High Contrast' :
          theme === 'light' ? 'Light' :
          theme === 'dark' ? 'Dark' :
          theme === 'auto' ? 'Auto' :
          'Sepia'
        ))

        await waitFor(() => {
          expect(localStorage.getItem('foco-theme')).toBe(theme)
        })
      }
    })
  })

  describe('Theme Persistence', () => {
    test('should load saved theme from localStorage on mount', () => {
      localStorage.setItem('foco-theme', 'dark')

      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const themeSelect = screen.getByTestId('theme-selector')
      expect(themeSelect).toHaveValue('dark')
    })

    test('should persist theme preference to database', async () => {
      const user = userEvent.setup()
      const { supabase } = await import('@/lib/supabase-client')

      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const themeSelect = screen.getByTestId('theme-selector')
      await user.click(themeSelect)
      await user.click(screen.getByText('Dark'))

      // Verify API call was made
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalled()
      })
    })

    test('should restore all preferences from database on app load', async () => {
      const mockUserPrefs = {
        theme: 'dark',
        accent_color: '#3b82f6',
        font_size: 'large',
      }

      render(
        <ThemeProvider>
          <AppearanceSettings initialPreferences={mockUserPrefs} />
        </ThemeProvider>
      )

      expect(screen.getByTestId('theme-selector')).toHaveValue('dark')
      expect(screen.getByTestId('accent-color-picker')).toHaveAttribute('data-selected-color', '#3b82f6')
      expect(screen.getByTestId('font-size-slider')).toHaveValue('3') // Large = 3
    })
  })

  describe('Custom Accent Colors', () => {
    test('should select accent color when color button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const blueColorBtn = screen.getByTestId('accent-color-option-blue')
      await user.click(blueColorBtn)

      expect(blueColorBtn).toHaveAttribute('aria-pressed', 'true')
    })

    test('should have 12 distinct accent color options', () => {
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const colorOptions = screen.getAllByTestId(/accent-color-option-/)
      expect(colorOptions.length).toBe(12)

      // Verify colors are distinct (blue, red, green, purple, pink, orange, yellow, teal, indigo, cyan, slate, amber)
      const expectedColors = [
        'blue', 'red', 'green', 'purple', 'pink', 'orange',
        'yellow', 'teal', 'indigo', 'cyan', 'slate', 'amber'
      ]

      colorOptions.forEach((btn, index) => {
        expect(btn).toHaveTestId(`accent-color-option-${expectedColors[index]}`)
      })
    })

    test('should apply accent color as CSS variable when selected', async () => {
      const user = userEvent.setup()
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const redColorBtn = screen.getByTestId('accent-color-option-red')
      await user.click(redColorBtn)

      await waitFor(() => {
        expect(document.documentElement.style.getPropertyValue('--color-accent')).toBeTruthy()
      })
    })

    test('should persist accent color preference', async () => {
      const user = userEvent.setup()
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const greenColorBtn = screen.getByTestId('accent-color-option-green')
      await user.click(greenColorBtn)

      await waitFor(() => {
        expect(localStorage.getItem('foco-accent-color')).toBe('green')
      })
    })
  })

  describe('Font Size Options', () => {
    test('should have three font size options: Small, Medium, Large', () => {
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const slider = screen.getByTestId('font-size-slider')
      expect(slider).toHaveAttribute('min', '1')
      expect(slider).toHaveAttribute('max', '3')

      expect(screen.getByText('Small')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
      expect(screen.getByText('Large')).toBeInTheDocument()
    })

    test('should update font size when slider is adjusted', async () => {
      const user = userEvent.setup()
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const slider = screen.getByTestId('font-size-slider')

      // Move slider to Large (value 3)
      await user.click(slider)
      fireEvent.change(slider, { target: { value: '3' } })

      expect(slider).toHaveValue('3')
    })

    test('should apply font size CSS variable when changed', async () => {
      const user = userEvent.setup()
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const slider = screen.getByTestId('font-size-slider')

      fireEvent.change(slider, { target: { value: '3' } })

      await waitFor(() => {
        const fontSizeVar = document.documentElement.style.getPropertyValue('--font-size-scale')
        expect(fontSizeVar).toBeTruthy()
      })
    })

    test('should persist font size preference', async () => {
      const user = userEvent.setup()
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const slider = screen.getByTestId('font-size-slider')
      fireEvent.change(slider, { target: { value: '3' } })

      await waitFor(() => {
        expect(localStorage.getItem('foco-font-size')).toBe('large')
      })
    })
  })

  describe('Live Preview', () => {
    test('should update preview when theme changes', async () => {
      const user = userEvent.setup()
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const themeSelect = screen.getByTestId('theme-selector')
      const preview = screen.getByTestId('theme-preview')

      await user.click(themeSelect)
      await user.click(screen.getByText('Dark'))

      await waitFor(() => {
        expect(preview).toHaveClass('dark')
      })
    })

    test('should update preview when accent color changes', async () => {
      const user = userEvent.setup()
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const colorBtn = screen.getByTestId('accent-color-option-purple')
      const preview = screen.getByTestId('theme-preview')

      await user.click(colorBtn)

      await waitFor(() => {
        const accentColor = preview.style.getPropertyValue('--color-accent')
        expect(accentColor).toBeTruthy()
      })
    })

    test('should update preview when font size changes', async () => {
      const user = userEvent.setup()
      render(
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      )

      const slider = screen.getByTestId('font-size-slider')
      const preview = screen.getByTestId('theme-preview')

      fireEvent.change(slider, { target: { value: '3' } })

      await waitFor(() => {
        const fontSize = preview.style.getPropertyValue('--font-size-scale')
        expect(fontSize).toBeTruthy()
      })
    })
  })
})
