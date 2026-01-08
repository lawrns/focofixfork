BEGIN;
CREATE TABLE IF NOT EXISTS migration_audit (
  id BIGSERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL,
  checksum TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  error_message TEXT,
  rows_affected_json JSONB DEFAULT '[]'::jsonb
);
CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGSERIAL PRIMARY KEY,
  migration_name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL,
  checksum TEXT
);
CREATE TABLE IF NOT EXISTS down_migrations (
  id BIGSERIAL PRIMARY KEY,
  migration_name TEXT UNIQUE NOT NULL,
  sql TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMIT;
