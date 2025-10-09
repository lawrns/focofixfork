#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://czijxfbkihrauyjwcgfn.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function runMigration() {
  console.log('🔄 Running migration 016: Add missing user_profiles columns...')
  console.log('\n📋 Migration SQL to run manually in Supabase SQL Editor:')
  console.log('=' .repeat(70))
  console.log(`
-- Migration: Add missing columns to user_profiles table
-- This migration adds display_name, email_notifications, and theme_preference columns
-- that are required by the registration and user management code

-- Add display_name column
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add email_notifications column with default true
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

-- Add theme_preference column with default 'system'
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system';

-- Create index on display_name for better performance in searches
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);

-- Update existing records to have display_name from users table if available
-- This is a best-effort update for existing users
UPDATE user_profiles
SET display_name = users.full_name
FROM users
WHERE user_profiles.user_id = users.id
  AND user_profiles.display_name IS NULL
  AND users.full_name IS NOT NULL;

-- For users without full_name in users table, use their email prefix as display_name
UPDATE user_profiles
SET display_name = SPLIT_PART(users.email, '@', 1)
FROM users
WHERE user_profiles.user_id = users.id
  AND user_profiles.display_name IS NULL;
`)
  console.log('=' .repeat(70))
  console.log('\n⚠️  Supabase does not support exec_sql RPC.')
  console.log('📝 Please run the SQL above manually in the Supabase SQL Editor.')
  console.log('🔗 Direct link: https://supabase.com/dashboard/project/czijxfbkihrauyjwcgfn/sql')
}

runMigration()
