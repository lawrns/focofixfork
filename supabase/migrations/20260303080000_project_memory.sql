-- Migration: Project Memory Segments
-- Module 6: Memory Management

-- Memory segments table for storing project knowledge
CREATE TABLE IF NOT EXISTS project_memory_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  topic text NOT NULL CHECK (topic IN ('debugging', 'patterns', 'architecture', 'api_contracts', 'general')),
  content text NOT NULL,
  token_count integer NOT NULL DEFAULT 0,
  source text NOT NULL CHECK (source IN ('handbook', 'codemap', 'pipeline_run', 'manual', 'auto_extracted')),
  source_id text, -- optional reference to source (e.g., handbook slug, run id)
  relevance_score float NOT NULL DEFAULT 0.5 CHECK (relevance_score >= 0 AND relevance_score <= 1),
  last_accessed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_memory_segments_project_id ON project_memory_segments(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_segments_topic ON project_memory_segments(topic);
CREATE INDEX IF NOT EXISTS idx_memory_segments_project_topic ON project_memory_segments(project_id, topic);
CREATE INDEX IF NOT EXISTS idx_memory_segments_relevance ON project_memory_segments(project_id, relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_memory_segments_source ON project_memory_segments(source);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_memory_segments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_memory_segments_updated_at ON project_memory_segments;
CREATE TRIGGER trg_memory_segments_updated_at
  BEFORE UPDATE ON project_memory_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_memory_segments_updated_at();

-- RLS policies
ALTER TABLE project_memory_segments ENABLE ROW LEVEL SECURITY;

-- Users can view memory segments for projects they have access to
CREATE POLICY memory_segments_select_policy ON project_memory_segments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM foco_projects p
      WHERE p.id = project_memory_segments.project_id
      AND (p.owner_id = auth.uid() OR p.is_public = true)
    )
  );

-- Users can insert memory segments for projects they own
CREATE POLICY memory_segments_insert_policy ON project_memory_segments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM foco_projects p
      WHERE p.id = project_memory_segments.project_id
      AND p.owner_id = auth.uid()
    )
  );

-- Users can update memory segments for projects they own
CREATE POLICY memory_segments_update_policy ON project_memory_segments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM foco_projects p
      WHERE p.id = project_memory_segments.project_id
      AND p.owner_id = auth.uid()
    )
  );

-- Users can delete memory segments for projects they own
CREATE POLICY memory_segments_delete_policy ON project_memory_segments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM foco_projects p
      WHERE p.id = project_memory_segments.project_id
      AND p.owner_id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON TABLE project_memory_segments IS 'Stores segmented project knowledge for AI context assembly';
