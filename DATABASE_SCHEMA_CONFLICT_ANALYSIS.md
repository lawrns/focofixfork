# DATABASE SCHEMA CONFLICT RESOLUTION ANALYSIS

**Date:** 2026-01-13
**Status:** CRITICAL P0 - Schema Mismatch Causing Runtime Failures
**Priority:** Immediate Resolution Required

---

## EXECUTIVE SUMMARY

Your application has **THREE conflicting schema definitions** causing runtime errors and inconsistent data access patterns:

1. **Wrong Types File** (`/src/types/database.types.ts`) - Defines non-existent tables
2. **Correct Types File** (`/src/types/foco.ts`) - Matches actual database schema
3. **Dual Migration Systems** - Two migration directories with conflicting schemas

**Key Finding:** Your API endpoints query a **MIX of correct and incorrect table names**, causing failures.

---

## SCHEMA CONFLICT MATRIX

| Concept | Wrong Name (`database.types.ts`) | Correct Name (`foco.ts` + DB) | API Endpoints Using |
|---------|----------------------------------|-------------------------------|---------------------|
| Workspace | `organizations` | `workspaces` | MIXED (both used) |
| Membership | `organization_members` | `workspace_members` | `workspace_members` |
| Project | `projects` | `foco_projects` | `foco_projects` |
| Task | `tasks` | `work_items` | `work_items` |

---

## EVIDENCE FROM API ENDPOINTS

### ✅ CORRECT API Endpoints (Query Actual Tables)

```typescript
// /api/organizations/route.ts - Lines 14, 76
.from('workspace_members')  // ✅ CORRECT
.from('workspaces')        // ✅ CORRECT

// /api/tasks/route.ts - Lines 19, 98
.from('work_items')        // ✅ CORRECT

// /api/projects/route.ts - Lines 20, 86
.from('foco_projects')     // ✅ CORRECT
```

### ❌ INCORRECT API Endpoints (Query Non-Existent Tables)

```typescript
// /api/workspaces/route.ts - Lines 115, 151
.from('organizations')     // ❌ WRONG - Should be 'workspaces'
.from('organization_members')  // ❌ WRONG - Should be 'workspace_members'

// /api/projects/[id]/pin/route.ts - Lines 44, 157
.from('projects')          // ❌ WRONG - Should be 'foco_projects'

// /api/tasks/[id]/custom-values/route.ts - Lines 34, 148
.from('tasks')             // ❌ WRONG - Should be 'work_items'
```

---

## MIGRATION DIRECTORY CONFLICT

### Directory 1: `/database/migrations/`
**Schema:** Creates FOCO 2.0 tables (100_foco_2_core_schema.sql)
- ✅ `workspaces`
- ✅ `workspace_members`
- ✅ `foco_projects`
- ✅ `work_items`
- ✅ `labels`, `docs`, `automations`, etc.

**Status:** This is the CORRECT schema matching production

### Directory 2: `/supabase/migrations/`
**Schema:** Creates old schema (20260111000000_base_schema.sql)
- ❌ `organizations`
- ❌ `organization_members`
- ❌ `projects`
- ❌ `tasks`
- ❌ `milestones`

**Status:** This is an OLD/OBSOLETE schema that should be deleted

---

## ROOT CAUSE ANALYSIS

### 1. **Type Definition Mismatch**

`/src/types/database.types.ts` (Lines 13-17):
```typescript
// TODO(DB_ALIGNMENT): CRITICAL - This entire file defines tables that DO NOT EXIST in the database
// | expected (this file defines): users, organizations, organization_members, projects, tasks
// | actual (DB has): workspaces, workspace_members, foco_projects, work_items
// The correct types are in /src/types/foco.ts - this file should be DELETED
```

This comment **confirms the problem** - the file documents its own incorrectness!

### 2. **Inconsistent API Implementation**

Some APIs use correct table names (via `foco.ts` types), others use incorrect names (via `database.types.ts` imports or hardcoded strings).

**Example of Conflict:**
```typescript
// ✅ /api/organizations/route.ts (CORRECT)
const { data: workspaces } = await supabase
  .from('workspace_members')  // Uses correct table

// ❌ /api/workspaces/route.ts (WRONG)
const { data: newOrg } = await supabase
  .from('organizations')      // Uses non-existent table
```

### 3. **Migration History Confusion**

Two migration systems created competing schemas. The **Foco 2.0 migration** (100_foco_2_core_schema.sql) is newer and correct, but old migrations still exist.

---

## PRODUCTION DATABASE STATE (INFERRED)

Based on API endpoint analysis, production database likely has:

