-- Create Missing Fyves Users - Fixed Version
-- Creates: isaac@fyves.com, jose@fyves.com, paul@fyves.com, oscar@fyves.com
-- Password: hennie12

-- Step 1: Create users in auth.users
-- Note: Supabase uses crypt() with gen_salt('bf') for bcrypt

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_sent_at
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  email_to_create,
  crypt('hennie12', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  ('{"full_name":"' || full_name || '","display_name":"' || full_name || '"}')::jsonb,
  false,
  NOW()
FROM (
  VALUES
    ('isaac@fyves.com', 'Isaac Fyves'),
    ('jose@fyves.com', 'Jose Fyves'),
    ('paul@fyves.com', 'Paul Fyves'),
    ('oscar@fyves.com', 'Oscar Fyves')
) AS users_to_create(email_to_create, full_name)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = email_to_create
);

-- Step 2: Create user_profiles
INSERT INTO user_profiles (id, user_id, display_name, email_notifications, theme_preference, created_at, updated_at)
SELECT
  au.id,
  au.id,
  COALESCE(au.raw_user_meta_data->>'display_name', 'User'),
  true,
  'light',
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email IN ('isaac@fyves.com', 'jose@fyves.com', 'paul@fyves.com', 'oscar@fyves.com')
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = au.id
  );

-- Step 3: Add to Fyves organization
INSERT INTO organization_members (organization_id, user_id, role, joined_at, created_at, updated_at)
SELECT
  '4d951a69-8cb0-4556-8201-b85405ce38b9'::uuid,
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

-- Step 4: Grant access to all Fyves projects
INSERT INTO project_members (project_id, user_id, role, joined_at, created_at, updated_at)
SELECT DISTINCT
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
  '=== CREATED USERS ===' as section,
  email,
  email_confirmed_at IS NOT NULL as confirmed,
  created_at
FROM auth.users
WHERE email IN ('isaac@fyves.com', 'jose@fyves.com', 'paul@fyves.com', 'oscar@fyves.com')
ORDER BY email;

SELECT
  '=== ALL FYVES USERS ===' as section,
  email,
  (SELECT COUNT(*) FROM organization_members om WHERE om.user_id = au.id) as org_memberships,
  (SELECT COUNT(*) FROM project_members pm WHERE pm.user_id = au.id) as project_access
FROM auth.users au
WHERE email LIKE '%fyves.com'
ORDER BY email;

SELECT
  '=== FYVES ORGANIZATION ===' as section,
  au.email,
  om.role
FROM organization_members om
JOIN auth.users au ON om.user_id = au.id
WHERE om.organization_id = '4d951a69-8cb0-4556-8201-b85405ce38b9'
ORDER BY om.role DESC, au.email;

SELECT '✅ Users created! Login with password: hennie12' as result;
