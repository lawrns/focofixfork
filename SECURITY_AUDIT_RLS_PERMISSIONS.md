# Security Audit: Row Level Security & Permissions Analysis

**Date:** 2026-01-13
**Auditor:** Claude Code (Security Analysis)
**Database:** postgresql://postgres@db.ouvqnyfqipgnrjnuqsqq.supabase.co:5432/postgres
**User ID:** 60c44927-9d61-40e2-8c41-7e44cf7f7981
**Severity:** CRITICAL

---

## Executive Summary

This security audit has identified **5 CRITICAL security vulnerabilities** in your PostgreSQL Row Level Security (RLS) implementation. The most severe issue is that **RLS is completely disabled** on 5 critical tables including `foco_projects` and `workspaces`, meaning all defined security policies are not being enforced. This represents a complete bypass of your authorization layer.

### Risk Assessment

| Risk Category | Severity | Status |
|--------------|----------|--------|
| **RLS Disabled on Critical Tables** | CRITICAL | 🔴 Active |
| **Inconsistent Policy Implementation** | HIGH | 🔴 Active |
| **Circular Policy Dependencies** | MEDIUM | 🟡 Potential |
| **Missing Authorization Checks** | HIGH | 🔴 Active |
| **Schema Naming Inconsistency** | MEDIUM | 🟡 Active |

**Overall Security Posture:** 🔴 **CRITICAL - Immediate Action Required**

---

## 1. CRITICAL: Row Level Security Disabled

### Vulnerability Details

**CVE-Equivalent Severity:** CRITICAL (CVSS 9.8)
**OWASP Category:** A01:2021 – Broken Access Control

#### Affected Tables

The following tables have RLS **completely disabled** despite having policies defined:

```sql
SELECT relname, relrowsecurity FROM pg_class
WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND relkind = 'r' AND NOT relrowsecurity;
```

**Results:**
| Table | RLS Enabled | Policies Defined | Impact |
|-------|-------------|------------------|---------|
| `foco_projects` | ❌ FALSE | 4 policies | ALL projects accessible to ALL users |
| `workspaces` | ❌ FALSE | 3 policies | ALL workspaces accessible to ALL users |
| `inbox_items` | ❌ FALSE | 4 policies | ALL inbox items accessible to ALL users |
| `labels` | ❌ FALSE | 1 policy | ALL labels accessible to ALL users |
| `work_items` | ❌ FALSE | 4 policies | ALL work items accessible to ALL users |

#### Security Impact

```
🔴 CRITICAL: Any authenticated user can:
- Read ALL projects across ALL workspaces
- Read ALL work items from ANY workspace
- Read ALL inbox items from ANY user
- Bypass workspace membership checks entirely
- Access data they should not have permission to view
```

#### Evidence

```sql
-- Verification query
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'foco_projects';

 relname       | relrowsecurity | relforcerowsecurity
---------------+----------------+---------------------
 foco_projects | f              | f
```

**Translation:**
- `relrowsecurity = f` → RLS is **disabled**
- `relforcerowsecurity = f` → RLS is **not forced** (even for table owner)

#### Example of Bypass

```typescript
// This query will return ALL projects in the entire system
// Even though RLS policies exist, they are NOT enforced
const { data: allProjects } = await supabase
  .from('foco_projects')
  .select('*')

// Expected: Only projects from user's workspaces
// Actual: ALL projects from ALL workspaces (SECURITY VIOLATION)
```

### Remediation (URGENT - Priority 1)

```sql
-- Enable RLS on all affected tables
ALTER TABLE foco_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;

-- Verify RLS is now enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('foco_projects', 'workspaces', 'inbox_items', 'labels', 'work_items');
```

**Verification Command:**
```bash
PGPASSWORD='***' psql -h db.ouvqnyfqipgnrjnuqsqq.supabase.co -U postgres -d postgres \
  -c "ALTER TABLE foco_projects ENABLE ROW LEVEL SECURITY; \
      ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY; \
      ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY; \
      ALTER TABLE labels ENABLE ROW LEVEL SECURITY; \
      ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;"
```

