-- Focused backfill migration for environments that missed the broader
-- openclaw hardening migration prerequisites.
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
