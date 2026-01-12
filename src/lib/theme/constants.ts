/**
 * Theme configuration constants
 */

export const THEME_OPTIONS = ['light', 'dark', 'auto', 'high-contrast', 'sepia'] as const

export const ACCENT_COLORS = [
  'blue',
  'red',
  'green',
  'purple',
  'pink',
  'orange',
  'yellow',
  'teal',
  'indigo',
  'cyan',
  'slate',
  'amber',
] as const

export const FONT_SIZE_OPTIONS = ['small', 'medium', 'large'] as const

// Color hex values
export const ACCENT_COLOR_MAP: Record<string, string> = {
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

// Font size scale values
export const FONT_SIZE_SCALE_MAP: Record<string, number> = {
  small: 0.875,
  medium: 1,
  large: 1.125,
}

// Default preferences
export const DEFAULT_THEME = 'light'
export const DEFAULT_ACCENT_COLOR = 'blue'
export const DEFAULT_FONT_SIZE = 'medium'

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'foco-theme',
  ACCENT_COLOR: 'foco-accent-color',
  FONT_SIZE: 'foco-font-size',
} as const
