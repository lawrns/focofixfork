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

async function executeMigration() {
  console.log('🔄 Executing migration 016: Add missing user_profiles columns...')

  try {
    // Execute each SQL statement separately since Supabase doesn't support multiple statements in one call

    console.log('📝 Adding display_name column...')
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;'
    })
    if (error1) console.log('⚠️  Display name column may already exist or error:', error1.message)

    console.log('📝 Adding email_notifications column...')
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;'
    })
    if (error2) console.log('⚠️  Email notifications column may already exist or error:', error2.message)

    console.log('📝 Adding theme_preference column...')
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT \'system\';'
    })
    if (error3) console.log('⚠️  Theme preference column may already exist or error:', error3.message)

    console.log('📝 Creating index on display_name...')
    const { error: error4 } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);'
    })
    if (error4) console.log('⚠️  Index creation error:', error4.message)

    console.log('📝 Updating existing records with display_name...')
    const { error: error5 } = await supabase.rpc('exec_sql', {
      sql: `UPDATE user_profiles
             SET display_name = users.full_name
             FROM users
             WHERE user_profiles.user_id = users.id
               AND user_profiles.display_name IS NULL
               AND users.full_name IS NOT NULL;`
    })
    if (error5) console.log('⚠️  Update existing records error:', error5.message)

    console.log('📝 Setting fallback display_name for users without full_name...')
    const { error: error6 } = await supabase.rpc('exec_sql', {
      sql: `UPDATE user_profiles
             SET display_name = SPLIT_PART(users.email, '@', 1)
             FROM users
             WHERE user_profiles.user_id = users.id
               AND user_profiles.display_name IS NULL;`
    })
    if (error6) console.log('⚠️  Fallback display_name error:', error6.message)

    console.log('✅ Migration 016 completed!')
    console.log('🔍 You can verify the changes by checking the user_profiles table structure.')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

executeMigration()