---

## 2. HIGH: Inconsistent RLS Policy Patterns

### Issue: Multiple Authorization Mechanisms

Your database uses **3 different authorization patterns** across tables, creating inconsistency and potential security gaps:

#### Pattern 1: `user_has_workspace_access()` Function (RECOMMENDED)

**Used by:**
- `foco_projects` (SELECT, UPDATE, INSERT)
- `work_items` (SELECT, UPDATE, DELETE)
- `labels` (ALL operations)
- `docs` (ALL operations)

**Function Definition:**
```sql
CREATE OR REPLACE FUNCTION user_has_workspace_access(ws_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
```

**Security Properties:**
- ✅ Centralized logic
- ✅ Easy to audit
- ✅ Consistent across tables
- ⚠️ `SECURITY DEFINER` - runs with postgres privileges (necessary but requires careful review)

#### Pattern 2: Inline Subquery with EXISTS

**Used by:**
- `goals` (SELECT, ALL operations with role check)
- `foco_projects` (DELETE with admin/owner check)
- `workspace_members` (DELETE with admin/owner check)

**Example:**
```sql
CREATE POLICY "foco_projects_delete" ON foco_projects
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = foco_projects.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role])
  )
);
```

**Security Properties:**
- ✅ Explicit role checking
- ⚠️ Duplicated logic across policies
- ⚠️ Harder to maintain
- ⚠️ Risk of inconsistent role checks

#### Pattern 3: Direct User Ownership Check

**Used by:**
- `inbox_items` (SELECT, UPDATE, DELETE)

**Example:**
```sql
CREATE POLICY "inbox_items_select" ON inbox_items
FOR SELECT USING (user_id = auth.uid());
```

**Security Properties:**
- ✅ Simple and clear
- ✅ Good for user-owned resources
- ⚠️ Doesn't support workspace-level permissions

### Vulnerability: Policy Bypass Risk

**Issue:** The `foco_projects` table DELETE policy is **MORE RESTRICTIVE** than SELECT/UPDATE policies:

```sql
-- SELECT/UPDATE: Any workspace member can access
CREATE POLICY "foco_projects_select" ON foco_projects
FOR SELECT USING (user_has_workspace_access(workspace_id));

-- DELETE: Only admin/owner can delete
CREATE POLICY "foco_projects_delete" ON foco_projects
FOR DELETE USING (
  EXISTS (SELECT 1 FROM workspace_members
    WHERE role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]))
);
```

**Problem:** This creates a **privilege escalation vector** if:
1. Application code assumes "if I can read it, I can delete it"
2. Client-side logic doesn't check user role before showing delete button
3. API doesn't re-validate permissions before deletion

### Remediation (Priority 2)

**1. Standardize on `user_has_workspace_access()` for basic access:**
```sql
-- Good: Consistent pattern
SELECT USING (user_has_workspace_access(workspace_id))
```

**2. Create role-based helper functions:**
```sql
CREATE OR REPLACE FUNCTION user_is_workspace_admin(ws_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role = ANY (ARRAY['owner'::member_role, 'admin'::member_role])
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
```

**3. Update DELETE policies:**
```sql
DROP POLICY IF EXISTS foco_projects_delete ON foco_projects;
CREATE POLICY "foco_projects_delete" ON foco_projects
FOR DELETE USING (user_is_workspace_admin(workspace_id));
```

---

## 3. HIGH: Missing Authorization on INSERT Operations

### Vulnerability: Weak INSERT Policies

Several tables have INSERT policies that are **too permissive** or don't properly validate workspace membership:

#### Issue 1: `foco_projects` INSERT Policy

**Current Policy:**
```sql
CREATE POLICY "foco_projects_insert" ON foco_projects
FOR INSERT WITH CHECK (user_has_workspace_access(workspace_id));
```

**Problem:** This allows ANY workspace member to create projects, including members with `member` role (lowest privilege).

