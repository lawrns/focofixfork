-- n8n orchestration safety fix
-- Ensures upsert(onConflict: 'external_run_id') works for callback persistence.

-- Keep the newest row when duplicates exist, then enforce uniqueness.
WITH ranked AS (
  SELECT
    id,
    external_run_id,
    row_number() OVER (
      PARTITION BY external_run_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM automation_runs
  WHERE external_run_id IS NOT NULL
)
DELETE FROM automation_runs ar
USING ranked r
WHERE ar.id = r.id
  AND r.rn > 1;

DROP INDEX IF EXISTS automation_runs_external_run_id_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS automation_runs_external_run_id_uidx
  ON automation_runs (external_run_id);
