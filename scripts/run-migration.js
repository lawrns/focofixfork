const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function runSQL(sql, description) {
  console.log(`\n▶ ${description}`);
  try {
    const { data, error } = await supabase.rpc('exec', {
      query: sql
    });

    if (error) {
      // Try without RPC
      console.log('  Trying direct query...');
      const result = await supabase.from('_sql').select('*').limit(0);
      console.error('  ❌ Error:', error.message);
      return false;
    }

    console.log('  ✅ Success');
    return true;
  } catch (e) {
    console.error('  ❌ Exception:', e.message);
    return false;
  }
}

async function runMigration() {
  console.log('🚀 Starting migration...\n');

  // Step 1: Create foco_workspaces table
  await runSQL(`
    CREATE TABLE IF NOT EXISTS foco_workspaces (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      description text,
      logo_url text,
      settings jsonb DEFAULT '{}'::jsonb,
      ai_policy jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  `, 'Create foco_workspaces table');

  // Step 2: Insert data from organizations
  await runSQL(`
    INSERT INTO foco_workspaces (id, name, slug, description, created_at, updated_at)
    SELECT
      id,
      name,
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) as slug,
      description,
      created_at,
      updated_at
    FROM organizations
    ON CONFLICT (id) DO NOTHING;
  `, 'Insert workspaces from organizations');

  // Step 3: Create workspace_members table
  await runSQL(`
    CREATE TABLE IF NOT EXISTS foco_workspace_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE (workspace_id, user_id)
    );
  `, 'Create foco_workspace_members table');

  // Step 4: Insert workspace members from organization_members
  await runSQL(`
    INSERT INTO foco_workspace_members (workspace_id, user_id, role, created_at, updated_at)
    SELECT organization_id as workspace_id, user_id, role, created_at, updated_at
    FROM organization_members
    WHERE EXISTS (SELECT 1 FROM foco_workspaces WHERE id = organization_id)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  `, 'Insert workspace members');

  // Step 5: Rename projects to foco_projects
  await runSQL(`
    ALTER TABLE IF EXISTS projects RENAME TO foco_projects;
  `, 'Rename projects to foco_projects');

  // Step 6: Add missing columns
  await runSQL(`
    ALTER TABLE foco_projects
      ADD COLUMN IF NOT EXISTS workspace_id uuid,
      ADD COLUMN IF NOT EXISTS slug text,
      ADD COLUMN IF NOT EXISTS archived_at timestamptz,
      ADD COLUMN IF NOT EXISTS brief text,
      ADD COLUMN IF NOT EXISTS icon text DEFAULT 'folder',
      ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS owner_id uuid;
  `, 'Add missing columns to foco_projects');

  // Step 7: Map organization_id to workspace_id
  await runSQL(`
    UPDATE foco_projects
    SET workspace_id = organization_id
    WHERE workspace_id IS NULL AND organization_id IS NOT NULL;
  `, 'Map organization_id to workspace_id');

  // Step 8: Infer workspace from created_by
  await runSQL(`
    UPDATE foco_projects p
    SET workspace_id = (
      SELECT workspace_id
      FROM foco_workspace_members
      WHERE user_id = p.created_by
      LIMIT 1
    )
    WHERE workspace_id IS NULL
      AND created_by IS NOT NULL
      AND EXISTS (SELECT 1 FROM foco_workspace_members WHERE user_id = p.created_by);
  `, 'Infer workspace from created_by');

  // Step 9: Generate slugs
  await runSQL(`
    UPDATE foco_projects
    SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
    WHERE slug IS NULL;
  `, 'Generate slugs from names');

  // Step 10: Set owner_id
  await runSQL(`
    UPDATE foco_projects
    SET owner_id = created_by
    WHERE owner_id IS NULL;
  `, 'Set owner_id from created_by');

  // Step 11: Map is_active to archived_at
  await runSQL(`
    UPDATE foco_projects
    SET archived_at = updated_at
    WHERE is_active = false AND archived_at IS NULL;
  `, 'Map is_active to archived_at');

  // Step 12: Make slug NOT NULL
  await runSQL(`
    ALTER TABLE foco_projects ALTER COLUMN slug SET NOT NULL;
  `, 'Make slug NOT NULL');

  // Step 13: Add indexes
  await runSQL(`
    CREATE UNIQUE INDEX IF NOT EXISTS foco_projects_workspace_slug_unique
      ON foco_projects (workspace_id, slug) WHERE workspace_id IS NOT NULL;
  `, 'Add workspace-slug unique index');

  await runSQL(`
    CREATE UNIQUE INDEX IF NOT EXISTS foco_projects_null_workspace_slug_unique
      ON foco_projects (slug) WHERE workspace_id IS NULL;
  `, 'Add slug unique index for NULL workspace');

  // Step 14: Add foreign keys
  await runSQL(`
    ALTER TABLE foco_projects
      DROP CONSTRAINT IF EXISTS foco_projects_workspace_id_fkey,
      ADD CONSTRAINT foco_projects_workspace_id_fkey
        FOREIGN KEY (workspace_id) REFERENCES foco_workspaces(id) ON DELETE CASCADE;
  `, 'Add workspace foreign key');

  await runSQL(`
    ALTER TABLE foco_projects
      DROP CONSTRAINT IF EXISTS foco_projects_owner_id_fkey,
      ADD CONSTRAINT foco_projects_owner_id_fkey
        FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  `, 'Add owner foreign key');

  // Step 15: Add more indexes
  await runSQL(`
    CREATE INDEX IF NOT EXISTS foco_projects_workspace_id_idx ON foco_projects (workspace_id);
  `, 'Add workspace_id index');

  await runSQL(`
    CREATE INDEX IF NOT EXISTS foco_projects_owner_id_idx ON foco_projects (owner_id);
  `, 'Add owner_id index');

  await runSQL(`
    CREATE INDEX IF NOT EXISTS foco_projects_status_idx ON foco_projects (status);
  `, 'Add status index');

  // Step 16: Rename project_members
  await runSQL(`
    ALTER TABLE IF EXISTS project_members RENAME TO foco_project_members;
  `, 'Rename project_members to foco_project_members');

  console.log('\n✅ Migration complete!\n');
}

runMigration().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
