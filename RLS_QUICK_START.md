# RLS Security Hardening - Quick Start Guide

⏱️ **5-Minute Deployment** | 🔒 **Critical Security Fix** | ✅ **Zero Downtime**

---

## 🚨 What This Fixes

**CRITICAL:** Row Level Security is currently DISABLED on 5 tables. Any authenticated user can access ALL data across ALL workspaces.

**Impact:** GDPR violation, unauthorized data access, cross-workspace leakage.

---

## ⚡ Quick Deploy (3 Steps)

### Step 1: Backup Database
```bash
# Supabase Dashboard: Database > Backups > Create Backup
```
**⏱️ 2 minutes**

### Step 2: Deploy
```bash
export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres'
chmod +x scripts/apply-rls-hardening.sh
./scripts/apply-rls-hardening.sh
```
**⏱️ 2 minutes**

### Step 3: Verify
```bash
# Login to your app and verify:
# - Workspace page loads
# - Projects are visible
# - Can create/edit work items
```
**⏱️ 1 minute**

---

## ✅ Success Indicators

**Look for these messages:**
```
✅ RLS enabled on all 5 critical tables
✅ Migration completed successfully
✅ Query performance: XXXms (within 200ms target)
```

**In database:**
```sql
SELECT * FROM verify_rls_configuration();
-- All tables should show: ✅ SECURE
```

---

## 🆘 If Something Goes Wrong

### Emergency Rollback
```bash
psql "$SUPABASE_DB_URL" -f scripts/rollback-rls-hardening.sql
```

⚠️ **This reintroduces the security vulnerability!** Use only as temporary measure.

### Check Logs
```bash
cat /tmp/rls_migration_output.log
cat /tmp/rls_verification.log
```

### Common Issues

**Issue:** Users can't see any data
- **Fix:** Verify user has workspace membership
- **Query:** `SELECT * FROM workspace_members WHERE user_id = 'USER_ID';`

**Issue:** 401/403 errors
- **Fix:** Check application logs for specific endpoint
- **Likely:** Old code using `organizations` instead of `workspaces`

**Issue:** Slow queries
- **Fix:** Run `ANALYZE work_items; ANALYZE workspace_members;`

---

## 📚 Full Documentation

For complete details, see:
- **Implementation Guide:** `/docs/RLS_SECURITY_IMPLEMENTATION.md`
- **Summary:** `/RLS_SECURITY_HARDENING_SUMMARY.md`

---

## 🔍 What Gets Changed

| Table | Change | Impact |
|-------|--------|--------|
| `workspaces` | RLS enabled | Users see only their workspaces |
| `foco_projects` | RLS enabled + admin-only INSERT | Users see only workspace projects |
| `labels` | RLS enabled | Users see only workspace labels |
| `work_items` | RLS enabled + workspace validation | Users see only workspace work items |
| `inbox_items` | RLS enabled + user-only access | Users see only their notifications |

---

## ⚡ Performance Impact

- **Before:** ~50ms queries (NO SECURITY)
- **After:** ~80-120ms queries (FULL SECURITY)
- **Target:** <200ms ✅

**3 new indexes added** to optimize RLS policy checks.

---

## 🛡️ Security Improvement

| Before | After |
|--------|-------|
| 🔴 Any user can access ALL workspaces | ✅ Users only see their workspaces |
| 🔴 Cross-workspace data injection possible | ✅ INSERT policies validate workspace |
| 🔴 No role-based access control | ✅ Admin/owner checks enforced |
| 🔴 No audit trail | ✅ All access logged in `rls_audit_log` |

---

## 📝 Files Created

1. **Migration:** `/database/migrations/113_enable_rls_security_hardening.sql`
2. **Deploy Script:** `/scripts/apply-rls-hardening.sh`
3. **Rollback Script:** `/scripts/rollback-rls-hardening.sql`
4. **Tests:** `/tests/security/rls-policy-verification.test.ts`
5. **Docs:** `/docs/RLS_SECURITY_IMPLEMENTATION.md`

---

## 🎯 Ready to Deploy?

**Checklist:**
- [ ] Database backup created
- [ ] `SUPABASE_DB_URL` environment variable set
- [ ] Team notified of deployment
- [ ] Low-traffic time window selected (optional but recommended)

**Deploy command:**
```bash
./scripts/apply-rls-hardening.sh
```

---

**Questions?** See `/docs/RLS_SECURITY_IMPLEMENTATION.md` for troubleshooting.

**Emergency?** Run `/scripts/rollback-rls-hardening.sql` (temporary only).

---

✅ **This is a critical security fix. Deploy as soon as possible.**
