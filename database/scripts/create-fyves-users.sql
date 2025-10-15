-- Create Fyves Users Directly
-- This script creates users in auth.users and public.user_profiles

-- Note: Supabase uses auth.users for authentication
-- We need to use the auth schema functions or admin API

-- For now, let's create the user_profiles entries for the users that should exist
-- The actual auth users need to be created via Supabase Admin API

-- First, let's check what users exist
SELECT
  'Existing auth.users:' as info,
  id,
  email,
  created_at
FROM auth.users
WHERE email LIKE '%fyves.com'
ORDER BY email;

-- Create user_profiles for any missing users
-- Note: These will need actual auth.users entries created via Supabase Admin API

-- For isaac@fyves.com
INSERT INTO user_profiles (id, user_id, display_name, email_notifications, theme_preference)
SELECT
  au.id,
  au.id,
  'Isaac Fyves',
  true,
  'light'
FROM auth.users au
WHERE au.email = 'isaac@fyves.com'
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- For jose@fyves.com
INSERT INTO user_profiles (id, user_id, display_name, email_notifications, theme_preference)
SELECT
  au.id,
  au.id,
  'Jose Fyves',
  true,
  'light'
FROM auth.users au
WHERE au.email = 'jose@fyves.com'
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- For paul@fyves.com
INSERT INTO user_profiles (id, user_id, display_name, email_notifications, theme_preference)
SELECT
  au.id,
  au.id,
  'Paul Fyves',
  true,
  'light'
FROM auth.users au
WHERE au.email = 'paul@fyves.com'
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- For oscar@fyves.com
INSERT INTO user_profiles (id, user_id, display_name, email_notifications, theme_preference)
SELECT
  au.id,
  au.id,
  'Oscar Fyves',
  true,
  'light'
FROM auth.users au
WHERE au.email = 'oscar@fyves.com'
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Verification
SELECT
  'User profiles created:' as info,
  COUNT(*) as count
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email LIKE '%fyves.com';

SELECT
  'Details:' as info,
  au.email,
  up.display_name,
  up.created_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email LIKE '%fyves.com'
ORDER BY au.email;
