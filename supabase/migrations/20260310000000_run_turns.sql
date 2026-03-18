-- RunTurn table for OpenClaw run-detail persistence
CREATE TABLE IF NOT EXISTS run_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL,
  idx integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('initial', 'follow_up', 'retry')),
  prompt text NOT NULL,
  status text NOT NULL,
  outcome_kind text CHECK (outcome_kind IN ('executed', 'advisory', 'no_evidence', 'failed', 'cancelled')),
  preferred_model text,
  actual_model text,
  gateway_run_id text,
  correlation_id text,
  summary text,
  output text,
  session_path text,
  trace jsonb DEFAULT '{}',
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(run_id, idx)
);

-- Add run_turn_id to artifacts
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS run_turn_id uuid REFERENCES run_turns(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_run_turns_run_id ON run_turns(run_id);
CREATE INDEX IF NOT EXISTS idx_run_turns_status ON run_turns(status);
CREATE INDEX IF NOT EXISTS idx_run_turns_correlation_id ON run_turns(correlation_id);
CREATE INDEX IF NOT EXISTS idx_run_turns_gateway_run_id ON run_turns(gateway_run_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_run_turn_id ON artifacts(run_turn_id);

-- Enable RLS
ALTER TABLE run_turns ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='run_turns' AND policyname='run_turns_authenticated') THEN
    CREATE POLICY run_turns_authenticated ON run_turns FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_run_turns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'run_turns_updated_at_trigger') THEN
    CREATE TRIGGER run_turns_updated_at_trigger
    BEFORE UPDATE ON run_turns
    FOR EACH ROW
    EXECUTE FUNCTION update_run_turns_updated_at();
  END IF;
END $$;
