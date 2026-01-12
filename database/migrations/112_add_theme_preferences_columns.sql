-- Migration: Add theme customization columns to user_profiles
-- Date: 2026-01-12
-- Purpose: Support comprehensive theme customization with accent colors and font sizes

BEGIN;

-- Add theme preference columns to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto', 'high-contrast', 'sepia')),
ADD COLUMN accent_color TEXT DEFAULT 'blue' CHECK (accent_color IN ('blue', 'red', 'green', 'purple', 'pink', 'orange', 'yellow', 'teal', 'indigo', 'cyan', 'slate', 'amber')),
ADD COLUMN font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large'));

-- Create index for faster preference lookups
CREATE INDEX idx_user_profiles_theme_preferences ON user_profiles(user_id, theme, accent_color, font_size);

-- Add comment documenting the columns
COMMENT ON COLUMN user_profiles.theme IS 'User''s preferred theme: light, dark, auto (system), high-contrast, or sepia';
COMMENT ON COLUMN user_profiles.accent_color IS 'User''s preferred accent color from 12 available options';
COMMENT ON COLUMN user_profiles.font_size IS 'User''s preferred font size: small (0.875), medium (1), or large (1.125)';

COMMIT;
