ALTER TABLE workspace_action_previews
  DROP CONSTRAINT IF EXISTS workspace_action_previews_preview_type_check;

ALTER TABLE workspace_action_previews
  ADD CONSTRAINT workspace_action_previews_preview_type_check CHECK (
    preview_type IN ('starter_plan', 'assistant_action', 'workflow_draft')
  );