### ✅ Tables That Exist (Queried Successfully)
- `workspaces`
- `workspace_members`
- `foco_projects`
- `foco_project_members`
- `work_items`
- `work_item_labels`
- `work_item_dependencies`
- `labels`
- `foco_comments`
- `docs`
- `saved_views`
- `automations`
- `inbox_items`
- `activity_log`
- `time_entries`
- `user_presence`
- `reports`

### ❌ Tables That Don't Exist (Causing Failures)
- `organizations` (confusion with `workspaces`)
- `organization_members` (confusion with `workspace_members`)
- `projects` (confusion with `foco_projects`)
- `tasks` (confusion with `work_items`)

---

## CRITICAL FAILURES IDENTIFIED

### Failure 1: `/api/workspaces` POST Endpoint
**Location:** `/src/app/api/workspaces/route.ts:115`
```typescript
const { data: newOrg, error: createError } = await supabase
  .from('organizations')  // ❌ TABLE DOES NOT EXIST
```
**Impact:** Cannot create new workspaces
**Error:** `relation "organizations" does not exist`

### Failure 2: `/api/projects/[id]/pin` Endpoint
**Location:** `/src/app/api/projects/[id]/pin/route.ts:44`
```typescript
const { data: project, error } = await supabase
  .from('projects')  // ❌ TABLE DOES NOT EXIST (should be 'foco_projects')
```
**Impact:** Cannot pin/unpin projects
**Error:** `relation "projects" does not exist`

### Failure 3: `/api/tasks/[id]/custom-values` Endpoint
**Location:** `/src/app/api/tasks/[id]/custom-values/route.ts:34`
```typescript
const existingTask = await supabase
  .from('tasks')  // ❌ TABLE DOES NOT EXIST (should be 'work_items')
```
**Impact:** Cannot set custom field values on tasks
**Error:** `relation "tasks" does not exist`

---

## RESOLUTION STRATEGY

### Phase 1: Immediate Fixes (Stop the Bleeding)

#### Step 1.1: Fix API Endpoint Table Names (30 min)
**Priority:** CRITICAL - Prevents runtime errors

```bash
# Fix workspaces API
src/app/api/workspaces/route.ts:
  - Line 115: 'organizations' → 'workspaces'
  - Line 138: 'organization_members' → 'workspace_members'
  - Line 151: 'organizations' → 'workspaces'

# Fix projects pin API
src/app/api/projects/[id]/pin/route.ts:
  - Line 44: 'projects' → 'foco_projects'
  - Line 157: 'projects' → 'foco_projects'

# Fix tasks custom values API
src/app/api/tasks/[id]/custom-values/route.ts:
  - Line 34: 'tasks' → 'work_items'
  - Line 148: 'tasks' → 'work_items'
```

#### Step 1.2: Delete Incorrect Type Definitions (5 min)
```bash
# Delete the wrong types file
rm /src/types/database.types.ts

# Update imports to use correct types
find src -type f -name "*.ts" -o -name "*.tsx" | \
  xargs grep -l "from '@/types/database.types'" | \
  xargs sed -i '' 's/@\/types\/database\.types/@\/types\/foco/g'
```

### Phase 2: Clean Up Migration Confusion (1 hour)

#### Step 2.1: Archive Obsolete Migrations
```bash
# Archive old supabase migrations
mkdir -p /database/migrations/OBSOLETE
mv /supabase/migrations/* /database/migrations/OBSOLETE/

# Add README explaining why
cat > /database/migrations/OBSOLETE/README.md <<EOF
# Obsolete Migrations

These migrations create an OLD schema (organizations, projects, tasks)
that conflicts with the FOCO 2.0 schema (workspaces, foco_projects, work_items).

DO NOT RUN THESE MIGRATIONS. They are preserved for historical reference only.

The correct schema is defined in:
- /database/migrations/100_foco_2_core_schema.sql
EOF
```

#### Step 2.2: Consolidate to Single Migration Directory
```bash
# Keep only /database/migrations/ as source of truth
# Remove /supabase/migrations/ directory (after archiving)
```

### Phase 3: Verification & Documentation (30 min)

