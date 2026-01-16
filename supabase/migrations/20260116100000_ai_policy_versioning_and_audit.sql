-- Migration: AI Policy Versioning and Audit Logging
-- Adds version tracking for workspace AI policies and comprehensive audit logging for AI tool executions

-- ====================
-- PART 1: Add versioning fields to workspaces
-- ====================

-- Add versioning columns to track ai_policy changes
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS ai_policy_version integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS ai_policy_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_policy_updated_at timestamptz DEFAULT now();

-- Create index for version lookups
CREATE INDEX IF NOT EXISTS workspaces_ai_policy_version_idx ON workspaces (ai_policy_version);

-- ====================
-- PART 2: Create ai_policy_history table
-- ====================

-- Table to track all changes to workspace AI policies
CREATE TABLE IF NOT EXISTS ai_policy_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version integer NOT NULL,
  policy jsonb NOT NULL, -- Full snapshot of ai_policy at this version
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now() NOT NULL,
  change_reason text, -- Optional description of why the policy was changed

  -- Ensure one record per version per workspace
  UNIQUE (workspace_id, version)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS ai_policy_history_workspace_id_idx ON ai_policy_history (workspace_id);
CREATE INDEX IF NOT EXISTS ai_policy_history_version_idx ON ai_policy_history (workspace_id, version DESC);
CREATE INDEX IF NOT EXISTS ai_policy_history_changed_at_idx ON ai_policy_history (changed_at DESC);
CREATE INDEX IF NOT EXISTS ai_policy_history_changed_by_idx ON ai_policy_history (changed_by);

-- Enable RLS
ALTER TABLE ai_policy_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Workspace admins can view policy history
DROP POLICY IF EXISTS "Workspace admins can view policy history" ON ai_policy_history;
CREATE POLICY "Workspace admins can view policy history"
  ON ai_policy_history
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ====================
-- PART 3: Create ai_audit_log table
-- ====================

-- Table to track all AI tool executions for compliance and debugging
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id uuid, -- Group related AI calls together
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Tool execution details
  tool_name text NOT NULL, -- e.g., 'generate_text', 'code_review', 'summarize'
  tool_args jsonb, -- Sanitized arguments (sensitive fields redacted)
  model text NOT NULL, -- e.g., 'deepseek-chat', 'gpt-4o-mini'
  prompt_hash text, -- SHA256 hash of system prompt for traceability
  ai_policy_version integer, -- Which policy version was active during execution

  -- Execution results
  result_success boolean NOT NULL,
  result_data jsonb, -- Summary/metadata, not full response (to save space)
  error_message text, -- If result_success = false

  -- Performance metrics
  latency_ms integer, -- Execution time in milliseconds
  token_count integer, -- Total tokens used (if available)
  cost_estimate decimal(10, 6), -- Estimated cost in USD

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  ip_address inet, -- Client IP for security auditing
  user_agent text -- Client user agent
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS ai_audit_log_workspace_id_idx ON ai_audit_log (workspace_id);
CREATE INDEX IF NOT EXISTS ai_audit_log_user_id_idx ON ai_audit_log (user_id);
CREATE INDEX IF NOT EXISTS ai_audit_log_correlation_id_idx ON ai_audit_log (correlation_id);
CREATE INDEX IF NOT EXISTS ai_audit_log_created_at_idx ON ai_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_audit_log_tool_name_idx ON ai_audit_log (tool_name);
CREATE INDEX IF NOT EXISTS ai_audit_log_model_idx ON ai_audit_log (model);
CREATE INDEX IF NOT EXISTS ai_audit_log_result_success_idx ON ai_audit_log (result_success);
CREATE INDEX IF NOT EXISTS ai_audit_log_ai_policy_version_idx ON ai_audit_log (ai_policy_version);

-- Composite index for workspace analytics
CREATE INDEX IF NOT EXISTS ai_audit_log_workspace_created_at_idx ON ai_audit_log (workspace_id, created_at DESC);

-- Enable RLS
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Workspace admins can view audit logs
DROP POLICY IF EXISTS "Workspace admins can view audit logs" ON ai_audit_log;
CREATE POLICY "Workspace admins can view audit logs"
  ON ai_audit_log
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- RLS Policy: System/authenticated users can insert audit logs
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON ai_audit_log;
CREATE POLICY "Authenticated users can insert audit logs"
  ON ai_audit_log
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid() OR user_id IS NULL
    )
  );

-- ====================
-- PART 4: Create trigger function for automatic policy versioning
-- ====================

