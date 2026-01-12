/**
 * Theme preference types
 */

export type ThemeOption = 'light' | 'dark' | 'auto' | 'high-contrast' | 'sepia'

export type AccentColor =
  | 'blue'
  | 'red'
  | 'green'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'yellow'
  | 'teal'
  | 'indigo'
  | 'cyan'
  | 'slate'
  | 'amber'

export type FontSize = 'small' | 'medium' | 'large'

export interface UserPreferences {
  theme: ThemeOption
  accent_color: AccentColor
  font_size: FontSize
}

export interface UserPreferencesUpdate {
  theme?: ThemeOption
  accent_color?: AccentColor
  font_size?: FontSize
}

export interface ThemeContextValue {
  theme: ThemeOption
  accentColor: AccentColor
  fontSize: FontSize
  setTheme: (theme: ThemeOption) => void
  setAccentColor: (color: AccentColor) => void
  setFontSize: (size: FontSize) => void
}
