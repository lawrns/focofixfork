## Connection & Secrets
- Use `DATABASE_URL` env pointing to sanitized DSN: `postgresql://postgres:Hennie%40%4012Hennie%40%4012@db.czijxfbkihrauyjwcgfn.supabase.co:5432/postgres`.
- Redact credentials in logs; centralize via `src/env.ts` validation and `src/lib/logger.ts` structured logging.
- Prefer `pg` `Client`/`Pool` with SSL required; reuse existing adapters in `src/lib/database/adapters.ts`.

## Permission & Accessibility Verification
- Connectivity checks: `SELECT version();`, `SELECT current_user;`, `SELECT current_database();`.
- Role introspection: `SELECT rolname, rolcreatedb, rolcreaterole, rolsuper FROM pg_roles WHERE rolname = current_user;`.
- Database privileges: `SELECT has_database_privilege(current_user, current_database(), 'CONNECT');`, `SELECT has_database_privilege(current_user, current_database(), 'CREATE');`.
- Schema/table privileges: `SELECT has_schema_privilege(current_user, 'public', 'USAGE');`, `SELECT has_table_privilege(current_user, 'public.some_table', 'SELECT,INSERT,UPDATE,DELETE');`.
- RLS verification: `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'some_table';`.

## Migration Strategy
- Source migrations from `database/migrations/**` using existing node scripts (`scripts/apply-migrations.js`, `scripts/run-database-migration.js`).
- Apply in deterministic order, record checksum and timestamp; guard with advisory lock: `SELECT pg_advisory_lock(914215);`.
- Wrap each file in a transaction; stop on first error and rollback.
- Pre-check: dry-run parsing and dependency validation; post-check: schema diff via `information_schema`.

## Transaction Management
- Global transaction per migration file with `BEGIN`/`COMMIT` and `ROLLBACK` on error.
- Use `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` for schema changes if contention is expected.
- Use `SAVEPOINT` for reversible sub-steps and partial rollbacks.

## Audit Logging
- Create `migration_audit(id, migration_name, checksum, started_at, finished_at, status, error_message, rows_affected_json)`.
- Log per statement counts using `GET DIAGNOSTICS rowcount = ROW_COUNT;` captured into JSON for audit.
- Append operation logs to application logger with correlation IDs; redact secrets.

## Rollback Strategy
- Maintain `schema_migrations(id, migration_name, applied_at, checksum)` and `down_migrations(migration_name, sql)`.
- Store compensating SQL for critical changes; enable `--revert` mode to apply `down_migrations` for a given version or range.
- Take snapshot: dump affected DDL before changes using `pg_dump --schema-only --table <list>` for emergency restore.

## Execution Workflow (Todo List)
- Prepare secure connection using `DATABASE_URL` and SSL.
- Verify connectivity and current role capabilities.
- Enumerate migrations and compute checksums.
- Acquire advisory lock and start migration session.
- Apply migrations sequentially with transaction and savepoints.
- Record audit entries and per-statement row counts.
- Release lock and update `schema_migrations`.
- Run post-migration validation and RLS checks.
- Prepare rollback artifacts and verify reversibility.
- Final verification and sign-off.

## Validation & Final Verification
- Schema diff: compare `information_schema.tables` and `columns` before/after.
- Integrity checks: `SELECT count(*)` on core tables, constraint validation (`NOT NULL`, FK cascades). 
- RLS tests: attempt operations with different roles to confirm policy behavior.
- Performance sanity: `EXPLAIN ANALYZE` on critical queries; ensure no regressions.

## Operational Records
- Persist operation timeline: start/end timestamps, status per migration, row counts.
- Store correlation IDs across logs and audit tables for traceability.
- Produce a final report: applied versions, affected objects, and verification results.

## Risks & Safeguards
- Credential safety: always encoded DSN or separate env vars; never print plaintext DSN.
- Concurrency: advisory locks and serializable transactions prevent overlapping runs.
- Reversibility: down migrations and schema snapshots enable rollback.
- Idempotency: migrations designed to be safe on re-run (use `IF EXISTS/IF NOT EXISTS`).

## Acceptance Criteria
- Secure connection established with robust error handling and SSL.
- Permissions verified and recorded; migrations applied atomically with audit logs.
- Transactions protect data integrity; rollback procedures validated.
- Final verification confirms schema correctness and operational readiness.