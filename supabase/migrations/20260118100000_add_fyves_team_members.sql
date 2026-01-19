-- Migration: Add Fyves team members
-- Ensures laurence@fyves.com, isaac@fyves.com, and daniel@fyves.com are in the same workspace

-- First, get the Fyves workspace ID and user IDs, then add them as members
DO $$
DECLARE
  v_workspace_id uuid;
  v_laurence_id uuid;
  v_isaac_id uuid;
  v_daniel_id uuid;
BEGIN
  -- Find the Fyves workspace (or the first workspace with 'fyves' in the name/slug)
  SELECT id INTO v_workspace_id
  FROM workspaces
  WHERE LOWER(name) LIKE '%fyves%' OR LOWER(slug) LIKE '%fyves%'
  LIMIT 1;

  -- If no Fyves workspace found, try to find any workspace that laurence is in
  IF v_workspace_id IS NULL THEN
    SELECT wm.workspace_id INTO v_workspace_id
    FROM workspace_members wm
    JOIN auth.users au ON au.id = wm.user_id
    WHERE LOWER(au.email) = 'laurence@fyves.com'
    LIMIT 1;
  END IF;

  -- If still no workspace, create one
  IF v_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, slug)
    VALUES ('Fyves Team', 'fyves-team')
    RETURNING id INTO v_workspace_id;

    RAISE NOTICE 'Created new Fyves Team workspace: %', v_workspace_id;
  END IF;

  -- Get user IDs
  SELECT id INTO v_laurence_id FROM auth.users WHERE LOWER(email) = 'laurence@fyves.com';
  SELECT id INTO v_isaac_id FROM auth.users WHERE LOWER(email) = 'isaac@fyves.com';
  SELECT id INTO v_daniel_id FROM auth.users WHERE LOWER(email) = 'daniel@fyves.com';

  -- Add laurence as owner if not already a member
  IF v_laurence_id IS NOT NULL THEN
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, v_laurence_id, 'owner')
    ON CONFLICT (workspace_id, user_id)
    DO UPDATE SET role = 'owner';

    RAISE NOTICE 'Added/updated laurence@fyves.com as owner';
  ELSE
    RAISE NOTICE 'User laurence@fyves.com not found in auth.users';
  END IF;

  -- Add isaac as admin if not already a member
  IF v_isaac_id IS NOT NULL THEN
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, v_isaac_id, 'admin')
    ON CONFLICT (workspace_id, user_id)
    DO UPDATE SET role = EXCLUDED.role WHERE workspace_members.role != 'owner';

    RAISE NOTICE 'Added/updated isaac@fyves.com as admin';
  ELSE
    RAISE NOTICE 'User isaac@fyves.com not found in auth.users';
  END IF;

  -- Add daniel as admin if not already a member
  IF v_daniel_id IS NOT NULL THEN
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, v_daniel_id, 'admin')
    ON CONFLICT (workspace_id, user_id)
    DO UPDATE SET role = EXCLUDED.role WHERE workspace_members.role != 'owner';

    RAISE NOTICE 'Added/updated daniel@fyves.com as admin';
  ELSE
    RAISE NOTICE 'User daniel@fyves.com not found in auth.users';
  END IF;

  -- Also ensure user_profiles exist for these users
  IF v_laurence_id IS NOT NULL THEN
    INSERT INTO user_profiles (id, email, full_name)
    SELECT v_laurence_id, 'laurence@fyves.com', 'Laurence'
    WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = v_laurence_id);
  END IF;

  IF v_isaac_id IS NOT NULL THEN
    INSERT INTO user_profiles (id, email, full_name)
    SELECT v_isaac_id, 'isaac@fyves.com', 'Isaac'
    WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = v_isaac_id);
  END IF;

  IF v_daniel_id IS NOT NULL THEN
    INSERT INTO user_profiles (id, email, full_name)
    SELECT v_daniel_id, 'daniel@fyves.com', 'Daniel'
    WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = v_daniel_id);
  END IF;

  RAISE NOTICE 'Migration complete. Workspace ID: %', v_workspace_id;
END $$;
