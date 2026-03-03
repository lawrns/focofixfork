-- OpenClaw hardening + Apify + ElevenLabs + heartbeat observability
-- Created: 2026-03-03

-- -----------------------------------------------------------------------------
-- ledger_events idempotency support
-- -----------------------------------------------------------------------------
ALTER TABLE ledger_events
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS ledger_events_idempotency_key_uidx
  ON ledger_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- -----------------------------------------------------------------------------
-- content_sources extension for Apify
-- -----------------------------------------------------------------------------
ALTER TABLE content_sources
  ADD COLUMN IF NOT EXISTS provider_config jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS webhook_secret text;

ALTER TABLE content_sources
  DROP CONSTRAINT IF EXISTS content_sources_type_check;

ALTER TABLE content_sources
  ADD CONSTRAINT content_sources_type_check
  CHECK (type IN ('rss', 'api', 'webhook', 'scrape', 'apify'));

-- -----------------------------------------------------------------------------
-- Apify runs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS apify_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  external_run_id text NOT NULL,
  dataset_id text,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'succeeded', 'failed', 'aborted', 'timed_out')),
  metrics jsonb NOT NULL DEFAULT '{}',
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_id, external_run_id)
);

CREATE INDEX IF NOT EXISTS idx_apify_runs_source_id ON apify_runs(source_id);
CREATE INDEX IF NOT EXISTS idx_apify_runs_status ON apify_runs(status);
CREATE INDEX IF NOT EXISTS idx_apify_runs_created_at ON apify_runs(created_at DESC);

ALTER TABLE apify_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS apify_runs_owner ON apify_runs;
CREATE POLICY apify_runs_owner ON apify_runs FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM content_sources s
    JOIN foco_projects p ON p.id = s.project_id
    WHERE s.id = apify_runs.source_id
      AND p.owner_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- ElevenLabs cached voice generations
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-assets', 'voice-assets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS voice_assets_owner_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'voice-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY IF NOT EXISTS voice_assets_owner_write ON storage.objects
  FOR ALL USING (
    bucket_id = 'voice-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE TABLE IF NOT EXISTS voice_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES foco_projects(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hash_key text NOT NULL UNIQUE,
  text_content text NOT NULL,
  voice_id text NOT NULL,
  model_id text,
  parameters jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'complete'
    CHECK (status IN ('pending', 'complete', 'failed')),
  storage_bucket text NOT NULL DEFAULT 'voice-assets',
  storage_path text NOT NULL,
  mime_type text NOT NULL DEFAULT 'audio/mpeg',
  character_count integer NOT NULL DEFAULT 0,
  duration_seconds numeric(10,2),
  cost_usd numeric(10,6) DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_generations_user_created
  ON voice_generations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_generations_project
  ON voice_generations (project_id);

ALTER TABLE voice_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS voice_generations_select_own ON voice_generations;
CREATE POLICY voice_generations_select_own ON voice_generations
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS voice_generations_insert_own ON voice_generations;
CREATE POLICY voice_generations_insert_own ON voice_generations
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS voice_generations_update_own ON voice_generations;
CREATE POLICY voice_generations_update_own ON voice_generations
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS voice_generations_delete_own ON voice_generations;
CREATE POLICY voice_generations_delete_own ON voice_generations
  FOR DELETE USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Service heartbeat snapshots
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_heartbeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  status text NOT NULL CHECK (status IN ('up', 'down', 'degraded')),
  latency_ms integer,
  detail text,
  metadata jsonb NOT NULL DEFAULT '{}',
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_heartbeats_service_time
  ON service_heartbeats (service, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_heartbeats_checked_at
  ON service_heartbeats (checked_at DESC);

ALTER TABLE service_heartbeats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_heartbeats_authenticated_read ON service_heartbeats;
CREATE POLICY service_heartbeats_authenticated_read ON service_heartbeats
  FOR SELECT TO authenticated USING (true);

