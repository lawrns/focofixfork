#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function now() {
  return new Date().toISOString();
}

function getConnectionString() {
  const dsn = process.env.DATABASE_URL;
  if (!dsn) {
    throw new Error('DATABASE_URL is not set');
  }
  return dsn;
}

async function ensureAuditTables(client) {
  const sql = `
    CREATE TABLE IF NOT EXISTS migration_audit (
      id BIGSERIAL PRIMARY KEY,
      migration_name TEXT NOT NULL,
      checksum TEXT,
      started_at TIMESTAMPTZ NOT NULL,
      finished_at TIMESTAMPTZ,
      status TEXT NOT NULL,
      error_message TEXT,
      rows_affected_json JSONB DEFAULT '[]'::jsonb
    );
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      migration_name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL,
      checksum TEXT
    );
  `;
  await client.query(sql);
}

function calcChecksum(content) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function applyMigration(client, migrationFile) {
  const migrationPath = path.join(__dirname, '..', 'database', 'migrations', migrationFile);
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const checksum = calcChecksum(sql);
  const start = now();
  console.log(`\n→ Applying migration: ${migrationFile}`);
  console.log(`  Started at: ${start}`);
  console.log(`  Reading from: ${migrationPath}`);
  const existing = await client.query('SELECT 1 FROM schema_migrations WHERE migration_name = $1 LIMIT 1', [migrationFile]);
  if (existing.rows.length) {
    console.log(`  Skipped: already recorded in schema_migrations`);
    return;
  }
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations(migration_name, applied_at, checksum) VALUES($1, NOW(), $2) ON CONFLICT (migration_name) DO NOTHING',
      [migrationFile, checksum]
    );
    await client.query(
      'INSERT INTO migration_audit(migration_name, checksum, started_at, finished_at, status, rows_affected_json) VALUES($1, $2, $3, NOW(), $4, $5)',
      [migrationFile, checksum, start, 'success', JSON.stringify([])]
    );
    await client.query('COMMIT');
    console.log(`✓ Successfully applied migration: ${migrationFile}`);
  } catch (error) {
    await client.query('ROLLBACK');
    await client.query(
      'INSERT INTO migration_audit(migration_name, checksum, started_at, finished_at, status, error_message, rows_affected_json) VALUES($1, $2, $3, NOW(), $4, $5, $6)',
      [migrationFile, checksum, start, 'failed', error.message, JSON.stringify([])]
    );
    console.error(`\n✗ Error applying migration ${migrationFile}:`);
    console.error(error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    throw error;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Database Migration Script');
  console.log('═══════════════════════════════════════════════════');

  const client = new Client({ connectionString: getConnectionString(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log(`\n✓ Connected to database at ${now()}`);
  try {
    await ensureAuditTables(client);
    const revertTarget = process.env.REVERT;
    if (revertTarget) {
      await client.query('BEGIN');
      const res = await client.query('SELECT sql FROM down_migrations WHERE migration_name = $1', [revertTarget]);
      if (!res.rows.length) throw new Error(`No down migration found for ${revertTarget}`);
      await client.query(res.rows[0].sql);
      await client.query('COMMIT');
      console.log(`✓ Reverted migration: ${revertTarget}`);
      return;
    }
    await client.query('SELECT pg_advisory_lock(914215)');
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    const override = process.env.MIGRATIONS;
    const files = override
      ? override.split(',').map(s => s.trim()).filter(Boolean)
      : fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const migration of files) {
      await applyMigration(client, migration);
    }
    console.log('═══════════════════════════════════════════════════');
    console.log('  ✓ All migrations applied successfully!');
    console.log('═══════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock(914215)');
    } catch {}
    await client.end();
  }
}

main();
