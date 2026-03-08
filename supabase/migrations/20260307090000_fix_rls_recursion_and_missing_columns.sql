-- ============================================================
-- Fix 1: Break foco_projects <-> foco_project_members RLS cycle
-- ============================================================
-- foco_projects SELECT policy queries foco_project_members,
-- foco_project_members SELECT policy queries back to foco_projects.
-- This creates infinite recursion (PostgreSQL error 42P17).
--
-- Fix: create a SECURITY DEFINER function that checks project
-- membership without triggering any RLS policies, then use it
-- in foco_project_members. foco_projects policy is left alone
-- since the recursion originates from foco_project_members.

CREATE OR REPLACE FUNCTION public.user_can_view_project_member(proj_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- User is directly a member of this project
  SELECT EXISTS (
    SELECT 1 FROM foco_project_members
    WHERE project_id = proj_id AND user_id = uid
  )
  OR
  -- User is a workspace member of the workspace that owns this project
  EXISTS (
    SELECT 1
    FROM foco_projects fp
    INNER JOIN foco_workspace_members fwm ON fwm.workspace_id = fp.workspace_id
    WHERE fp.id = proj_id AND fwm.user_id = uid
  );
$$;

-- Drop the recursive policy and replace with SECURITY DEFINER-based one
DROP POLICY IF EXISTS "Users can view project members" ON foco_project_members;

CREATE POLICY "Users can view project members"
  ON foco_project_members
  FOR SELECT
  USING (
    public.user_can_view_project_member(project_id, auth.uid())
  );

-- ============================================================
-- Fix 2: Add missing columns to crico_project_health
-- ============================================================
-- Migration 20260303020000_improvement_velocity added these
-- columns but they are not present in the live schema.

ALTER TABLE crico_project_health
  ADD COLUMN IF NOT EXISTS autonomous_improvements_week int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS autonomous_improvements_month int DEFAULT 0;

-- ============================================================
-- Fix 3: Ensure workspace-root project exists for all workspaces
-- ============================================================
-- The workspace-root project is created lazily by the app, but
-- if it was never created the /empire/missions/workspace-root
-- route 404s. Bootstrap it here for all existing workspaces.

DO $$
DECLARE
  ws RECORD;
  owner_uid uuid;
BEGIN
  FOR ws IN SELECT id FROM foco_workspaces LOOP
    -- Find a workspace owner/admin to assign as project owner
    SELECT user_id INTO owner_uid
    FROM foco_workspace_members
    WHERE workspace_id = ws.id AND role IN ('owner', 'admin')
    ORDER BY created_at ASC
    LIMIT 1;

    -- Fall back to any member if no admin found
    IF owner_uid IS NULL THEN
      SELECT user_id INTO owner_uid
      FROM foco_workspace_members
      WHERE workspace_id = ws.id
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    -- Only create if we have an owner and project doesn't exist yet
    IF owner_uid IS NOT NULL THEN
      INSERT INTO foco_projects (
        workspace_id,
        owner_id,
        name,
        slug,
        description,
        color,
        icon,
        status,
        is_pinned
      )
      VALUES (
        ws.id,
        owner_uid,
        'Workspace Root',
        'workspace-root',
        'Global workspace project used for cross-codebase social intelligence and automation.',
        '#14b8a6',
        'folder',
        'active',
        true
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