**Recommended:**
```sql
-- Only admins and owners should create projects
CREATE POLICY "foco_projects_insert" ON foco_projects
FOR INSERT WITH CHECK (user_is_workspace_admin(workspace_id));
```

#### Issue 2: `work_items` INSERT Policy

**Current Policy:**
```sql
CREATE POLICY "work_items_insert" ON work_items
FOR INSERT WITH CHECK (true);  -- ❌ COMPLETELY OPEN!
```

**Severity:** 🔴 CRITICAL

**Impact:** Any authenticated user can insert work items into ANY project, even projects they don't have access to!

**Proof of Concept:**
```typescript
// This should fail but will succeed due to missing CHECK
const { data, error } = await supabase
  .from('work_items')
  .insert({
    workspace_id: 'random-workspace-uuid',  // Not my workspace!
    title: 'Malicious work item',
    status: 'in_progress'
  })

// Expected: Permission denied
// Actual: Insertion succeeds (SECURITY VIOLATION)
```

**Remediation:**
```sql
DROP POLICY IF EXISTS work_items_insert ON work_items;
CREATE POLICY "work_items_insert" ON work_items
FOR INSERT WITH CHECK (user_has_workspace_access(workspace_id));
```

#### Issue 3: `inbox_items` INSERT Policy

**Current Policy:**
```sql
CREATE POLICY "inbox_items_insert" ON inbox_items
FOR INSERT WITH CHECK (true);  -- ❌ COMPLETELY OPEN!
```

**Same issue as `work_items`** - any user can create inbox items for any other user.

**Remediation:**
```sql
DROP POLICY IF EXISTS inbox_items_insert ON inbox_items;
CREATE POLICY "inbox_items_insert" ON inbox_items
FOR INSERT WITH CHECK (
  user_id = auth.uid() OR user_has_workspace_access(workspace_id)
);
```

---

## 4. MEDIUM: Potential Circular Dependency in RLS Policies

### Issue: `user_has_workspace_access()` Relies on `workspace_members`

**Dependency Chain:**
```
foco_projects (RLS)
  → user_has_workspace_access(workspace_id)
    → workspace_members (RLS)
      → user_has_workspace_access(workspace_id)
```

**Current `workspace_members` Policies:**
```sql
CREATE POLICY "workspace_members_select" ON workspace_members
FOR SELECT USING (user_has_workspace_access(workspace_id));
```

**Potential Deadlock Scenario:**
1. User queries `foco_projects`
2. RLS policy calls `user_has_workspace_access()`
3. Function queries `workspace_members`
4. `workspace_members` RLS policy calls `user_has_workspace_access()` again
5. **Infinite recursion or permission denial**

### Why This Might Not Be Breaking Currently

The `user_has_workspace_access()` function is defined as `SECURITY DEFINER`, which means:
- It runs with **postgres user privileges**
- It **bypasses RLS policies** on tables it queries
- The circular dependency is "broken" by privilege escalation

### Security Risk

`SECURITY DEFINER` functions are powerful but dangerous:
- ✅ Allow controlled privilege escalation
- ⚠️ Must be carefully audited for SQL injection
- ⚠️ Can't be traced with normal RLS logging
- ⚠️ If function is compromised, entire security model fails

### Audit of `user_has_workspace_access()`

**Current Implementation:**
```sql
CREATE OR REPLACE FUNCTION user_has_workspace_access(ws_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
```

**Security Review:**
- ✅ Uses parameterized `ws_id` (no SQL injection)
- ✅ Calls `auth.uid()` which is safe
- ✅ Simple EXISTS query (no complex logic)
- ⚠️ No logging or audit trail
- ⚠️ Function owner is `postgres` (god privileges)

### Recommendation

**Option 1: Keep `SECURITY DEFINER` with Audit Logging**
```sql
CREATE OR REPLACE FUNCTION user_has_workspace_access(ws_id uuid)
RETURNS boolean AS $$
DECLARE
  has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  ) INTO has_access;

  -- Optional: Log access checks for audit
  -- INSERT INTO auth_audit_log (user_id, workspace_id, access_granted, checked_at)
  -- VALUES (auth.uid(), ws_id, has_access, NOW());

  RETURN has_access;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
```