-- Function to snapshot ai_policy to history whenever it changes
CREATE OR REPLACE FUNCTION snapshot_ai_policy_to_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create snapshot if ai_policy actually changed
  IF OLD.ai_policy IS DISTINCT FROM NEW.ai_policy THEN
    -- Increment version
    NEW.ai_policy_version := OLD.ai_policy_version + 1;
    NEW.ai_policy_updated_by := auth.uid();
    NEW.ai_policy_updated_at := now();

    -- Insert snapshot into history table
    INSERT INTO ai_policy_history (
      workspace_id,
      version,
      policy,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      NEW.ai_policy_version,
      NEW.ai_policy,
      NEW.ai_policy_updated_by,
      NEW.ai_policy_updated_at
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on workspaces
DROP TRIGGER IF EXISTS ai_policy_version_trigger ON workspaces;
CREATE TRIGGER ai_policy_version_trigger
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  WHEN (OLD.ai_policy IS DISTINCT FROM NEW.ai_policy)
  EXECUTE FUNCTION snapshot_ai_policy_to_history();

-- ====================
-- PART 5: Helper functions for audit logging
-- ====================

-- Function to log AI tool execution
CREATE OR REPLACE FUNCTION log_ai_tool_execution(
  p_workspace_id uuid,
  p_tool_name text,
  p_model text,
  p_result_success boolean,
  p_latency_ms integer DEFAULT NULL,
  p_correlation_id uuid DEFAULT NULL,
  p_tool_args jsonb DEFAULT NULL,
  p_result_data jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_token_count integer DEFAULT NULL,
  p_cost_estimate decimal DEFAULT NULL,
  p_prompt_hash text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id uuid;
  current_policy_version integer;
BEGIN
  -- Get current ai_policy_version for the workspace
  SELECT ai_policy_version INTO current_policy_version
  FROM workspaces
  WHERE id = p_workspace_id;

  -- Insert audit log entry
  INSERT INTO ai_audit_log (
    correlation_id,
    workspace_id,
    user_id,
    tool_name,
    tool_args,
    model,
    prompt_hash,
    ai_policy_version,
    result_success,
    result_data,
    error_message,
    latency_ms,
    token_count,
    cost_estimate,
    ip_address,
    user_agent
  ) VALUES (
    COALESCE(p_correlation_id, gen_random_uuid()),
    p_workspace_id,
    auth.uid(),
    p_tool_name,
    p_tool_args,
    p_model,
    p_prompt_hash,
    current_policy_version,
    p_result_success,
    p_result_data,
    p_error_message,
    p_latency_ms,
    p_token_count,
    p_cost_estimate,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$;

-- Function to get policy version at specific timestamp
CREATE OR REPLACE FUNCTION get_ai_policy_at_timestamp(
  p_workspace_id uuid,
  p_timestamp timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policy_data jsonb;
BEGIN
  -- Find the most recent policy change before or at the given timestamp
  SELECT policy INTO policy_data
  FROM ai_policy_history
  WHERE workspace_id = p_workspace_id
    AND changed_at <= p_timestamp
  ORDER BY changed_at DESC
  LIMIT 1;

  -- If no history found, return current policy
  IF policy_data IS NULL THEN
    SELECT ai_policy INTO policy_data
    FROM workspaces
    WHERE id = p_workspace_id;
  END IF;

  RETURN policy_data;
END;
$$;

-- Function to get audit log summary for workspace
CREATE OR REPLACE FUNCTION get_workspace_ai_usage_summary(
  p_workspace_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  summary json;
  start_ts timestamptz;
  end_ts timestamptz;
BEGIN
  -- Verify user has admin access to workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: user is not a workspace admin';
  END IF;

  -- Set default date range (last 30 days)
  start_ts := COALESCE(p_start_date, now() - interval '30 days');
  end_ts := COALESCE(p_end_date, now());

  -- Build summary
  SELECT json_build_object(
    'total_executions', COUNT(*),
    'successful_executions', COUNT(*) FILTER (WHERE result_success = true),
    'failed_executions', COUNT(*) FILTER (WHERE result_success = false),
    'total_tokens', SUM(token_count),
    'total_cost', SUM(cost_estimate),
    'avg_latency_ms', AVG(latency_ms),
    'unique_users', COUNT(DISTINCT user_id),
    'unique_tools', COUNT(DISTINCT tool_name),
    'executions_by_model', (
      SELECT json_object_agg(model, count)
      FROM (
        SELECT model, COUNT(*) as count
        FROM ai_audit_log
        WHERE workspace_id = p_workspace_id
          AND created_at BETWEEN start_ts AND end_ts
        GROUP BY model
      ) model_counts
    ),
    'executions_by_tool', (
      SELECT json_object_agg(tool_name, count)
      FROM (
        SELECT tool_name, COUNT(*) as count
        FROM ai_audit_log
        WHERE workspace_id = p_workspace_id
          AND created_at BETWEEN start_ts AND end_ts
        GROUP BY tool_name
      ) tool_counts
    )
  ) INTO summary
  FROM ai_audit_log
  WHERE workspace_id = p_workspace_id
    AND created_at BETWEEN start_ts AND end_ts;

  RETURN summary;
END;
$$;

-- ====================
-- PART 6: Initialize version 1 for existing workspaces
-- ====================

-- Create initial history entries for workspaces that have non-empty ai_policy
INSERT INTO ai_policy_history (workspace_id, version, policy, changed_at)
SELECT
  id,
  1,
  ai_policy,
  ai_policy_updated_at
FROM workspaces
WHERE ai_policy IS NOT NULL
  AND ai_policy != '{}'::jsonb
  AND NOT EXISTS (
    SELECT 1 FROM ai_policy_history
    WHERE ai_policy_history.workspace_id = workspaces.id
      AND ai_policy_history.version = 1
  );

-- Migration complete!
-- Summary:
-- - Added ai_policy_version, ai_policy_updated_by, ai_policy_updated_at to workspaces
-- - Created ai_policy_history table for version tracking with workspace admin read access
-- - Created ai_audit_log table for comprehensive AI execution logging
-- - Set up RLS policies for secure access control
-- - Created automatic versioning trigger on ai_policy changes
-- - Added helper functions for logging and querying AI usage
-- - Initialized version 1 for existing workspaces with ai_policy
