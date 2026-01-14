# DATABASE SCHEMA VISUAL MAP

**Visual guide to understanding the schema conflict and resolution**

---

## CURRENT STATE: Schema Conflict

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR APPLICATION CODE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │ WRONG TYPE FILE  │              │ CORRECT TYPE FILE│        │
│  │ database.types.ts│              │    foco.ts       │        │
│  └────────┬─────────┘              └────────┬─────────┘        │
│           │                                   │                  │
│           │ Defines:                         │ Defines:         │
│           │ - organizations ❌               │ - workspaces ✅  │
│           │ - projects ❌                    │ - foco_projects ✅│
│           │ - tasks ❌                       │ - work_items ✅  │
│           │                                   │                  │
│           ▼                                   ▼                  │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │  SOME API FILES  │              │  SOME API FILES  │        │
│  │   (3 files)      │              │  (most files)    │        │
│  └────────┬─────────┘              └────────┬─────────┘        │
│           │                                   │                  │
└───────────┼───────────────────────────────────┼──────────────────┘
            │                                   │
            │ Queries:                          │ Queries:
            │ .from('organizations') ❌        │ .from('workspaces') ✅
            │ .from('projects') ❌             │ .from('foco_projects') ✅
            │ .from('tasks') ❌                │ .from('work_items') ✅
            │                                   │
            ▼                                   ▼
┌───────────┴───────────────────────────────────┴──────────────────┐
│                    PRODUCTION DATABASE                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ❌ TABLES THAT DON'T EXIST       ✅ TABLES THAT EXIST          │
│  (causing 500 errors)              (working correctly)           │
│                                                                   │
│  ❌ organizations                  ✅ workspaces                 │
│  ❌ organization_members           ✅ workspace_members          │
│  ❌ projects                       ✅ foco_projects              │
│  ❌ project_members                ✅ foco_project_members       │
│  ❌ tasks                          ✅ work_items                 │
│  ❌ comments                       ✅ foco_comments              │
│                                    ✅ labels                     │
│                                    ✅ docs                       │
│                                    ✅ automations                │
│                                    ✅ ...and 10 more tables      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

RESULT: 3 API endpoints throw "relation does not exist" errors
        while most endpoints work correctly
```

---

## AFTER FIX: Schema Aligned

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR APPLICATION CODE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ❌ DELETED                         ┌──────────────────┐        │
│     database.types.ts               │ CORRECT TYPE FILE│        │
│     (archived)                      │    foco.ts       │        │
│                                     └────────┬─────────┘        │
│                                              │                   │
│                                              │ Defines:          │
│                                              │ - workspaces ✅   │
│                                              │ - foco_projects ✅│
│                                              │ - work_items ✅   │
│                                              │                   │
│                                              ▼                   │
│                                     ┌──────────────────┐        │
│                                     │   ALL API FILES  │        │
│                                     │  (100% aligned)  │        │
│                                     └────────┬─────────┘        │
│                                              │                   │
└──────────────────────────────────────────────┼───────────────────┘
                                               │
                                               │ Queries:
                                               │ .from('workspaces') ✅
                                               │ .from('foco_projects') ✅
                                               │ .from('work_items') ✅
                                               │
                                               ▼
┌──────────────────────────────────────────────┴────────────────────┐
│                    PRODUCTION DATABASE                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│                       ✅ ALL TABLES MATCH CODE                   │
│                                                                   │
│  ✅ workspaces                     ✅ labels                     │
│  ✅ workspace_members              ✅ docs                       │
│  ✅ foco_projects                  ✅ automations                │
│  ✅ foco_project_members           ✅ inbox_items                │
│  ✅ work_items                     ✅ activity_log               │
│  ✅ work_item_labels               ✅ time_entries               │
│  ✅ work_item_dependencies         ✅ user_presence              │
│  ✅ foco_comments                  ✅ reports                    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

RESULT: All API endpoints work correctly
        Zero "relation does not exist" errors
```

---

## MIGRATION DIRECTORY CONFLICT

### BEFORE: Two Competing Migration Systems

```
📁 YOUR PROJECT
│
├── 📁 database/migrations/           ✅ CORRECT SCHEMA
│   ├── 100_foco_2_core_schema.sql   ✅ Creates: workspaces, foco_projects, work_items
│   ├── 101_foco_2_seed_data.sql
│   ├── 102_add_missing_tables.sql
│   └── ... (30+ migration files)
│
└── 📁 supabase/migrations/           ❌ OLD SCHEMA (CONFLICT)
    ├── 20260111_base_schema.sql     ❌ Creates: organizations, projects, tasks
    └── 20260111_auto_reload.sql

    ⚠️  PROBLEM: Both directories exist
    ⚠️  CONFLICT: They define different table names
    ⚠️  RESULT: Confusion about which is correct
```

### AFTER: Single Source of Truth