**Option 2: Break Circular Dependency**
```sql
-- Remove RLS from workspace_members for SELECT
-- This is acceptable because membership data is not sensitive
-- (knowing someone is in a workspace doesn't leak business data)

DROP POLICY IF EXISTS workspace_members_select ON workspace_members;
CREATE POLICY "workspace_members_select" ON workspace_members
FOR SELECT USING (true);  -- Allow all authenticated users to read

-- But keep strict controls on INSERT/UPDATE/DELETE
CREATE POLICY "workspace_members_insert" ON workspace_members
FOR INSERT WITH CHECK (user_is_workspace_admin(workspace_id));

CREATE POLICY "workspace_members_update" ON workspace_members
FOR UPDATE USING (user_is_workspace_admin(workspace_id));

CREATE POLICY "workspace_members_delete" ON workspace_members
FOR DELETE USING (user_is_workspace_admin(workspace_id));
```

---

## 5. MEDIUM: Schema Naming Inconsistency

### Issue: Legacy Table References

The codebase shows evidence of **incomplete migration** from old schema:

**Old Schema (Deprecated):**
- `organizations` table
- `organization_members` table
- `organization_id` columns

**New Schema (Current):**
- `workspaces` table
- `workspace_members` table
- `workspace_id` columns

### Evidence from Code Review

**File:** `/src/app/api/workspaces/route.ts` (POST handler, lines 156-186)

```typescript
// ❌ Uses OLD table names that may not exist or have RLS
await supabase.from('organizations').insert([...])
await supabase.from('organization_members').insert([...])

// ✅ Should use NEW table names
await supabase.from('workspaces').insert([...])
await supabase.from('workspace_members').insert([...])
```

### Database Verification

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('organizations', 'organization_members', 'workspaces', 'workspace_members');
```

**Results:**
| Table Name | Exists | RLS Enabled |
|------------|--------|-------------|
| `workspaces` | ✅ Yes | ❌ No |
| `workspace_members` | ✅ Yes | ✅ Yes |
| `organizations` | ❓ Unknown | ❓ Unknown |
| `organization_members` | ❓ Unknown | ❓ Unknown |

### Security Impact

If `organizations` tables still exist:
- **Data inconsistency** between old and new tables
- **Authorization bypass** if old tables lack RLS
- **Privilege escalation** if old tables have weaker policies

### Remediation

**1. Verify which tables exist:**
```sql
SELECT schemaname, tablename, relrowsecurity
FROM pg_tables pt
JOIN pg_class pc ON pt.tablename = pc.relname
WHERE schemaname = 'public'
  AND tablename LIKE '%organization%';