#### Step 3.1: Create Schema Verification Script
```typescript
// scripts/verify-schema-alignment.ts
import { createClient } from '@supabase/supabase-js'

async function verifySchema() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)

  // Test correct tables exist
  const correctTables = [
    'workspaces', 'workspace_members', 'foco_projects',
    'work_items', 'labels', 'docs'
  ]

  for (const table of correctTables) {
    const { error } = await supabase.from(table).select('id').limit(1)
    if (error) {
      console.error(`❌ MISSING TABLE: ${table}`)
      console.error(`   Error: ${error.message}`)
    } else {
      console.log(`✅ TABLE EXISTS: ${table}`)
    }
  }

  // Test incorrect tables don't exist (should fail)
  const incorrectTables = ['organizations', 'projects', 'tasks']

  for (const table of incorrectTables) {
    const { error } = await supabase.from(table).select('id').limit(1)
    if (error && error.message.includes('does not exist')) {
      console.log(`✅ CORRECTLY ABSENT: ${table}`)
    } else {
      console.error(`⚠️ WARNING: Unexpected table exists: ${table}`)
    }
  }
}

verifySchema()
```

#### Step 3.2: Document Source of Truth
```markdown
# DATABASE_SCHEMA_SOURCE_OF_TRUTH.md

## Canonical Schema Definition

**Location:** `/database/migrations/100_foco_2_core_schema.sql`
**Version:** FOCO 2.0
**Last Updated:** 2026-01-10

## Core Tables

### Workspaces (formerly "organizations")
- Table: `workspaces`
- Members: `workspace_members`

### Projects
- Table: `foco_projects`
- Members: `foco_project_members`

### Work Items (formerly "tasks")
- Table: `work_items`
- Labels: `work_item_labels`
- Dependencies: `work_item_dependencies`

## Type Definitions

**Correct Types:** `/src/types/foco.ts`
**Status:** ✅ Matches database schema 100%

## Migration Policy

1. All migrations go in `/database/migrations/`
2. Use numeric prefixes (e.g., `103_add_feature.sql`)
3. Never use `/supabase/migrations/` (obsolete)
4. Test migrations locally before deploying
```

---

## VALIDATION CHECKLIST

After implementing fixes, verify:

- [ ] **API Endpoints Pass**
  - [ ] `POST /api/workspaces` creates workspace successfully
  - [ ] `GET /api/workspaces` fetches workspaces
  - [ ] `POST /api/projects/[id]/pin` pins project
  - [ ] `POST /api/tasks/[id]/custom-values` sets custom values

- [ ] **Type Safety**
  - [ ] No imports of `@/types/database.types`
  - [ ] All code uses `@/types/foco`
  - [ ] TypeScript compilation passes with no errors

- [ ] **Migration Clarity**
  - [ ] Only one migration directory exists (`/database/migrations/`)
  - [ ] Schema verification script passes
  - [ ] Documentation updated

- [ ] **End-to-End Testing**
  - [ ] Can create workspace
  - [ ] Can create project in workspace
  - [ ] Can create work item in project
  - [ ] Can assign labels to work items
  - [ ] Can pin/unpin projects

---

## FILES TO MODIFY

### DELETE
- `/src/types/database.types.ts` (incorrect types)
- `/supabase/migrations/` (obsolete schema, archive first)

### UPDATE (Fix Table Names)
1. `/src/app/api/workspaces/route.ts` (lines 115, 138, 151)
2. `/src/app/api/projects/[id]/pin/route.ts` (lines 44, 157)
3. `/src/app/api/tasks/[id]/custom-values/route.ts` (lines 34, 148)
4. All files importing from `@/types/database.types` → change to `@/types/foco`

### CREATE
- `/scripts/verify-schema-alignment.ts` (verification script)
- `/DATABASE_SCHEMA_SOURCE_OF_TRUTH.md` (documentation)
- `/database/migrations/OBSOLETE/README.md` (explain archived migrations)

---

## ESTIMATED IMPACT

### Breaking Changes: **NONE**
These fixes align code with existing database. No schema changes needed.

### API Changes: **NONE**
All API endpoints keep same URLs and request/response formats.

### Deployment Risk: **LOW**
Fixes address existing bugs. No new bugs introduced.

### Implementation Time: **2 hours**
- Phase 1: 30 min (fix endpoints)
- Phase 2: 1 hour (clean migrations)
- Phase 3: 30 min (verification)

---

## SUCCESS METRICS

After completion:
- ✅ Zero `relation does not exist` errors in logs
- ✅ 100% schema alignment score (types match database)
- ✅ Single migration directory (`/database/migrations/`)
- ✅ All API endpoints return successful responses
- ✅ TypeScript compilation clean (no type errors)

---

## NEXT STEPS

1. **Approve Strategy** - Review this analysis with team
2. **Execute Phase 1** - Fix critical API endpoints (30 min)
3. **Test Immediately** - Verify fixes work in production
4. **Execute Phases 2-3** - Clean up migrations and document (1.5 hours)
5. **Monitor Production** - Check error rates drop to zero

---

## CONTACT FOR QUESTIONS

If you need clarification on any fix or want to discuss the approach, please ask before proceeding.