```
📁 YOUR PROJECT
│
├── 📁 database/migrations/              ✅ SINGLE SOURCE OF TRUTH
│   ├── 100_foco_2_core_schema.sql      ✅ Creates correct schema
│   ├── 101_foco_2_seed_data.sql
│   ├── 102_add_missing_tables.sql
│   ├── ... (30+ migration files)
│   │
│   └── 📁 OBSOLETE_SUPABASE/           📦 ARCHIVED (not used)
│       ├── README.md                   📄 Explains why archived
│       ├── 20260111_base_schema.sql   📦 Old schema preserved for reference
│       └── 20260111_auto_reload.sql
│
└── 📁 supabase/                        (migrations/ directory removed)

    ✅ RESULT: Clear which migrations to use
    ✅ RESULT: No confusion about table names
```

---

## API ENDPOINT ERROR FLOW

### BEFORE FIX: Error Path

```
1. User clicks "Create Workspace"
   │
   ▼
2. Frontend calls POST /api/workspaces
   │
   ▼
3. API endpoint queries database:
   │
   │  const { data } = await supabase
   │    .from('organizations')  ❌ WRONG TABLE NAME
   │    .insert({ ... })
   │
   ▼
4. Supabase returns error:
   │
   │  {
   │    error: "relation 'organizations' does not exist"
   │  }
   │
   ▼
5. API returns 500 to frontend
   │
   ▼
6. User sees error message
   │
   ▼
7. Feature doesn't work ❌
```

### AFTER FIX: Success Path

```
1. User clicks "Create Workspace"
   │
   ▼
2. Frontend calls POST /api/workspaces
   │
   ▼
3. API endpoint queries database:
   │
   │  const { data } = await supabase
   │    .from('workspaces')  ✅ CORRECT TABLE NAME
   │    .insert({ ... })
   │
   ▼
4. Supabase successfully creates record:
   │
   │  {
   │    data: { id: '...', name: '...', ... }
   │  }
   │
   ▼
5. API returns 201 Created to frontend
   │
   ▼
6. User sees success message
   │
   ▼
7. Feature works correctly ✅
```

---

## THE THREE CRITICAL FILES TO FIX

```
┌────────────────────────────────────────────────────────────────┐
│ FILE 1: /src/app/api/workspaces/route.ts                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Line 115:  .from('organizations')      → .from('workspaces')  │
│ Line 138:  .from('organization_members') → .from('workspace_members') │
│ Line 151:  .from('organizations')      → .from('workspaces')  │
│                                                                │
│ IMPACT: Fixes "Cannot create workspace" error                 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ FILE 2: /src/app/api/projects/[id]/pin/route.ts               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Line 44:   .from('projects')           → .from('foco_projects')│
│ Line 157:  .from('projects')           → .from('foco_projects')│
│                                                                │
│ IMPACT: Fixes "Cannot pin project" error                      │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ FILE 3: /src/app/api/tasks/[id]/custom-values/route.ts        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Line 34:   .from('tasks')              → .from('work_items')  │
│ Line 148:  .from('tasks')              → .from('work_items')  │
│                                                                │
│ IMPACT: Fixes "Cannot set custom fields" error                │
└────────────────────────────────────────────────────────────────┘

           TOTAL: 7 lines to change across 3 files
```

---

## TYPE DEFINITION CLEANUP

```
BEFORE:
📁 src/types/
├── database.types.ts  ❌ WRONG (defines non-existent tables)
│   └── Contains: Organization, Project, Task types
│       (These don't match database!)
│
└── foco.ts            ✅ CORRECT (matches database)
    └── Contains: Workspace, Project, WorkItem types
        (These match database exactly!)

⚠️  PROBLEM: Code imports from both files
⚠️  RESULT: Type confusion and runtime errors

────────────────────────────────────────────────────────────

AFTER:
📁 src/types/
├── OBSOLETE/
│   └── database.types.ts.OBSOLETE  📦 ARCHIVED
│       └── README.md explains why removed
│
└── foco.ts            ✅ SINGLE SOURCE OF TRUTH
    └── Contains: Workspace, Project, WorkItem types
        (All code imports from here!)

✅ RESULT: Type safety matches database schema
✅ RESULT: No confusion about which types to use
```

---

## SCHEMA MAPPING TABLE

Quick reference for finding correct table names:

```
┌─────────────────────────┬─────────────────────────┬──────────────┐
│ CONCEPT                 │ ❌ WRONG NAME           │ ✅ CORRECT   │
├─────────────────────────┼─────────────────────────┼──────────────┤
│ Multi-tenant container  │ organizations           │ workspaces   │
│ Container membership    │ organization_members    │ workspace_members │
│ Project                 │ projects                │ foco_projects│
│ Project membership      │ project_members         │ foco_project_members │
│ Task/Bug/Feature        │ tasks                   │ work_items   │
│ Work item label link    │ task_labels             │ work_item_labels │
│ Work item dependency    │ task_dependencies       │ work_item_dependencies │
│ Comment                 │ comments                │ foco_comments│
└─────────────────────────┴─────────────────────────┴──────────────┘

MEMORIZATION TIP:
- If it was "organization" → now "workspace"
- If it was "task" → now "work_item"
- If it's a project table → prefix with "foco_"
- If it references work items → use "work_item_" prefix
```

