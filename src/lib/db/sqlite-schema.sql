-- SQLite schema for foco.mx local-first mode
-- Mirrors the Supabase Postgres schema without PG-specific syntax.
-- Applied automatically by SqliteAdapter.ensureSchema() on first start.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─── Workspaces ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS foco_workspaces (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS foco_workspace_members (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  workspace_id TEXT NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'member',
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Projects ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS foco_projects (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  workspace_id TEXT NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  color        TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Work Items (Tasks) ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS work_items (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  workspace_id TEXT NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  project_id   TEXT REFERENCES foco_projects(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'todo',
  priority     TEXT,
  assignee_id  TEXT,
  due_date     TEXT,
  agent_state  TEXT DEFAULT '{}',  -- JSON blob
  ignored      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Runs ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS runs (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  task_id     TEXT REFERENCES work_items(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  summary     TEXT,
  started_at  TEXT,
  ended_at    TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS run_steps (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_id     TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  input      TEXT DEFAULT '{}',   -- JSON blob
  output     TEXT DEFAULT '{}',   -- JSON blob
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Artifacts ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS artifacts (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_id     TEXT REFERENCES runs(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  uri        TEXT NOT NULL,
  meta       TEXT DEFAULT '{}',   -- JSON blob
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Ledger ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ledger_events (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  type           TEXT NOT NULL,
  source         TEXT NOT NULL,
  context_id     TEXT,
  correlation_id TEXT,
  causation_id   TEXT,
  workspace_id   TEXT,   -- optional: which workspace this event belongs to
  user_id        TEXT,   -- optional: which user triggered this event
  payload        TEXT DEFAULT '{}',   -- JSON blob
  timestamp      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON ledger_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_events(type);
CREATE INDEX IF NOT EXISTS idx_ledger_workspace ON ledger_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_events(user_id);

-- ─── Notifications ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL,
  message    TEXT,
  read       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── User Profiles ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id           TEXT PRIMARY KEY,
  email        TEXT UNIQUE,
  full_name    TEXT,
  avatar_url   TEXT,
  timezone     TEXT DEFAULT 'UTC',
  onboarded    INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── WhatsApp Links ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS whatsapp_user_links (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  verified     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Comments ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS foco_comments (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  work_item_id   TEXT REFERENCES work_items(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL,
  content        TEXT NOT NULL,
  is_ai_generated INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Crons ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crons (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  workspace_id TEXT NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  schedule     TEXT NOT NULL,
  action_type  TEXT NOT NULL DEFAULT 'webhook',
  action_config TEXT DEFAULT '{}',
  enabled      INTEGER NOT NULL DEFAULT 1,
  last_run_at  TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Email Templates ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_templates (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  workspace_id TEXT NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  subject      TEXT NOT NULL,
  body_html    TEXT,
  body_text    TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  workspace_id TEXT REFERENCES foco_workspaces(id) ON DELETE SET NULL,
  to_address   TEXT NOT NULL,
  subject      TEXT NOT NULL,
  body_html    TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  sent_at      TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
