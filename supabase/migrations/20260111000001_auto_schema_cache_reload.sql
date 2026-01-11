-- Automatic PostgREST Schema Cache Reload
-- Ensures PostgREST schema cache is invalidated whenever schema changes occur

-- Create a function to trigger PostgREST schema reload
CREATE OR REPLACE FUNCTION public.notify_pgrst_schema_change()
RETURNS EVENT_TRIGGER AS $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$ LANGUAGE PLPGSQL;

-- Create event trigger to fire after CREATE, ALTER, DROP DDL commands
DROP EVENT TRIGGER IF EXISTS notify_pgrst_on_schema_change CASCADE;

CREATE EVENT TRIGGER notify_pgrst_on_schema_change
ON DDL_COMMAND_END
WHEN TAG IN ('CREATE TABLE', 'ALTER TABLE', 'DROP TABLE',
             'CREATE INDEX', 'DROP INDEX', 'ALTER INDEX',
             'CREATE VIEW', 'ALTER VIEW', 'DROP VIEW',
             'CREATE POLICY', 'ALTER POLICY', 'DROP POLICY',
             'CREATE FUNCTION', 'ALTER FUNCTION', 'DROP FUNCTION',
             'CREATE TRIGGER', 'ALTER TRIGGER', 'DROP TRIGGER',
             'CREATE TYPE', 'ALTER TYPE', 'DROP TYPE',
             'CREATE SCHEMA', 'ALTER SCHEMA', 'DROP SCHEMA')
EXECUTE FUNCTION public.notify_pgrst_schema_change();

-- Add post-migration schema reload notification
-- This ensures cache is cleared immediately after migration completes
NOTIFY pgrst, 'reload schema';

-- Comment documenting this feature
COMMENT ON FUNCTION public.notify_pgrst_schema_change() IS
  'Automatically notifies PostgREST to reload schema cache when DDL changes occur. '
  'This prevents schema cache staling issues that can cause "Could not find column" errors.';

COMMENT ON EVENT TRIGGER notify_pgrst_on_schema_change IS
  'Event trigger that fires after DDL commands (CREATE/ALTER/DROP table, index, view, policy, function, trigger, type, schema) '
  'to ensure PostgREST schema cache is immediately invalidated and reloaded.';