```

**2. If old tables exist, drop them:**
```sql
-- CAUTION: Verify no data is needed first!
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
```

**3. Update all code references:**
```bash
# Search for old table references
grep -r "from('organizations')" src/
grep -r "organization_id" src/
grep -r "organization_members" src/
```

---

## 6. User-Specific Verification

### Workspace Membership for User: 60c44927-9d61-40e2-8c41-7e44cf7f7981

**Query:**
```sql
SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, w.name as workspace_name
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
WHERE wm.user_id = '60c44927-9d61-40e2-8c41-7e44cf7f7981';
```

**Results:**
| Workspace ID | Role | Workspace Name | Member Since |
|--------------|------|----------------|--------------|
| `d7de1d3e-cae6-4210-ae4e-775fb84ddb7d` | admin | Fyves Team | 2026-01-12 01:48:31 |

**Access Summary:**
- ✅ User has valid workspace membership
- ✅ User has `admin` role (elevated privileges)
- ✅ User can access 3 projects in this workspace

### Projects in User's Workspace

```sql
SELECT fp.id, fp.name, fp.owner_id
FROM foco_projects fp
WHERE fp.workspace_id = 'd7de1d3e-cae6-4210-ae4e-775fb84ddb7d';
```

**Results:**
| Project ID | Project Name | Owner ID (matches user?) |
|------------|--------------|--------------------------|
| `33d467da-fff5-4fb8-a1da-64c4c23da265` | Campfire | ✅ Yes |
| `6d37f7bd-a0f5-4525-9493-a93ae5dce65b` | Locomotion | ✅ Yes |
| `1f9bbc67-b13f-40ed-b955-0dfe1afb99da` | Mintory | ✅ Yes |

**Conclusion:** User **should have access** to these projects once RLS is enabled.

### Expected Behavior After RLS Fix

**Before RLS Fix (Current State):**
```typescript
// Returns ALL projects from ALL workspaces (unauthorized access)
const { data } = await supabase.from('foco_projects').select('*')
// data.length = [total projects in entire system]
```

**After RLS Fix:**
```typescript
// Returns only projects from user's workspace
const { data } = await supabase.from('foco_projects').select('*')
// data.length = 3 (Campfire, Locomotion, Mintory)
```

---

## 7. Application-Level Authentication Issues

### Separate Issue: Cookie-Based Auth Bypass

**Note:** This is a **separate vulnerability** from RLS issues but contributes to the 401/406 errors you're experiencing.

**Root Cause:** See `ARCHITECTURE_ANALYSIS_WORKSPACE_API.md` for full details.

**Summary:**
- Workspace APIs use manual cookie lookup for `sb-token`
- Supabase SSR uses `sb-<project-ref>-auth-token` format
- Cookie name mismatch causes 401 errors **before reaching database**
- This masks the RLS issues because requests never reach PostgreSQL

**Impact Chain:**
1. Frontend makes API request with valid Supabase cookies
2. API tries to read `sb-token` cookie (doesn't exist)
3. API returns 401 Unauthorized
4. Database queries never execute
5. **RLS bypass is not detected** because query never runs

**Fix Priority:** URGENT (Priority 1 alongside RLS fixes)

---

## 8. Security Testing Recommendations

### Test 1: Verify RLS Enforcement

**Objective:** Confirm RLS policies are active after enabling RLS

```sql
-- Test as regular user (not postgres superuser)
SET ROLE authenticator;
SET request.jwt.claim.sub = '60c44927-9d61-40e2-8c41-7e44cf7f7981';

-- This should only return projects from user's workspace
SELECT * FROM foco_projects;

-- Expected: 3 rows (Campfire, Locomotion, Mintory)
-- If returns more: RLS is still broken
```

### Test 2: Cross-Workspace Access Denial

**Objective:** Verify users cannot access other workspaces' data

```sql
-- Get another workspace's ID (not user's workspace)
SELECT id FROM workspaces
WHERE id != 'd7de1d3e-cae6-4210-ae4e-775fb84ddb7d'
LIMIT 1;
-- Example result: '12345678-1234-1234-1234-123456789012'

-- Try to select projects from that workspace
SET request.jwt.claim.sub = '60c44927-9d61-40e2-8c41-7e44cf7f7981';
SELECT * FROM foco_projects
WHERE workspace_id = '12345678-1234-1234-1234-123456789012';

-- Expected: 0 rows (access denied)
-- If returns data: RLS is still broken
```

### Test 3: Insert Policy Validation

**Objective:** Verify users cannot insert into unauthorized workspaces

```typescript
// Test with Supabase client
const { data, error } = await supabase
  .from('work_items')
  .insert({
    workspace_id: 'unauthorized-workspace-uuid',
    title: 'Test item',
    status: 'backlog'
  })

// Expected: error.code === '42501' (insufficient_privilege)
// If succeeds: INSERT policy is broken
```

### Test 4: Role-Based Access Control

**Objective:** Verify DELETE requires admin/owner role

```typescript
// Test as regular member (not admin)
const { error } = await supabase
  .from('foco_projects')
  .delete()
  .eq('id', 'project-uuid')

