#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Hennie@@12Hennie@@12@db.czijxfbkihrauyjwcgfn.supabase.co:5432/postgres';

async function applyMigration() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log(`\n✓ Connected to database`);

    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '020_add_date_validation_constraints.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`\n→ Applying migration: 020_add_date_validation_constraints.sql`);
    console.log(`  Reading from: ${migrationPath}`);

    await client.query(sql);

    console.log(`✓ Successfully applied migration!\n`);
  } catch (error) {
    console.error(`\n✗ Error applying migration:`);
    console.error(error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    throw error;
  } finally {
    await client.end();
  }
}

applyMigration().catch(error => {
  console.error('\n✗ Migration failed:', error.message);
  process.exit(1);
});