---

## DATABASE SCHEMA LAYERS

Understanding the complete stack:

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 4: FRONTEND COMPONENTS                                │
│ - React components                                          │
│ - Don't directly query database                             │
│ - Use API endpoints                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: API ENDPOINTS                                      │
│ - /api/workspaces/                                          │
│ - /api/projects/                                            │
│ - /api/tasks/                                               │
│ - Query database using table names ← FIX HAPPENS HERE       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: SUPABASE CLIENT                                    │
│ - supabase.from('table_name')                               │
│ - Translates to PostgreSQL queries                          │
│ - Uses table names from Layer 3                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: POSTGRESQL DATABASE                                │
│ - Actual tables: workspaces, foco_projects, work_items     │
│ - Schema defined by migrations                              │
│ - Cannot change without migrations ← SOURCE OF TRUTH        │
└─────────────────────────────────────────────────────────────┘

🎯 KEY INSIGHT:
   Layer 1 (database) is the source of truth
   Layer 3 (API) must match Layer 1's table names
   Currently: Layer 3 uses wrong names → errors
   Fix: Update Layer 3 to match Layer 1
```

---

## VERIFICATION FLOW

How to verify the fix worked:

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: Run TypeScript Build                                │
│ $ npm run build                                              │
│                                                              │
│ ✅ PASS: No TypeScript errors                               │
│ ❌ FAIL: Type errors → Review type imports                  │
└──────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: Run Schema Verification                             │
│ $ tsx scripts/verify-schema-alignment.ts                    │
│                                                              │
│ ✅ PASS: All tables exist, no wrong names found             │
│ ❌ FAIL: Missing tables or wrong names → Review fixes       │
└──────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: Test API Endpoints                                  │
│ $ curl POST /api/workspaces (create workspace)              │
│ $ curl POST /api/projects/[id]/pin (pin project)            │
│ $ curl POST /api/tasks/[id]/custom-values (set values)      │
│                                                              │
│ ✅ PASS: All return 200/201 responses                       │
│ ❌ FAIL: 500 errors → Check error messages                  │
└──────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: Check Production Logs                               │
│ $ tail -f production.log | grep "relation"                  │
│                                                              │
│ ✅ PASS: No "relation does not exist" errors                │
│ ❌ FAIL: Still seeing errors → Review remaining issues      │
└──────────────────────────────────────────────────────────────┘
                     │
                     ▼
                  SUCCESS! ✅
         All endpoints work correctly
      Zero database relation errors
```

---

## QUICK COMMAND REFERENCE

Execute these in order:

```bash
# PHASE 1: Fix API Endpoints (30 min)
sed -i '' "s/.from('organizations')/.from('workspaces')/g" \
  src/app/api/workspaces/route.ts

sed -i '' "s/.from('projects')/.from('foco_projects')/g" \
  src/app/api/projects/[id]/pin/route.ts

sed -i '' "s/.from('tasks')/.from('work_items')/g" \
  src/app/api/tasks/[id]/custom-values/route.ts

# PHASE 2: Remove Wrong Types (15 min)
mkdir -p src/types/OBSOLETE
mv src/types/database.types.ts src/types/OBSOLETE/

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec \
  sed -i '' "s|@/types/database\.types|@/types/foco|g" {} +

# PHASE 3: Archive Old Migrations (30 min)
mkdir -p database/migrations/OBSOLETE_SUPABASE
mv supabase/migrations/* database/migrations/OBSOLETE_SUPABASE/

# PHASE 4: Verify (15 min)
npm run build
tsx scripts/verify-schema-alignment.ts
```

---

## SUCCESS INDICATORS

You'll know it worked when you see:

```
✅ TypeScript builds without errors
✅ Schema verification passes 100%
✅ API endpoints return 200/201 (not 500)
✅ Zero "relation does not exist" in logs
✅ Users can create workspaces
✅ Users can pin/unpin projects
✅ Users can set custom field values
✅ All features work end-to-end
```

---

**KEY TAKEAWAY:**

Your database has the correct tables (`workspaces`, `foco_projects`, `work_items`).
Three API files query wrong table names (`organizations`, `projects`, `tasks`).
Fix: Change 7 lines across 3 files to use correct names.
Result: Production errors disappear.

**Time to fix:** 2 hours
**Risk level:** LOW (aligns code with existing database)
**Benefit:** Production stability restored

---

Ready to execute? Start with:
📖 Read: `DATABASE_SCHEMA_FIX_IMPLEMENTATION_PLAN.md`
🔧 Execute: Follow the step-by-step commands
✅ Verify: Run tests and check production logs
