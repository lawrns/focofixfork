-- Migration: Task Intake Queue
-- Module 2: Task Intake / Quick Capture

-- Task intake queue table
CREATE TABLE task_intake_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES foco_projects(id) ON DELETE SET NULL,
  raw_text text NOT NULL,
  parsed_result jsonb DEFAULT '{}',
  classification text NOT NULL CHECK (classification IN ('human', 'ai', 'hybrid', 'unclear')),
  auto_completed boolean DEFAULT false,
  task_id uuid REFERENCES work_items(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'parsed', 'classified', 'dispatched', 'completed', 'discarded')),
  ai_analysis jsonb DEFAULT '{}',
  confidence_score float DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Indexes for efficient querying
CREATE INDEX idx_task_intake_user ON task_intake_queue(user_id);
CREATE INDEX idx_task_intake_project ON task_intake_queue(project_id);
CREATE INDEX idx_task_intake_status ON task_intake_queue(status);
CREATE INDEX idx_task_intake_classification ON task_intake_queue(classification);
CREATE INDEX idx_task_intake_created ON task_intake_queue(created_at DESC);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_task_intake_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_intake_updated_at ON task_intake_queue;
CREATE TRIGGER trg_task_intake_updated_at
  BEFORE UPDATE ON task_intake_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_task_intake_updated_at();

-- RLS policies
ALTER TABLE task_intake_queue ENABLE ROW LEVEL SECURITY;

-- Users can only see their own intake items
CREATE POLICY task_intake_select_policy ON task_intake_queue
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY task_intake_insert_policy ON task_intake_queue
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY task_intake_update_policy ON task_intake_queue
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY task_intake_delete_policy ON task_intake_queue
  FOR DELETE USING (user_id = auth.uid());

-- Add comment for documentation
COMMENT ON TABLE task_intake_queue IS 'Stores natural language task inputs pending AI classification and processing';
