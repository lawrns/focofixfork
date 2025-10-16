#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Hennie@@12Hennie@@12@db.czijxfbkihrauyjwcgfn.supabase.co:5432/postgres';

async function applyMigration(migrationFile) {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log(`\n✓ Connected to database`);

    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`\n→ Applying migration: ${migrationFile}`);
    console.log(`  Reading from: ${migrationPath}`);

    await client.query(sql);

    console.log(`✓ Successfully applied migration: ${migrationFile}\n`);
  } catch (error) {
    console.error(`\n✗ Error applying migration ${migrationFile}:`);
    console.error(error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const migrations = [
    '019_fix_organization_members_rls.sql',
    '020_add_date_validation_constraints.sql'
  ];

  console.log('═══════════════════════════════════════════════════');
  console.log('  Database Migration Script');
  console.log('═══════════════════════════════════════════════════');

  for (const migration of migrations) {
    await applyMigration(migration);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('  ✓ All migrations applied successfully!');
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(error => {
  console.error('\n✗ Migration failed:', error.message);
  process.exit(1);
});
