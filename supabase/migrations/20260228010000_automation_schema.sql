-- Automation Schema Migration
-- 2026-02-28
-- Adds automation_jobs, automation_runs, email_deliveries, notification_channels tables
-- Links ledger_events to automation runs and email deliveries

-- ─── Automation Jobs (synced from OpenClaw gateway) ───────────────────────────
CREATE TABLE IF NOT EXISTS automation_jobs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id     text        UNIQUE, -- OpenClaw gateway job ID
  name            text        NOT NULL,
  description     text,
  job_type        text        NOT NULL DEFAULT 'cron', -- cron, webhook, event_triggered
  schedule        text, -- cron expression for scheduled jobs
  enabled         boolean     NOT NULL DEFAULT true,
  handler         text        NOT NULL, -- job handler path/identifier
  payload         jsonb       DEFAULT '{}',
  policy          jsonb       DEFAULT '{}', -- AI policy for this job
  project_id      uuid        REFERENCES foco_projects(id) ON DELETE SET NULL,
  workspace_id    uuid        REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  last_run_at     timestamptz,
  last_status     text        DEFAULT 'pending', -- pending|running|completed|failed|cancelled
  next_run_at     timestamptz,
  metadata        jsonb       DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automation_jobs_external_id_idx ON automation_jobs (external_id);
CREATE INDEX IF NOT EXISTS automation_jobs_workspace_id_idx ON automation_jobs (workspace_id);
CREATE INDEX IF NOT EXISTS automation_jobs_project_id_idx ON automation_jobs (project_id);
CREATE INDEX IF NOT EXISTS automation_jobs_enabled_idx ON automation_jobs (enabled);
CREATE INDEX IF NOT EXISTS automation_jobs_last_status_idx ON automation_jobs (last_status);
CREATE INDEX IF NOT EXISTS automation_jobs_next_run_at_idx ON automation_jobs (next_run_at);

ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_jobs
CREATE POLICY automation_jobs_workspace_select ON automation_jobs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY automation_jobs_workspace_insert ON automation_jobs
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY automation_jobs_workspace_update ON automation_jobs
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY automation_jobs_workspace_delete ON automation_jobs
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

-- ─── Automation Runs (execution instances of automation_jobs) ─────────────────
CREATE TABLE IF NOT EXISTS automation_runs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid        NOT NULL REFERENCES automation_jobs(id) ON DELETE CASCADE,
  external_run_id text, -- OpenClaw gateway run ID if applicable
  status          text        NOT NULL DEFAULT 'pending', -- pending|running|completed|failed|cancelled
  trigger_type    text        NOT NULL DEFAULT 'scheduled', -- scheduled|manual|webhook|event
  started_at      timestamptz,
  ended_at        timestamptz,
  duration_ms     integer,
  logs            jsonb       DEFAULT '[]',
  output          jsonb       DEFAULT '{}',
  error           text,
  trace           jsonb       DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automation_runs_job_id_idx ON automation_runs (job_id);
