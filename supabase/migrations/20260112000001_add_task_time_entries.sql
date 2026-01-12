-- Task Time Entries Table
-- Tracks time spent on tasks with start/end times and notes

CREATE TABLE IF NOT EXISTS task_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_duration CHECK (duration_seconds > 0)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON task_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task_user ON task_time_entries(task_id, user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_created_at ON task_time_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON task_time_entries(start_time);

-- Enable RLS
ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Task Time Entries
CREATE POLICY "Users can read their own time entries" ON task_time_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create time entries for their tasks" ON task_time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries" ON task_time_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time entries" ON task_time_entries
  FOR DELETE USING (auth.uid() = user_id);

-- View for task time statistics
CREATE OR REPLACE VIEW task_time_stats AS
SELECT
  task_id,
  COUNT(*) as entry_count,
  SUM(duration_seconds) as total_seconds,
  AVG(duration_seconds) as avg_duration_seconds,
  MIN(start_time) as first_entry_time,
  MAX(end_time) as last_entry_time,
  COUNT(DISTINCT user_id) as contributor_count
FROM task_time_entries
GROUP BY task_id;

-- Add total_time_seconds column to tasks table for denormalization
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS total_time_seconds INTEGER DEFAULT 0;

-- Create trigger to update task total_time_seconds when time entries change
CREATE OR REPLACE FUNCTION update_task_total_time()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tasks
  SET total_time_seconds = (
    SELECT COALESCE(SUM(duration_seconds), 0)
    FROM task_time_entries
    WHERE task_id = NEW.task_id
  ),
  updated_at = NOW()
  WHERE id = NEW.task_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_task_total_time_insert ON task_time_entries;
DROP TRIGGER IF EXISTS update_task_total_time_delete ON task_time_entries;
DROP TRIGGER IF EXISTS update_task_total_time_update ON task_time_entries;

-- Create triggers
CREATE TRIGGER update_task_total_time_insert
AFTER INSERT ON task_time_entries
FOR EACH ROW
EXECUTE FUNCTION update_task_total_time();

CREATE TRIGGER update_task_total_time_update
AFTER UPDATE ON task_time_entries
FOR EACH ROW
EXECUTE FUNCTION update_task_total_time();

CREATE TRIGGER update_task_total_time_delete
AFTER DELETE ON task_time_entries
FOR EACH ROW
EXECUTE FUNCTION update_task_total_time();