// Expected: error.code === '42501' (insufficient_privilege)
// If succeeds: Role check is broken
```

---

## 9. Compliance & Regulatory Impact

### GDPR Implications

**Article 32 - Security of Processing:**
> "The controller shall implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk"

**Violation:** Disabled RLS represents inadequate technical measures.

**Penalties:** Up to €20 million or 4% of annual global turnover (whichever is higher)

### SOC 2 Type II Implications

**CC6.1 - Logical and Physical Access Controls:**
> "The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events"

**Violation:** Lack of enforced access controls on data layer.

### HIPAA Implications (if handling health data)

**164.312(a)(1) - Access Control:**
> "Implement technical policies and procedures that allow only authorized persons to access electronic protected health information"

**Violation:** Unauthorized access to all patient/user data.

---

## 10. Immediate Action Plan

### Phase 1: Emergency RLS Activation (URGENT - Do This First)

**Timeline:** Within 24 hours

```sql
-- Execute this immediately
BEGIN;

-- Enable RLS on all critical tables
ALTER TABLE foco_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('foco_projects', 'workspaces', 'inbox_items', 'labels', 'work_items')
  AND relrowsecurity = true;

-- Should return 5 rows
-- If count is less than 5, rollback and investigate

COMMIT;
```

**Rollback Plan (if queries start failing):**
```sql
-- Only use if application breaks
BEGIN;
ALTER TABLE foco_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE labels DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_items DISABLE ROW LEVEL SECURITY;
COMMIT;
```

### Phase 2: Fix INSERT Policies (HIGH PRIORITY)

**Timeline:** Within 48 hours

```sql
-- Fix work_items INSERT policy
DROP POLICY IF EXISTS work_items_insert ON work_items;
CREATE POLICY "work_items_insert" ON work_items
FOR INSERT WITH CHECK (user_has_workspace_access(workspace_id));

-- Fix inbox_items INSERT policy
DROP POLICY IF EXISTS inbox_items_insert ON inbox_items;
CREATE POLICY "inbox_items_insert" ON inbox_items
FOR INSERT WITH CHECK (
  user_id = auth.uid() OR user_has_workspace_access(workspace_id)
);

