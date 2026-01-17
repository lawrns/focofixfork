'use client'

import React, { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useThemePreferences } from '@/hooks/use-theme-preferences'
import type { ThemeOption, AccentColor, FontSize, UserPreferences } from '@/lib/theme/types'
import {
  THEME_OPTIONS,
  ACCENT_COLORS,
  FONT_SIZE_OPTIONS,
  ACCENT_COLOR_MAP,
} from '@/lib/theme/constants'

interface AppearanceSettingsProps {
  initialPreferences?: Partial<UserPreferences>
}

/**
 * Appearance settings component with theme, accent color, and font size options
 */
export function AppearanceSettings({ initialPreferences }: AppearanceSettingsProps) {
  const { theme, accentColor, fontSize, setTheme, setAccentColor, setFontSize, error } =
    useThemePreferences({ loadFromServer: !initialPreferences })
  const [previewTheme, setPreviewTheme] = useState<ThemeOption>(initialPreferences?.theme || theme)
  const [previewAccentColor, setPreviewAccentColor] = useState<AccentColor>(
    initialPreferences?.accent_color || accentColor
  )
  const [previewFontSize, setPreviewFontSize] = useState<FontSize>(
    initialPreferences?.font_size || fontSize
  )

  // Handle theme change with preview
  const handleThemeChange = (newTheme: ThemeOption) => {
    setPreviewTheme(newTheme)
    setTheme(newTheme)
  }

  // Handle accent color change with preview
  const handleAccentColorChange = (color: AccentColor) => {
    setPreviewAccentColor(color)
    setAccentColor(color)
  }

  // Handle font size change with preview
  const handleFontSizeChange = (size: number) => {
    const sizeMap: Record<number, FontSize> = {
      1: 'small',
      2: 'medium',
      3: 'large',
    }
    const newSize = sizeMap[size]
    setPreviewFontSize(newSize)
    setFontSize(newSize)
  }

  // Map font size to readable labels
  const fontSizeLabel: Record<FontSize, string> = {
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
  }

  // Map font size to numeric value for slider
  const fontSizeToSlider: Record<FontSize, number> = {
    small: 1,
    medium: 2,
    large: 3,
  }

  // Reset to defaults handler
  const handleResetToDefaults = () => {
    handleThemeChange('light')
    handleAccentColorChange('blue')
    handleFontSizeChange(2) // medium
  }

  const previewStyle = {
    '--color-accent': ACCENT_COLOR_MAP[previewAccentColor],
    '--font-size-scale': previewFontSize === 'small' ? '0.875' : previewFontSize === 'large' ? '1.125' : '1',
  } as React.CSSProperties

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Theme Selector */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Theme
          </label>
          <Select value={theme} onValueChange={(value) => handleThemeChange(value as ThemeOption)}>
            <SelectTrigger data-testid="theme-selector" className="w-full min-h-[44px]">
              <SelectValue placeholder="Select a theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="high-contrast">High Contrast</SelectItem>
              <SelectItem value="sepia">Sepia</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Choose your preferred color scheme. Auto will follow system preferences.
          </p>
        </div>

        {/* Accent Color Picker */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Accent Color
          </label>
          <div
            data-testid="accent-color-picker"
            data-selected-color={accentColor}
            className="grid grid-cols-6 gap-3"
          >
            {ACCENT_COLORS.map((color) => (
              <button
                key={color}
                data-testid={`accent-color-option-${color}`}
                onClick={() => handleAccentColorChange(color)}
                aria-pressed={accentColor === color}
                className={`h-10 w-10 sm:h-8 sm:w-8 rounded-lg border-2 transition-all ${
                  accentColor === color
                    ? 'border-gray-900 dark:border-gray-100 ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                style={{ backgroundColor: ACCENT_COLOR_MAP[color] }}
                title={color}
              />
            ))}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Select your accent color for interactive elements.
          </p>
        </div>

        {/* Font Size Slider */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Font Size: {fontSizeLabel[fontSize]}
          </label>
          <div className="space-y-4 py-2">
            <Slider
              data-testid="font-size-slider"
              min={1}
              max={3}
              step={1}
              value={[fontSizeToSlider[fontSize]]}
              onValueChange={(value) => handleFontSizeChange(value[0])}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium px-1">
              <span>Small</span>
              <span>Medium</span>
              <span>Large</span>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Adjust the base font size for better readability.
          </p>
        </div>

        {/* Reset Button */}
        <div className="flex items-end pt-2">
          <Button 
            variant="outline" 
            className="w-full min-h-[44px]" 
            onClick={handleResetToDefaults}
          >
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Preview
        </label>
        <div
          data-testid="theme-preview"
          style={previewStyle}
          className={`rounded-lg border border-gray-300 bg-white p-6 dark:border-gray-600 dark:bg-gray-900 ${
            previewTheme === 'dark' ? 'dark' : ''
          }`}
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Preview Text
              </h3>
              <p className="mt-2 text-gray-700 dark:text-gray-300">
                This is how your text will look with the current settings. The font size, theme, and
                accent color are applied in real-time.
              </p>
            </div>
            <div className="space-y-2">
              <button
                className="inline-flex items-center justify-center rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: ACCENT_COLOR_MAP[previewAccentColor] }}
              >
                Primary Button
              </button>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Theme: {previewTheme} | Accent: {previewAccentColor} | Font: {fontSizeLabel[previewFontSize]}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
