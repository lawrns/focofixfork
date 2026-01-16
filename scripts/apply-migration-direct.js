const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

// Use DATABASE_URL from .env
const connectionString = process.env.DATABASE_URL;

async function applyMigration() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Read the migration file
    const migrationSQL = fs.readFileSync(
      '/Users/lukatenbosch/focofixfork/supabase/migrations/20260115_create_workspaces_and_fix_projects.sql',
      'utf8'
    );

    console.log('Executing migration SQL...');
    console.log(`(${migrationSQL.length} characters)\n`);

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!\n');

    // Verify the changes
    console.log('Verifying changes...\n');

    // Check foco_workspaces
    const { rows: workspaces } = await client.query('SELECT COUNT(*) FROM foco_workspaces');
    console.log(`✅ foco_workspaces table: ${workspaces[0].count} rows`);

    // Check foco_projects
    const { rows: projects } = await client.query('SELECT COUNT(*) FROM foco_projects WHERE archived_at IS NULL');
    console.log(`✅ foco_projects table: ${projects[0].count} active projects`);

    // Check foco_workspace_members
    const { rows: members } = await client.query('SELECT COUNT(*) FROM foco_workspace_members');
    console.log(`✅ foco_workspace_members table: ${members[0].count} members`);

    // Check specific user's projects
    const userId = '60c44927-9d61-40e2-8c41-7e44cf7f7981';
    const { rows: userProjects } = await client.query(`
      SELECT p.name, p.workspace_id
      FROM foco_projects p
      INNER JOIN foco_workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE wm.user_id = $1 AND p.archived_at IS NULL
    `, [userId]);

    console.log(`\\n✅ User can now see ${userProjects.length} projects:`);
    userProjects.forEach(p => {
      console.log(`   - ${p.name}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