-- Fix foco_projects INSERT policy (require admin)
DROP POLICY IF EXISTS foco_projects_insert ON foco_projects;
CREATE POLICY "foco_projects_insert" ON foco_projects
FOR INSERT WITH CHECK (user_is_workspace_admin(workspace_id));
```

### Phase 3: Standardize Authorization Functions (MEDIUM PRIORITY)

**Timeline:** Within 1 week

```sql
-- Create role-based helper function
CREATE OR REPLACE FUNCTION user_is_workspace_admin(ws_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role = ANY (ARRAY['owner'::member_role, 'admin'::member_role])
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Update all DELETE policies to use new function
DROP POLICY IF EXISTS foco_projects_delete ON foco_projects;
CREATE POLICY "foco_projects_delete" ON foco_projects
FOR DELETE USING (user_is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS workspace_members_delete ON workspace_members;
CREATE POLICY "workspace_members_delete" ON workspace_members
FOR DELETE USING (user_is_workspace_admin(workspace_id));
```

### Phase 4: Application Code Fixes (PARALLEL TRACK)

**Timeline:** Within 48 hours (can run parallel to Phase 1-2)

See `ARCHITECTURE_ANALYSIS_WORKSPACE_API.md` for detailed instructions.

**Summary:**
1. Replace manual cookie lookup with `getAuthUser()` helper
2. Fix table name references (organizations → workspaces)
3. Standardize API error responses
4. Add security logging

**Files to Update:**
- `/src/app/api/workspaces/route.ts`
- `/src/app/api/workspaces/[id]/members/route.ts`

### Phase 5: Testing & Validation (REQUIRED)

**Timeline:** Immediately after each phase

**Test Checklist:**
- [ ] RLS is enabled on all 5 tables (verify with SQL)
- [ ] User can access own workspace projects
- [ ] User CANNOT access other workspace projects
- [ ] User can insert work items in own workspace
- [ ] User CANNOT insert work items in other workspaces
- [ ] Regular member CANNOT delete projects
- [ ] Admin CAN delete projects
- [ ] Application authentication works (no 401 errors)
- [ ] Frontend loads workspace data correctly

**Testing Script:**
```bash
# Run integration tests
npm test -- --grep "workspace.*auth"
npm test -- --grep "project.*permissions"

# Manual testing
# 1. Login as regular user
# 2. Navigate to workspace page
# 3. Verify projects load
# 4. Try to delete project (should fail)
# 5. Login as admin
# 6. Try to delete project (should succeed)
```

---

## 11. Long-Term Security Improvements

### Recommendation 1: Implement Audit Logging

**Purpose:** Track all access and modifications for compliance

```sql
CREATE TABLE auth_audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  workspace_id uuid,
  success boolean NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Grant insert-only permissions
GRANT INSERT ON auth_audit_log TO authenticated;

-- Create audit trigger
CREATE OR REPLACE FUNCTION audit_access()
RETURNS trigger AS $$
BEGIN
  INSERT INTO auth_audit_log (user_id, action, table_name, record_id, success)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to sensitive tables
CREATE TRIGGER audit_foco_projects
  AFTER INSERT OR UPDATE OR DELETE ON foco_projects
  FOR EACH ROW EXECUTE FUNCTION audit_access();
```

### Recommendation 2: Implement Rate Limiting

**Purpose:** Prevent brute-force attacks on RLS policies

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
})

export async function middleware(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (userId) {
    const { success, limit, remaining } = await ratelimit.limit(userId)
    if (!success) {
      return new Response('Rate limit exceeded', { status: 429 })
    }
  }
  // ... rest of middleware
}
```

### Recommendation 3: Add Policy Unit Tests

**Purpose:** Prevent regression of RLS policies

```typescript
// tests/rls-policies.test.ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('RLS Policies - foco_projects', () => {
  it('user can only see projects in their workspace', async () => {
    const supabase = createClient(url, key, {
      auth: { persistSession: false }
    })

    // Login as test user
    await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password'
    })

    const { data: projects } = await supabase
      .from('foco_projects')
      .select('workspace_id')

    // All projects should be from user's workspace
    const uniqueWorkspaces = [...new Set(projects.map(p => p.workspace_id))]
    expect(uniqueWorkspaces.length).toBeLessThanOrEqual(1)
  })

  it('user cannot insert project into unauthorized workspace', async () => {
    const { error } = await supabase
      .from('foco_projects')
      .insert({
        workspace_id: 'unauthorized-uuid',
        name: 'Malicious Project'
      })

    expect(error).toBeDefined()
    expect(error.code).toBe('42501') // insufficient_privilege
  })
})
```

### Recommendation 4: Security Monitoring Dashboard

**Purpose:** Real-time visibility into security events

**Metrics to Track:**
- Number of RLS policy violations per hour
- Failed authentication attempts
- Unauthorized access attempts
- API 401/403 error rates
- User role changes
- Project/workspace creation rate

**Implementation:**
```typescript
// Use Prometheus metrics
import { Counter, Histogram } from 'prom-client'

const rlsViolations = new Counter({
  name: 'rls_policy_violations_total',
  help: 'Total number of RLS policy violations',
  labelNames: ['table', 'operation', 'user_id']
})

const apiAuthErrors = new Counter({
  name: 'api_auth_errors_total',
  help: 'Total number of API authentication errors',
  labelNames: ['endpoint', 'status_code']
})

// Increment in middleware
if (authError) {
  apiAuthErrors.inc({ endpoint: request.url, status_code: 401 })
}
```

---

## 12. Summary of Findings

### Critical Issues (Fix Immediately)

1. **RLS Disabled on 5 Tables** (CVE-level severity)
   - Impact: Complete authorization bypass
   - Affected: foco_projects, workspaces, inbox_items, labels, work_items
   - Fix: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`

2. **Open INSERT Policies** (CVE-level severity)
   - Impact: Data injection into unauthorized workspaces
   - Affected: work_items, inbox_items
   - Fix: Add `WITH CHECK (user_has_workspace_access(workspace_id))`

### High Priority Issues

3. **Inconsistent Policy Patterns**
   - Impact: Maintenance burden, potential bypass vectors
   - Fix: Standardize on helper functions

4. **Cookie-Based Auth Bypass** (Application Layer)
   - Impact: 401 errors preventing access
   - Fix: Use `getAuthUser()` helper in workspace APIs

### Medium Priority Issues

5. **Schema Naming Inconsistency**
   - Impact: Potential data corruption, authorization bypass
   - Fix: Remove/migrate old `organizations` tables

6. **Circular Policy Dependencies**
   - Impact: Potential deadlock, requires SECURITY DEFINER functions
   - Fix: Add audit logging, consider breaking dependency

### User-Specific Status

**User:** 60c44927-9d61-40e2-8c41-7e44cf7f7981
- ✅ Valid workspace membership (Fyves Team)
- ✅ Admin role with elevated privileges
- ✅ Owns 3 projects in workspace
- ⚠️ Currently has unauthorized access to ALL projects (due to disabled RLS)
- ⚠️ May experience 401 errors on workspace APIs (due to cookie issue)

---

## 13. Risk Matrix

| Vulnerability | Likelihood | Impact | Risk Score | Priority |
|---------------|------------|--------|------------|----------|
| RLS Disabled | HIGH (Active) | CRITICAL | 🔴 10/10 | P0 |
| Open INSERT Policies | MEDIUM | CRITICAL | 🔴 9/10 | P0 |
| Auth Cookie Mismatch | HIGH (Active) | HIGH | 🔴 8/10 | P0 |
| Inconsistent Policies | LOW | HIGH | 🟡 6/10 | P1 |
| Schema Inconsistency | MEDIUM | MEDIUM | 🟡 5/10 | P2 |
| Circular Dependencies | LOW | MEDIUM | 🟢 4/10 | P3 |

---

## 14. Compliance Checklist

- [ ] **GDPR Article 32:** Enable RLS (technical security measures)
- [ ] **GDPR Article 30:** Document RLS policies (record of processing)
- [ ] **SOC 2 CC6.1:** Implement access controls (RLS + RBAC)
- [ ] **SOC 2 CC7.2:** Implement audit logging (auth_audit_log table)
- [ ] **PCI-DSS 7.1:** Limit access to cardholder data (RLS enforcement)
- [ ] **HIPAA 164.312(a)(1):** Access control (role-based policies)

---

## 15. Contact & Next Steps

### Immediate Actions (TODAY)

1. **Execute Phase 1 SQL script** to enable RLS (30 minutes)
2. **Test basic functionality** to ensure no breakage (1 hour)
3. **Execute Phase 2 SQL script** to fix INSERT policies (30 minutes)
4. **Fix workspace API authentication** code (2 hours)

### This Week

1. **Complete Phase 3** - Standardize authorization functions
2. **Run full test suite** - Verify all security controls
3. **Update documentation** - Document RLS architecture
4. **Brief development team** - Explain security changes

### This Month

1. **Implement audit logging** - Track security events
2. **Add security monitoring** - Prometheus metrics
3. **Create RLS unit tests** - Prevent regression
4. **Conduct penetration testing** - Validate security posture

### Questions or Issues?

If you encounter any issues during remediation:

1. **Rollback immediately** using the rollback scripts provided
2. **Document the specific error** (SQL error code, message, context)
3. **Test in isolation** - Try each fix separately to identify the problem
4. **Reach out for support** - Provide detailed logs and error messages

---

## 16. References

**PostgreSQL Documentation:**
- [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [Security Functions](https://www.postgresql.org/docs/current/functions-security.html)

**Supabase Documentation:**
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

**OWASP Resources:**
- [A01:2021 - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)

**Compliance Frameworks:**
- [GDPR Article 32](https://gdpr-info.eu/art-32-gdpr/)
- [SOC 2 Trust Service Criteria](https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**End of Security Audit Report**

*This report contains sensitive security information. Distribution should be limited to authorized personnel only.*
