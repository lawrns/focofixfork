-- Migration: wipe all application content for laurence@fyves.com
-- Preserves auth.users row; clears all workspace content, ledger events,
-- notifications, WhatsApp links, and user profile for a clean local-first start.

DO $$ DECLARE
  v_user_id uuid;
  v_ws uuid[];
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'laurence@fyves.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User laurence@fyves.com not found — skipping wipe';
    RETURN;
  END IF;

  SELECT ARRAY_AGG(id) INTO v_ws
    FROM foco_workspaces
    WHERE id IN (
      SELECT workspace_id FROM foco_workspace_members
      WHERE user_id = v_user_id AND role = 'owner'
    );

  -- Clear only ledger events owned by this user's workspaces (workspace-scoped)
  DELETE FROM ledger_events WHERE workspace_id = ANY(v_ws) OR user_id = v_user_id;
  -- Also delete unscoped events for a full dev reset (remove this line in production)
  DELETE FROM ledger_events WHERE workspace_id IS NULL AND user_id IS NULL;

  -- Clear artifacts linked to any run
  IF v_ws IS NOT NULL THEN
    DELETE FROM artifacts
      WHERE run_id IN (
        SELECT id FROM runs
        WHERE task_id IN (SELECT id FROM work_items WHERE workspace_id = ANY(v_ws))
      );

    -- Cascade workspace content
    DELETE FROM runs
      WHERE task_id IN (SELECT id FROM work_items WHERE workspace_id = ANY(v_ws));

    DELETE FROM work_items WHERE workspace_id = ANY(v_ws);
    DELETE FROM foco_projects WHERE workspace_id = ANY(v_ws);
    DELETE FROM foco_workspace_members WHERE workspace_id = ANY(v_ws);
    DELETE FROM foco_workspaces WHERE id = ANY(v_ws);
  END IF;

  DELETE FROM notifications WHERE user_id = v_user_id;
  DELETE FROM whatsapp_user_links WHERE user_id = v_user_id;
  DELETE FROM user_profiles WHERE id = v_user_id;

  RAISE NOTICE 'Wipe complete for user %', v_user_id;
END $$;
