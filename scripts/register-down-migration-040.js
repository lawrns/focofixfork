#!/usr/bin/env node
const { Client } = require('pg')

async function main() {
  const dsn = process.env.DATABASE_URL
  if (!dsn) throw new Error('DATABASE_URL is not set')
  const client = new Client({ connectionString: dsn, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const sql = `
    INSERT INTO down_migrations(migration_name, sql)
    VALUES (
      '040_create_migration_audit_tables.sql',
      $$
      BEGIN;
      DROP TABLE IF EXISTS migration_audit;
      DROP TABLE IF EXISTS schema_migrations;
      DROP TABLE IF EXISTS down_migrations;
      COMMIT;
      $$
    )
    ON CONFLICT (migration_name) DO NOTHING;
  `
  await client.query(sql)
  await client.end()
  console.log('Registered down migration for 040_create_migration_audit_tables.sql')
}

main().catch(err => { console.error(err.message); process.exit(1) })

