-- SQL to add Fyves team members
-- Run this directly in Supabase SQL Editor

-- First, check what users exist
SELECT id, email FROM auth.users WHERE email ILIKE '%@fyves.com%';

-- Check current workspace members
SELECT
  wm.id,
  wm.workspace_id,
  wm.user_id,
  wm.role,
  au.email,
  w.name as workspace_name
FROM workspace_members wm
JOIN auth.users au ON au.id = wm.user_id
JOIN workspaces w ON w.id = wm.workspace_id
WHERE au.email ILIKE '%@fyves.com%';

-- Add the team members (run this part after checking the above)
DO $$
DECLARE
  v_workspace_id uuid;
  v_laurence_id uuid;
  v_isaac_id uuid;
  v_daniel_id uuid;
BEGIN
  -- Find Fyves workspace
  SELECT id INTO v_workspace_id
  FROM workspaces
  WHERE LOWER(name) LIKE '%fyves%' OR LOWER(slug) LIKE '%fyves%'
  LIMIT 1;

  -- If no workspace found, get one from laurence's memberships
  IF v_workspace_id IS NULL THEN
    SELECT wm.workspace_id INTO v_workspace_id
    FROM workspace_members wm
    JOIN auth.users au ON au.id = wm.user_id
    WHERE LOWER(au.email) = 'laurence@fyves.com'
    LIMIT 1;
  END IF;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'No workspace found';
  END IF;

  RAISE NOTICE 'Using workspace: %', v_workspace_id;

  -- Get user IDs
  SELECT id INTO v_laurence_id FROM auth.users WHERE LOWER(email) = 'laurence@fyves.com';
  SELECT id INTO v_isaac_id FROM auth.users WHERE LOWER(email) = 'isaac@fyves.com';
  SELECT id INTO v_daniel_id FROM auth.users WHERE LOWER(email) = 'daniel@fyves.com';

  RAISE NOTICE 'Laurence ID: %', v_laurence_id;
  RAISE NOTICE 'Isaac ID: %', v_isaac_id;
  RAISE NOTICE 'Daniel ID: %', v_daniel_id;

  -- Add members
  IF v_laurence_id IS NOT NULL THEN
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, v_laurence_id, 'owner')
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';

    -- Ensure profile exists
    INSERT INTO user_profiles (id, email, full_name)
    VALUES (v_laurence_id, 'laurence@fyves.com', 'Laurence')
    ON CONFLICT (id) DO UPDATE SET email = 'laurence@fyves.com';
  END IF;

  IF v_isaac_id IS NOT NULL THEN
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, v_isaac_id, 'admin')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    INSERT INTO user_profiles (id, email, full_name)
    VALUES (v_isaac_id, 'isaac@fyves.com', 'Isaac')
    ON CONFLICT (id) DO UPDATE SET email = 'isaac@fyves.com';
  END IF;

  IF v_daniel_id IS NOT NULL THEN
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, v_daniel_id, 'admin')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    INSERT INTO user_profiles (id, email, full_name)
    VALUES (v_daniel_id, 'daniel@fyves.com', 'Daniel')
    ON CONFLICT (id) DO UPDATE SET email = 'daniel@fyves.com';
  END IF;

  RAISE NOTICE 'Done!';
END $$;

-- Verify the results
SELECT
  wm.id,
  wm.workspace_id,
  wm.role,
  au.email,
  up.full_name,
  w.name as workspace_name
FROM workspace_members wm
JOIN auth.users au ON au.id = wm.user_id
LEFT JOIN user_profiles up ON up.id = wm.user_id
JOIN workspaces w ON w.id = wm.workspace_id
WHERE au.email ILIKE '%@fyves.com%'
ORDER BY wm.role, au.email;
