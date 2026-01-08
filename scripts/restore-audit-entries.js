#!/usr/bin/env node
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

async function main() {
  const dsn = process.env.DATABASE_URL
  if (!dsn) throw new Error('DATABASE_URL is not set')
  const client = new Client({ connectionString: dsn, ssl: { rejectUnauthorized: false } })
  await client.connect()

  const f040 = path.join(__dirname, '../database/migrations/040_create_migration_audit_tables.sql')
  const f999 = path.join(__dirname, '../database/migrations/999_comprehensive_database_fixes.sql')
  const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p, 'utf8')).digest('hex')
  const rowsJson = JSON.stringify([])

  await client.query('INSERT INTO schema_migrations(migration_name, applied_at, checksum) VALUES($1, NOW(), $2) ON CONFLICT (migration_name) DO NOTHING', [path.basename(f040), sha(f040)])
  await client.query('INSERT INTO schema_migrations(migration_name, applied_at, checksum) VALUES($1, NOW(), $2) ON CONFLICT (migration_name) DO NOTHING', [path.basename(f999), sha(f999)])

  await client.query('INSERT INTO migration_audit(migration_name, checksum, started_at, finished_at, status, rows_affected_json) VALUES($1, $2, NOW(), NOW(), $3, $4)', [path.basename(f040), sha(f040), 'restored', rowsJson])
  await client.query('INSERT INTO migration_audit(migration_name, checksum, started_at, finished_at, status, rows_affected_json) VALUES($1, $2, NOW(), NOW(), $3, $4)', [path.basename(f999), sha(f999), 'restored', rowsJson])

  await client.end()
  console.log('Restored schema_migrations and migration_audit entries for 040 and 999')
}

main().catch(err => { console.error(err.message); process.exit(1) })

