-- Recreate Fyves Users in auth.users
-- This script deletes existing users and recreates them with password 'hennie12'

-- Step 1: Delete existing users (if any)
DELETE FROM auth.users WHERE email IN (
  'isaac@fyves.com',
  'jose@fyves.com',
  'paul@fyves.com',
  'oscar@fyves.com'
);

-- Step 2: Insert users into auth.users with hashed password
-- Password: hennie12
-- Bcrypt hash: $2a$10$... (we'll use Supabase's default hashing)

-- For Supabase, we need to insert with proper structure
-- Note: encrypted_password is bcrypt hash of 'hennie12'
-- Generated with: bcrypt.hashSync('hennie12', 10)

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  last_sign_in_at
) VALUES
-- isaac@fyves.com
(
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'isaac@fyves.com',
  crypt('hennie12', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Isaac Fyves","display_name":"Isaac Fyves"}',
  false,
  NULL
),
-- jose@fyves.com
(
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'jose@fyves.com',
  crypt('hennie12', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Jose Fyves","display_name":"Jose Fyves"}',
  false,
  NULL
),
-- paul@fyves.com
(
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'paul@fyves.com',
  crypt('hennie12', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Paul Fyves","display_name":"Paul Fyves"}',
  false,
  NULL
),
-- oscar@fyves.com
(
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'oscar@fyves.com',
  crypt('hennie12', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Oscar Fyves","display_name":"Oscar Fyves"}',
  false,
  NULL
)
ON CONFLICT (email) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = NOW(),
  email_confirmed_at = NOW();

-- Step 3: Create user_profiles for new users
INSERT INTO user_profiles (id, user_id, display_name, email_notifications, theme_preference, created_at, updated_at)
SELECT
  au.id,
  au.id,
  COALESCE(au.raw_user_meta_data->>'display_name', SPLIT_PART(au.email, '@', 1)),
  true,
  'light',
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email IN ('isaac@fyves.com', 'jose@fyves.com', 'paul@fyves.com', 'oscar@fyves.com')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Step 4: Add users to Fyves organization
INSERT INTO organization_members (organization_id, user_id, role, joined_at, created_at, updated_at)
SELECT
  '4d951a69-8cb0-4556-8201-b85405ce38b9',
  au.id,
  'admin',
  NOW(),
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email IN ('isaac@fyves.com', 'jose@fyves.com', 'paul@fyves.com', 'oscar@fyves.com')
ON CONFLICT (organization_id, user_id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- Step 5: Grant project access
INSERT INTO project_members (project_id, user_id, role, joined_at, created_at, updated_at)
SELECT
  p.id,
  au.id,
  'admin',
  NOW(),
  NOW(),
  NOW()
FROM projects p
CROSS JOIN auth.users au
WHERE p.organization_id = '4d951a69-8cb0-4556-8201-b85405ce38b9'
  AND au.email IN ('isaac@fyves.com', 'jose@fyves.com', 'paul@fyves.com', 'oscar@fyves.com')
ON CONFLICT (project_id, user_id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- Verification
SELECT
  '=== AUTH USERS ===' as section,
  email,
  created_at,
  email_confirmed_at IS NOT NULL as confirmed
FROM auth.users
WHERE email LIKE '%fyves.com'
ORDER BY email;

SELECT
  '=== USER PROFILES ===' as section,
  up.display_name,
  au.email
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email LIKE '%fyves.com'
ORDER BY au.email;

SELECT
  '=== ORGANIZATION MEMBERS ===' as section,
  au.email,
  om.role
FROM organization_members om
JOIN auth.users au ON om.user_id = au.id
WHERE om.organization_id = '4d951a69-8cb0-4556-8201-b85405ce38b9'
ORDER BY au.email;

SELECT
  '=== PROJECT ACCESS ===' as section,
  COUNT(DISTINCT pm.user_id) as members_with_access,
  COUNT(DISTINCT pm.project_id) as projects_accessible
FROM project_members pm
JOIN auth.users au ON pm.user_id = au.id
WHERE au.email LIKE '%fyves.com';

-- Done
SELECT '✅ All Fyves users recreated with password: hennie12' as result;
