-- Setup Fyves Organization Script
-- This script creates the Fyves organization, adds team members, and assigns projects

-- Step 1: Create Fyves organization
INSERT INTO organizations (id, name, slug, description, created_by, is_active, created_at, updated_at)
VALUES (
  'fyves-org-001',
  'Fyves',
  'fyves',
  'Fyves Organization',
  (SELECT id FROM auth.users WHERE email = 'laurence@fyves.com'),
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Step 2: Add laurence@fyves.com as owner
INSERT INTO organization_members (organization_id, user_id, role, joined_at, created_at, updated_at)
SELECT
  'fyves-org-001',
  id,
  'owner',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'laurence@fyves.com'
ON CONFLICT (organization_id, user_id) DO UPDATE SET
  role = 'owner',
  updated_at = NOW();

-- Step 3: Add team members as admins/members
-- isaac@fyves.com
INSERT INTO organization_members (organization_id, user_id, role, joined_at, created_at, updated_at)
SELECT
  'fyves-org-001',
  id,
  'admin',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'isaac@fyves.com'
ON CONFLICT (organization_id, user_id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- jose@fyves.com
INSERT INTO organization_members (organization_id, user_id, role, joined_at, created_at, updated_at)
SELECT
  'fyves-org-001',
  id,
  'admin',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'jose@fyves.com'
ON CONFLICT (organization_id, user_id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- paul@fyves.com
INSERT INTO organization_members (organization_id, user_id, role, joined_at, created_at, updated_at)
SELECT
  'fyves-org-001',
  id,
  'admin',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'paul@fyves.com'
ON CONFLICT (organization_id, user_id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- oscar@fyves.com
INSERT INTO organization_members (organization_id, user_id, role, joined_at, created_at, updated_at)
SELECT
  'fyves-org-001',
  id,
  'admin',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'oscar@fyves.com'
ON CONFLICT (organization_id, user_id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- cesar@fyves.com
INSERT INTO organization_members (organization_id, user_id, role, joined_at, created_at, updated_at)
SELECT
  'fyves-org-001',
  id,
  'admin',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'cesar@fyves.com'
ON CONFLICT (organization_id, user_id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- Step 4: Assign all projects from laurence@fyves.com to Fyves organization
UPDATE projects
SET organization_id = 'fyves-org-001',
    updated_at = NOW()
WHERE created_by = (SELECT id FROM auth.users WHERE email = 'laurence@fyves.com')
  AND (organization_id IS NULL OR organization_id != 'fyves-org-001');

-- Step 5: Ensure all team members have access to all projects
-- Add project members for each team member and each project
INSERT INTO project_members (project_id, user_id, role, joined_at, created_at, updated_at)
SELECT
  p.id as project_id,
  u.id as user_id,
  'admin' as role,
  NOW() as joined_at,
  NOW() as created_at,
  NOW() as updated_at
FROM projects p
CROSS JOIN auth.users u
WHERE p.organization_id = 'fyves-org-001'
  AND u.email IN ('laurence@fyves.com', 'isaac@fyves.com', 'jose@fyves.com', 'paul@fyves.com', 'oscar@fyves.com', 'cesar@fyves.com')
ON CONFLICT (project_id, user_id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- Verification queries
SELECT 'Organization Created:' as step, name, slug, created_by
FROM organizations WHERE slug = 'fyves';

SELECT 'Organization Members:' as step, u.email, om.role
FROM organization_members om
JOIN auth.users u ON om.user_id = u.id
WHERE om.organization_id = 'fyves-org-001'
ORDER BY om.role, u.email;

SELECT 'Projects Assigned:' as step, COUNT(*) as project_count
FROM projects
WHERE organization_id = 'fyves-org-001';

SELECT 'Project Members:' as step, COUNT(*) as member_count
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
WHERE p.organization_id = 'fyves-org-001';
