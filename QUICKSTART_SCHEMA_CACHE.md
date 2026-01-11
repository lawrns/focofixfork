# PostgREST Schema Cache - Quick Start Guide

## What Was Fixed

PostgREST "Could not find column" errors caused by stale schema cache.

## The Solution in 30 Seconds

An automatic mechanism now reloads PostgREST's schema cache whenever you modify the database schema. No manual steps needed.

---

## Normal Development Workflow

### ✓ What You Do
```bash
# Create a migration
supabase migration new add_new_feature

# Edit the migration file with SQL changes
# Example: ALTER TABLE projects ADD COLUMN new_field TEXT;

# Apply it
supabase db push
```

### ✓ What Happens Automatically
1. Migration runs
2. PostgreSQL event trigger fires
3. PostgREST gets notified
4. Schema cache reloads
5. API calls work immediately

**No manual restart needed!**

---

## If Schema Cache Gets Stale (Rare)

### Quick Fix
```bash
# Option 1: Reload cache immediately
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "NOTIFY pgrst, 'reload schema';"

# Option 2: Restart services
supabase stop && supabase start
```

### Verify It's Working
```bash
# Check event trigger status
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SELECT evtname FROM pg_event_trigger WHERE evtname = 'notify_pgrst_on_schema_change';"
```

Expected output: `notify_pgrst_on_schema_change`

---

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260111000001_auto_schema_cache_reload.sql` | Migration that installed the auto-reload mechanism |
| `SCHEMA_CACHE_FIX_REPORT.md` | Complete technical details |
| `POSTGREST_SCHEMA_CACHE_FIX.md` | How the fix works |

---

## For New Team Members

The system automatically handles schema cache reloading. Just use Supabase normally:

```bash
supabase migration new my_change
# edit migration file
supabase db push
# Done! Cache reloads automatically
```

---

## Technical Details

**What happens on schema changes:**

1. You run `supabase db push` with a migration
2. Migration executes in PostgreSQL
3. PostgreSQL event trigger `notify_pgrst_on_schema_change` fires
4. Trigger calls function `notify_pgrst_schema_change()`
5. Function sends: `NOTIFY pgrst, 'reload schema'`
6. PostgREST receives notification and reloads cache
7. API calls use fresh schema info

**Monitored operations:**
- CREATE/ALTER/DROP TABLE
- CREATE/ALTER/DROP INDEX
- CREATE/ALTER/DROP VIEW
- CREATE/ALTER/DROP POLICY
- CREATE/ALTER/DROP FUNCTION
- And more...

---

## Troubleshooting

**Problem:** API still shows "column not found" error

**Solution:**
```bash
# 1. Verify the column exists
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "\d table_name"

# 2. Manually reload cache
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "NOTIFY pgrst, 'reload schema';"

# 3. Verify event trigger is enabled
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SELECT evtenabled FROM pg_event_trigger WHERE evtname = 'notify_pgrst_on_schema_change';"
```

**Expected output for trigger:** `O` (means enabled)

---

## That's It!

The system is fully automated. Just use Supabase normally and schema cache issues are handled automatically.

Questions? See `SCHEMA_CACHE_FIX_REPORT.md` for full details.
