-- Migration: Workspace agent foundation (pages, blocks, databases, revisions, search)
-- Depends on: foco_workspaces, foco_workspace_members, foco_projects, docs, set_updated_at_col(), vector

-- ---------------------------------------------------------------------------
-- 0. Compatibility updates
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'docs' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE docs
      ADD COLUMN archived_at timestamptz;
  END IF;
END $$;

COMMENT ON COLUMN docs.archived_at IS 'Soft-delete marker used by workspace-agent page APIs.';

CREATE INDEX IF NOT EXISTS idx_docs_archived_at
  ON docs (workspace_id, archived_at);

-- ---------------------------------------------------------------------------
-- 1. Access helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION foco_user_has_workspace_access(ws_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM foco_workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 2. Page blocks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS doc_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  doc_id uuid NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
  parent_block_id uuid REFERENCES doc_blocks(id) ON DELETE CASCADE,
  position bigint NOT NULL DEFAULT 0,
  block_type text NOT NULL CHECK (
    block_type IN (
      'paragraph',
      'heading_1',
      'heading_2',
      'heading_3',
      'bulleted_list_item',
      'numbered_list_item',
      'to_do',
      'toggle',
      'quote',
      'code',
      'callout',
      'divider',
      'database_inline'
    )
  ),
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  plain_text text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE doc_blocks IS 'Block storage for Notion-style workspace pages.';

CREATE INDEX IF NOT EXISTS idx_doc_blocks_workspace_doc
  ON doc_blocks (workspace_id, doc_id, position)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_doc_blocks_parent
  ON doc_blocks (parent_block_id)
  WHERE parent_block_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_doc_blocks_updated_at ON doc_blocks;
CREATE TRIGGER trg_doc_blocks_updated_at
  BEFORE UPDATE ON doc_blocks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

-- ---------------------------------------------------------------------------
-- 3. Page databases + rows
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS doc_databases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  parent_doc_id uuid REFERENCES docs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_view jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE doc_databases IS 'Structured databases embedded in or attached to workspace pages.';

CREATE INDEX IF NOT EXISTS idx_doc_databases_workspace
  ON doc_databases (workspace_id, created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_doc_databases_parent_doc
  ON doc_databases (parent_doc_id)
  WHERE parent_doc_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_doc_databases_updated_at ON doc_databases;
CREATE TRIGGER trg_doc_databases_updated_at
  BEFORE UPDATE ON doc_databases
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

CREATE TABLE IF NOT EXISTS doc_database_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id uuid NOT NULL REFERENCES doc_databases(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  page_id uuid REFERENCES docs(id) ON DELETE SET NULL,
  position bigint NOT NULL DEFAULT 0,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  plain_text text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE doc_database_rows IS 'Rows for workspace page databases.';

CREATE INDEX IF NOT EXISTS idx_doc_database_rows_database
  ON doc_database_rows (database_id, position)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_doc_database_rows_workspace
  ON doc_database_rows (workspace_id, created_at DESC)
  WHERE archived_at IS NULL;

DROP TRIGGER IF EXISTS trg_doc_database_rows_updated_at ON doc_database_rows;
CREATE TRIGGER trg_doc_database_rows_updated_at
  BEFORE UPDATE ON doc_database_rows
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

-- ---------------------------------------------------------------------------
-- 4. Revisions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workspace_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('page', 'page_blocks', 'database', 'database_row')),
  entity_id uuid NOT NULL,
  action text NOT NULL,
  snapshot jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE workspace_revisions IS 'Append-only revision snapshots for workspace-agent writes.';

CREATE INDEX IF NOT EXISTS idx_workspace_revisions_entity
  ON workspace_revisions (workspace_id, entity_type, entity_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Search chunks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workspace_search_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  source_key text NOT NULL UNIQUE,
  entity_type text NOT NULL CHECK (
    entity_type IN ('page', 'block', 'database', 'database_row', 'task', 'comment', 'memory')
  ),
  entity_id uuid NOT NULL,
  parent_entity_type text CHECK (
    parent_entity_type IS NULL OR parent_entity_type IN ('page', 'database', 'task', 'comment', 'memory')
  ),
  parent_entity_id uuid,
  plain_text text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(plain_text, ''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE workspace_search_chunks IS 'Hybrid lexical + semantic search index for workspace-agent context retrieval.';

CREATE INDEX IF NOT EXISTS idx_workspace_search_chunks_scope
  ON workspace_search_chunks (workspace_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_workspace_search_chunks_parent
  ON workspace_search_chunks (workspace_id, parent_entity_type, parent_entity_id)
  WHERE parent_entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_search_chunks_tsv
  ON workspace_search_chunks USING gin (search_vector);

DROP TRIGGER IF EXISTS trg_workspace_search_chunks_updated_at ON workspace_search_chunks;
CREATE TRIGGER trg_workspace_search_chunks_updated_at
  BEFORE UPDATE ON workspace_search_chunks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

CREATE OR REPLACE FUNCTION search_workspace_chunks(
  p_workspace_id uuid,
  p_query text,
  p_query_embedding vector(1536) DEFAULT NULL,
  p_entity_types text[] DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  entity_type text,
  entity_id uuid,
  parent_entity_type text,
  parent_entity_id uuid,
  plain_text text,
  metadata jsonb,
  lexical_rank real,
  semantic_score double precision,
  combined_score double precision
)
LANGUAGE sql
STABLE
AS $$
  WITH ranked AS (
    SELECT
      chunk.id,
      chunk.entity_type,
      chunk.entity_id,
      chunk.parent_entity_type,
      chunk.parent_entity_id,
      chunk.plain_text,
      chunk.metadata,
      ts_rank_cd(
        chunk.search_vector,
        websearch_to_tsquery('english', coalesce(nullif(trim(p_query), ''), ' '))
      ) AS lexical_rank,
      CASE
        WHEN p_query_embedding IS NULL OR chunk.embedding IS NULL THEN 0::double precision
        ELSE 1 - (chunk.embedding <=> p_query_embedding)
      END AS semantic_score,
      chunk.updated_at
    FROM workspace_search_chunks chunk
    WHERE chunk.workspace_id = p_workspace_id
      AND (
        p_entity_types IS NULL
        OR array_length(p_entity_types, 1) IS NULL
        OR chunk.entity_type = ANY(p_entity_types)
      )
      AND (
        chunk.search_vector @@ websearch_to_tsquery('english', coalesce(nullif(trim(p_query), ''), ' '))
        OR chunk.plain_text ILIKE '%' || p_query || '%'
        OR p_query_embedding IS NOT NULL
      )
  )
  SELECT
    ranked.id,
    ranked.entity_type,
    ranked.entity_id,
    ranked.parent_entity_type,
    ranked.parent_entity_id,
    ranked.plain_text,
    ranked.metadata,
    ranked.lexical_rank,
    ranked.semantic_score,
    (
      COALESCE(ranked.lexical_rank, 0)::double precision
      + (COALESCE(ranked.semantic_score, 0) * 0.35)
      + CASE WHEN ranked.plain_text ILIKE '%' || p_query || '%' THEN 0.2 ELSE 0 END
    ) AS combined_score
  FROM ranked
  ORDER BY combined_score DESC, ranked.updated_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
$$;

COMMENT ON FUNCTION search_workspace_chunks(uuid, text, vector, text[], integer)
IS 'Returns hybrid lexical + semantic workspace search results for agent retrieval.';

-- ---------------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE doc_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_database_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_search_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS doc_blocks_select_workspace ON doc_blocks;
CREATE POLICY doc_blocks_select_workspace ON doc_blocks
  FOR SELECT USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS doc_blocks_insert_workspace ON doc_blocks;
CREATE POLICY doc_blocks_insert_workspace ON doc_blocks
  FOR INSERT WITH CHECK (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS doc_blocks_update_workspace ON doc_blocks;
CREATE POLICY doc_blocks_update_workspace ON doc_blocks
  FOR UPDATE USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS doc_blocks_delete_workspace ON doc_blocks;
CREATE POLICY doc_blocks_delete_workspace ON doc_blocks
  FOR DELETE USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS doc_databases_select_workspace ON doc_databases;
CREATE POLICY doc_databases_select_workspace ON doc_databases
  FOR SELECT USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS doc_databases_insert_workspace ON doc_databases;
CREATE POLICY doc_databases_insert_workspace ON doc_databases
  FOR INSERT WITH CHECK (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS doc_databases_update_workspace ON doc_databases;
CREATE POLICY doc_databases_update_workspace ON doc_databases
  FOR UPDATE USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS doc_databases_delete_workspace ON doc_databases;
CREATE POLICY doc_databases_delete_workspace ON doc_databases
  FOR DELETE USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS doc_database_rows_select_workspace ON doc_database_rows;
CREATE POLICY doc_database_rows_select_workspace ON doc_database_rows
  FOR SELECT USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS doc_database_rows_insert_workspace ON doc_database_rows;
CREATE POLICY doc_database_rows_insert_workspace ON doc_database_rows
  FOR INSERT WITH CHECK (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS doc_database_rows_update_workspace ON doc_database_rows;
CREATE POLICY doc_database_rows_update_workspace ON doc_database_rows
  FOR UPDATE USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS doc_database_rows_delete_workspace ON doc_database_rows;
CREATE POLICY doc_database_rows_delete_workspace ON doc_database_rows
  FOR DELETE USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS workspace_revisions_select_workspace ON workspace_revisions;
CREATE POLICY workspace_revisions_select_workspace ON workspace_revisions
  FOR SELECT USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS workspace_revisions_insert_workspace ON workspace_revisions;
CREATE POLICY workspace_revisions_insert_workspace ON workspace_revisions
  FOR INSERT WITH CHECK (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS workspace_search_chunks_select_workspace ON workspace_search_chunks;
CREATE POLICY workspace_search_chunks_select_workspace ON workspace_search_chunks
  FOR SELECT USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS workspace_search_chunks_insert_workspace ON workspace_search_chunks;
CREATE POLICY workspace_search_chunks_insert_workspace ON workspace_search_chunks
  FOR INSERT WITH CHECK (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS workspace_search_chunks_update_workspace ON workspace_search_chunks;
CREATE POLICY workspace_search_chunks_update_workspace ON workspace_search_chunks
  FOR UPDATE USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS workspace_search_chunks_delete_workspace ON workspace_search_chunks;
CREATE POLICY workspace_search_chunks_delete_workspace ON workspace_search_chunks
  FOR DELETE USING (foco_user_has_workspace_access(workspace_id));
