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
  console.log('🔄 Running migration 015: Add user_profiles RLS policies...')
  console.log('\n📋 Migration SQL to run manually in Supabase SQL Editor:')
  console.log('=' .repeat(70))
  console.log(`
-- Migration: Add RLS policies for user_profiles table
-- Copy and paste this into: https://supabase.com/dashboard/project/czijxfbkihrauyjwcgfn/sql

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
`)
  console.log('=' .repeat(70))
  console.log('\n⚠️  Supabase does not support exec_sql RPC.')
  console.log('📝 Please run the SQL above manually in the Supabase SQL Editor.')
  console.log('🔗 Direct link: https://supabase.com/dashboard/project/czijxfbkihrauyjwcgfn/sql')
}

runMigration()
