-- Add 2FA columns to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMPTZ;

-- Create index for faster 2FA lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_2fa ON user_profiles(id) WHERE two_factor_enabled = TRUE;

-- Add comment for clarity
COMMENT ON COLUMN user_profiles.two_factor_enabled IS 'Flag indicating if 2FA is enabled for this user';
COMMENT ON COLUMN user_profiles.two_factor_secret IS 'Encrypted TOTP secret for authentication';
COMMENT ON COLUMN user_profiles.two_factor_backup_codes IS 'Array of unused backup codes';
COMMENT ON COLUMN user_profiles.two_factor_enabled_at IS 'Timestamp when 2FA was enabled';