CREATE INDEX IF NOT EXISTS automation_runs_status_idx ON automation_runs (status);
CREATE INDEX IF NOT EXISTS automation_runs_created_at_idx ON automation_runs (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS automation_runs_external_run_id_uidx
  ON automation_runs (external_run_id);

ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_runs (inherit from parent job's workspace)
CREATE POLICY automation_runs_select ON automation_runs
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM automation_jobs WHERE workspace_id IN (
        SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY automation_runs_insert ON automation_runs
  FOR INSERT WITH CHECK (
    job_id IN (
      SELECT id FROM automation_jobs WHERE workspace_id IN (
        SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY automation_runs_update ON automation_runs
  FOR UPDATE USING (
    job_id IN (
      SELECT id FROM automation_jobs WHERE workspace_id IN (
        SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- ─── Email Deliveries (detailed email tracking) ───────────────────────────────
CREATE TABLE IF NOT EXISTS email_deliveries (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id         uuid        REFERENCES email_outbox(id) ON DELETE SET NULL,
  automation_run_id uuid        REFERENCES automation_runs(id) ON DELETE SET NULL,
  task_id           uuid        REFERENCES work_items(id) ON DELETE SET NULL,
  project_id        uuid        REFERENCES foco_projects(id) ON DELETE SET NULL,
  workspace_id      uuid        REFERENCES foco_workspaces(id) ON DELETE SET NULL,
  "to"              text[]      NOT NULL,
  cc                text[],
  bcc               text[],
  subject           text        NOT NULL,
  body_md           text        NOT NULL,
  body_html         text,
  status            text        NOT NULL DEFAULT 'queued', -- queued|sending|sent|delivered|failed|bounced
  provider          text, -- resend|sendgrid|smtp
  provider_message_id text,
  retry_count       integer     DEFAULT 0,
  max_retries       integer     DEFAULT 3,
  queued_at         timestamptz NOT NULL DEFAULT now(),
  sent_at           timestamptz,
  delivered_at      timestamptz,
  failed_at         timestamptz,
  error             text,
  error_code        text,
  metadata          jsonb       DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_deliveries_outbox_id_idx ON email_deliveries (outbox_id);
CREATE INDEX IF NOT EXISTS email_deliveries_automation_run_id_idx ON email_deliveries (automation_run_id);
CREATE INDEX IF NOT EXISTS email_deliveries_task_id_idx ON email_deliveries (task_id);
CREATE INDEX IF NOT EXISTS email_deliveries_project_id_idx ON email_deliveries (project_id);
CREATE INDEX IF NOT EXISTS email_deliveries_workspace_id_idx ON email_deliveries (workspace_id);
CREATE INDEX IF NOT EXISTS email_deliveries_status_idx ON email_deliveries (status);
CREATE INDEX IF NOT EXISTS email_deliveries_created_at_idx ON email_deliveries (created_at DESC);

ALTER TABLE email_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_deliveries
CREATE POLICY email_deliveries_workspace_select ON email_deliveries
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    ) OR workspace_id IS NULL
  );

CREATE POLICY email_deliveries_workspace_insert ON email_deliveries
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    ) OR workspace_id IS NULL
  );

CREATE POLICY email_deliveries_workspace_update ON email_deliveries
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    ) OR workspace_id IS NULL
  );

-- ─── Notification Channels (for multi-channel notifications) ──────────────────
CREATE TABLE IF NOT EXISTS notification_channels (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  channel_type text        NOT NULL, -- email|slack|discord|webhook|telegram
  config       jsonb       NOT NULL DEFAULT '{}', -- provider-specific config
  is_active    boolean     NOT NULL DEFAULT true,
  created_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_channels_workspace_id_idx ON notification_channels (workspace_id);
CREATE INDEX IF NOT EXISTS notification_channels_type_idx ON notification_channels (channel_type);
CREATE INDEX IF NOT EXISTS notification_channels_active_idx ON notification_channels (is_active);

ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_channels
CREATE POLICY notification_channels_workspace_select ON notification_channels
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY notification_channels_workspace_insert ON notification_channels
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY notification_channels_workspace_update ON notification_channels
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

-- ─── Link ledger_events to automation runs and email deliveries ───────────────
-- Add columns to ledger_events if they don't exist
ALTER TABLE ledger_events 
  ADD COLUMN IF NOT EXISTS automation_run_id uuid REFERENCES automation_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email_delivery_id uuid REFERENCES email_deliveries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES automation_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ledger_events_automation_run_id_idx ON ledger_events (automation_run_id);
CREATE INDEX IF NOT EXISTS ledger_events_email_delivery_id_idx ON ledger_events (email_delivery_id);
CREATE INDEX IF NOT EXISTS ledger_events_job_id_idx ON ledger_events (job_id);

-- ─── Extend crons table with additional metadata ──────────────────────────────
ALTER TABLE crons 
  ADD COLUMN IF NOT EXISTS policy jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES foco_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- ─── Extend email_outbox with additional fields ───────────────────────────────
ALTER TABLE email_outbox 
  ADD COLUMN IF NOT EXISTS cc text[],
  ADD COLUMN IF NOT EXISTS bcc text[],
  ADD COLUMN IF NOT EXISTS body_html text,
  ADD COLUMN IF NOT EXISTS automation_run_id uuid REFERENCES automation_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES work_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES foco_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Update RLS policies for crons to support workspace
DROP POLICY IF EXISTS runs_authenticated ON runs;
CREATE POLICY runs_authenticated ON runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_automation_jobs_updated_at ON automation_jobs;
CREATE TRIGGER update_automation_jobs_updated_at
  BEFORE UPDATE ON automation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_automation_runs_updated_at ON automation_runs;
CREATE TRIGGER update_automation_runs_updated_at
  BEFORE UPDATE ON automation_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_deliveries_updated_at ON email_deliveries;
CREATE TRIGGER update_email_deliveries_updated_at
  BEFORE UPDATE ON email_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_channels_updated_at ON notification_channels;
CREATE TRIGGER update_notification_channels_updated_at
  BEFORE UPDATE ON notification_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
