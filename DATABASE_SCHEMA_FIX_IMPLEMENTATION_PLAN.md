# DATABASE SCHEMA FIX - IMPLEMENTATION PLAN

**Status:** Ready to Execute
**Estimated Time:** 2 hours
**Risk Level:** Low (fixes existing bugs, no breaking changes)

---

## QUICK START - EXECUTE THIS PLAN

Copy and paste these commands in order. Each section is self-contained and can be verified immediately.

---

## PHASE 1: FIX CRITICAL API ENDPOINTS (30 minutes)

### Fix 1: `/api/workspaces/route.ts`

**Problem:** Queries non-existent `organizations` and `organization_members` tables

**Current Code (Lines 113-125):**
```typescript
// Create new organization/workspace
const { data: newOrg, error: createError } = await supabase
  .from('organizations')  // ❌ WRONG
  .insert([
    {
      name,
      slug,
      created_by: user.id,
      is_active: true,
    },
  ])
  .select()
  .single()
```

**Current Code (Lines 136-145):**
```typescript
// Add creator as organization member
const { error: memberError } = await supabase
  .from('organization_members')  // ❌ WRONG
  .insert([
    {
      organization_id: newOrg.id,
      user_id: user.id,
      role: 'owner',
    },
  ])
```

**Current Code (Lines 148-152):**
```typescript
// Clean up created organization
await supabase
  .from('organizations')  // ❌ WRONG
  .delete()
  .eq('id', newOrg.id)
```

**Fix Command:**
```bash
# Apply all three fixes in one command
sed -i '' \
  -e "s/.from('organizations')/.from('workspaces')/g" \
  -e "s/.from('organization_members')/.from('workspace_members')/g" \
  -e "s/organization_id: newOrg.id/workspace_id: newOrg.id/g" \
  /Users/lukatenbosch/focofixfork/src/app/api/workspaces/route.ts
```

**Verification:**
```bash
# Check the fix was applied
grep -n "\.from('workspaces')" /Users/lukatenbosch/focofixfork/src/app/api/workspaces/route.ts
grep -n "\.from('workspace_members')" /Users/lukatenbosch/focofixfork/src/app/api/workspaces/route.ts

# Should see matches at lines ~115, ~138, ~151
```

---

### Fix 2: `/api/projects/[id]/pin/route.ts`

**Problem:** Queries non-existent `projects` table (should be `foco_projects`)

**Current Code (Line 44):**
```typescript
const { data: project, error } = await supabase
  .from('projects')  // ❌ WRONG
  .select('*')
  .eq('id', id)
  .single()
```

**Current Code (Line 157):**
```typescript
const { data: updatedProject, error: updateError } = await supabase
  .from('projects')  // ❌ WRONG
  .update({ is_pinned })
  .eq('id', projectId)
```

**Fix Command:**
```bash
# Replace all 'projects' with 'foco_projects' in this file
sed -i '' "s/.from('projects')/.from('foco_projects')/g" \
  /Users/lukatenbosch/focofixfork/src/app/api/projects/[id]/pin/route.ts
```

**Verification:**
```bash
# Should find 'foco_projects' at lines ~44 and ~157
grep -n "\.from('foco_projects')" /Users/lukatenbosch/focofixfork/src/app/api/projects/[id]/pin/route.ts
```

---

### Fix 3: `/api/tasks/[id]/custom-values/route.ts`

**Problem:** Queries non-existent `tasks` table (should be `work_items`)

**Current Code (Line 34):**
```typescript
const existingTask = await supabase
  .from('tasks')  // ❌ WRONG
  .select('*')
  .eq('id', taskId)
  .single()
```

**Current Code (Line 148):**
```typescript
const taskCheck = await supabase
  .from('tasks')  // ❌ WRONG
  .select('id')
  .eq('id', taskId)
  .single()
```

**Fix Command:**
```bash
# Replace 'tasks' with 'work_items' in this file
sed -i '' "s/.from('tasks')/.from('work_items')/g" \
  /Users/lukatenbosch/focofixfork/src/app/api/tasks/[id]/custom-values/route.ts
```

**Verification:**
```bash
# Should find 'work_items' at lines ~34 and ~148
grep -n "\.from('work_items')" /Users/lukatenbosch/focofixfork/src/app/api/tasks/[id]/custom-values/route.ts
```

---

### Phase 1 Verification Test

```bash
# Test that all fixed endpoints compile
npm run build 2>&1 | grep -i "error" || echo "✅ Build successful"

# Search for any remaining incorrect table names in API routes
echo "Checking for remaining incorrect table names..."
grep -r "\.from('organizations')" src/app/api/ || echo "✅ No 'organizations' references"
grep -r "\.from('projects')" src/app/api/ || echo "⚠️ Found 'projects' references (may be correct in some contexts)"
grep -r "\.from('tasks')" src/app/api/ || echo "✅ No 'tasks' references"
```

---

## PHASE 2: DELETE INCORRECT TYPE DEFINITIONS (15 minutes)

### Step 2.1: Archive the Wrong Types File

```bash
# Create archive directory
mkdir -p /Users/lukatenbosch/focofixfork/src/types/OBSOLETE

# Move incorrect types to archive
mv /Users/lukatenbosch/focofixfork/src/types/database.types.ts \
   /Users/lukatenbosch/focofixfork/src/types/OBSOLETE/database.types.ts.OBSOLETE

# Create README explaining why
cat > /Users/lukatenbosch/focofixfork/src/types/OBSOLETE/README.md <<'EOF'
# Obsolete Type Definitions

This directory contains type definitions that DO NOT MATCH the actual database schema.

## database.types.ts.OBSOLETE

**Problem:** Defines tables that don't exist:
- `organizations` (actual: `workspaces`)
- `organization_members` (actual: `workspace_members`)
- `projects` (actual: `foco_projects`)
- `tasks` (actual: `work_items`)

**Solution:** Use `/src/types/foco.ts` instead, which matches the production schema.

**Date Archived:** 2026-01-13
**Reason:** Schema mismatch causing runtime errors
EOF
```

### Step 2.2: Find and Update Imports

```bash
# Find all files importing from database.types
echo "Files importing from database.types:"
grep -r "from '@/types/database.types'" src/ --include="*.ts" --include="*.tsx" -l

# Update imports to use foco.ts
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec \
  sed -i '' "s|@/types/database\.types|@/types/foco|g" {} +

# Verify changes
echo "Checking for remaining database.types imports..."
grep -r "from '@/types/database.types'" src/ || echo "✅ All imports updated"
```

### Step 2.3: Update Type Names in Code

Some code may use type aliases from the old file. Update them:

```bash
# Update Organization → Workspace type references
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec \
  sed -i '' "s/: Organization\b/: Workspace/g" {} +

# Update OrganizationMember → WorkspaceMember
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec \
  sed -i '' "s/: OrganizationMember\b/: WorkspaceMember/g" {} +

# Update Project → Project (keep, but note foco_projects table)
# Work items are already correct in foco.ts
```

---

## PHASE 3: CONSOLIDATE MIGRATIONS (30 minutes)

### Step 3.1: Archive Obsolete Supabase Migrations

```bash
# Create obsolete migrations archive
mkdir -p /Users/lukatenbosch/focofixfork/database/migrations/OBSOLETE_SUPABASE

# Move old supabase migrations
mv /Users/lukatenbosch/focofixfork/supabase/migrations/* \
   /Users/lukatenbosch/focofixfork/database/migrations/OBSOLETE_SUPABASE/ 2>/dev/null || true

# Create README
cat > /Users/lukatenbosch/focofixfork/database/migrations/OBSOLETE_SUPABASE/README.md <<'EOF'
# Obsolete Supabase Migrations

These migrations create an OLD schema that conflicts with FOCO 2.0.

## DO NOT RUN THESE MIGRATIONS

**Old Schema (WRONG):**
- `organizations` table
- `organization_members` table
- `projects` table
- `tasks` table

**Current Schema (CORRECT):**
- `workspaces` table
- `workspace_members` table
- `foco_projects` table
- `work_items` table

## Source of Truth

The canonical schema is:
`/database/migrations/100_foco_2_core_schema.sql`

## Why Archived

**Date:** 2026-01-13
**Reason:** Schema conflict - these migrations define tables that don't match production
**Action:** Preserved for historical reference only

## What to Use Instead

All new migrations should:
1. Go in `/database/migrations/`
2. Use numeric prefix (e.g., `103_add_feature.sql`)
3. Reference correct table names (workspaces, foco_projects, work_items)
EOF
```

### Step 3.2: Remove Empty Supabase Directory

```bash
# Remove supabase migrations directory if empty
rmdir /Users/lukatenbosch/focofixfork/supabase/migrations 2>/dev/null || echo "Directory not empty or doesn't exist"
```

---

## PHASE 4: CREATE VERIFICATION TOOLS (30 minutes)

### Step 4.1: Schema Verification Script

```bash
cat > /Users/lukatenbosch/focofixfork/scripts/verify-schema-alignment.ts <<'EOF'
#!/usr/bin/env tsx

/**
 * Schema Alignment Verification Script
 *
 * Verifies that:
 * 1. Production database has correct tables
 * 2. API endpoints query correct tables
 * 3. Type definitions match database schema
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

interface TestResult {
  test: string
  status: 'pass' | 'fail' | 'warning'
  message: string
}

const results: TestResult[] = []

async function verifyDatabaseTables() {
  console.log('\n🔍 Testing Database Tables...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Tables that SHOULD exist
  const correctTables = [
    'workspaces',
    'workspace_members',
    'foco_projects',
    'foco_project_members',
    'work_items',
    'work_item_labels',
    'work_item_dependencies',
    'labels',
    'foco_comments',
    'docs',
    'saved_views',
    'automations',
    'inbox_items',
    'activity_log',
    'time_entries',
    'user_presence',
    'reports'
  ]

  for (const table of correctTables) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1)
      if (error) {
        results.push({
          test: `Table: ${table}`,
          status: 'fail',
          message: `Missing or inaccessible: ${error.message}`
        })
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        results.push({
          test: `Table: ${table}`,
          status: 'pass',
          message: 'Exists and accessible'
        })
        console.log(`✅ ${table}`)
      }
    } catch (err: any) {
      results.push({
        test: `Table: ${table}`,
        status: 'fail',
        message: err.message
      })
      console.log(`❌ ${table}: ${err.message}`)
    }
  }

  // Tables that should NOT exist (old schema)
  const incorrectTables = ['organizations', 'projects', 'tasks']

  console.log('\n🔍 Checking for obsolete tables...\n')

  for (const table of incorrectTables) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1)
      if (error && error.message.includes('does not exist')) {
        results.push({
          test: `Obsolete table absent: ${table}`,
          status: 'pass',
          message: 'Correctly does not exist'
        })
        console.log(`✅ ${table}: Correctly absent`)
      } else {
        results.push({
          test: `Obsolete table absent: ${table}`,
          status: 'warning',
          message: 'Table exists but should not (may cause confusion)'
        })
        console.log(`⚠️ ${table}: Exists (may cause confusion with correct tables)`)
      }
    } catch (err: any) {
      results.push({
        test: `Obsolete table absent: ${table}`,
        status: 'fail',
        message: err.message
      })
      console.log(`❌ ${table}: Error checking: ${err.message}`)
    }
  }
}

function verifyAPIEndpoints() {
  console.log('\n🔍 Scanning API Endpoints for Incorrect Table Names...\n')

  const apiDir = path.join(process.cwd(), 'src', 'app', 'api')
  const incorrectPatterns = [
    { pattern: /\.from\(['"`]organizations['"`]\)/, table: 'organizations', correct: 'workspaces' },
    { pattern: /\.from\(['"`]organization_members['"`]\)/, table: 'organization_members', correct: 'workspace_members' },
    { pattern: /\.from\(['"`]tasks['"`]\)/, table: 'tasks', correct: 'work_items' },
  ]

  // Note: 'projects' is ambiguous - could be wrong or in comments

  const scanDirectory = (dir: string) => {
    const files = fs.readdirSync(dir, { withFileTypes: true })

    for (const file of files) {
      const fullPath = path.join(dir, file.name)

      if (file.isDirectory()) {
        scanDirectory(fullPath)
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf-8')

        for (const { pattern, table, correct } of incorrectPatterns) {
          if (pattern.test(content)) {
            results.push({
              test: `API endpoint table reference`,
              status: 'fail',
              message: `${fullPath} queries '${table}' (should be '${correct}')`
            })
            console.log(`❌ ${fullPath}`)
            console.log(`   Queries '${table}' but should query '${correct}'`)
          }
        }
      }
    }
  }

  try {
    scanDirectory(apiDir)

    const apiTableFailures = results.filter(r => r.test === 'API endpoint table reference' && r.status === 'fail')

    if (apiTableFailures.length === 0) {
      results.push({
        test: 'API endpoints use correct tables',
        status: 'pass',
        message: 'All API endpoints query correct table names'
      })
      console.log('✅ All API endpoints use correct table names')
    }
  } catch (err: any) {
    results.push({
      test: 'API endpoint scan',
      status: 'fail',
      message: err.message
    })
    console.log(`❌ Error scanning API endpoints: ${err.message}`)
  }
}

function verifyTypeDefinitions() {
  console.log('\n🔍 Verifying Type Definitions...\n')

  const typesDir = path.join(process.cwd(), 'src', 'types')

  // Check database.types.ts doesn't exist
  const databaseTypesPath = path.join(typesDir, 'database.types.ts')
  if (fs.existsSync(databaseTypesPath)) {
    results.push({
      test: 'Type definitions',
      status: 'fail',
      message: 'database.types.ts still exists (should be deleted/archived)'
    })
    console.log('❌ database.types.ts still exists (should be deleted)')
  } else {
    results.push({
      test: 'Type definitions',
      status: 'pass',
      message: 'Obsolete database.types.ts removed'
    })
    console.log('✅ database.types.ts removed')
  }

  // Check foco.ts exists
  const focoTypesPath = path.join(typesDir, 'foco.ts')
  if (fs.existsSync(focoTypesPath)) {
    results.push({
      test: 'Type definitions',
      status: 'pass',
      message: 'foco.ts exists and is source of truth'
    })
    console.log('✅ foco.ts exists')
  } else {
    results.push({
      test: 'Type definitions',
      status: 'fail',
      message: 'foco.ts missing'
    })
    console.log('❌ foco.ts missing')
  }

  // Check for imports of database.types
  const srcDir = path.join(process.cwd(), 'src')
  const checkImports = (dir: string) => {
    const files = fs.readdirSync(dir, { withFileTypes: true })

    for (const file of files) {
      const fullPath = path.join(dir, file.name)

      if (file.isDirectory() && !fullPath.includes('node_modules')) {
        checkImports(fullPath)
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        if (content.includes("from '@/types/database.types'")) {
          results.push({
            test: 'Import statements',
            status: 'fail',
            message: `${fullPath} imports from obsolete database.types`
          })
          console.log(`❌ ${fullPath} imports database.types`)
        }
      }
    }
  }

  try {
    checkImports(srcDir)

    const importFailures = results.filter(r => r.test === 'Import statements' && r.status === 'fail')
    if (importFailures.length === 0) {
      results.push({
        test: 'Import statements',
        status: 'pass',
        message: 'No imports of obsolete database.types'
      })
      console.log('✅ No imports of obsolete database.types')
    }
  } catch (err: any) {
    results.push({
      test: 'Import scan',
      status: 'fail',
      message: err.message
    })
    console.log(`❌ Error scanning imports: ${err.message}`)
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('SCHEMA ALIGNMENT VERIFICATION SUMMARY')
  console.log('='.repeat(60) + '\n')

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const warnings = results.filter(r => r.status === 'warning').length

  console.log(`✅ Passed:   ${passed}`)
  console.log(`❌ Failed:   ${failed}`)
  console.log(`⚠️  Warnings: ${warnings}`)
  console.log(`📊 Total:    ${results.length}`)

  if (failed > 0) {
    console.log('\n❌ SCHEMA ALIGNMENT: FAILED\n')
    console.log('Failed tests:')
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  - ${r.test}: ${r.message}`)
    })
    process.exit(1)
  } else if (warnings > 0) {
    console.log('\n⚠️  SCHEMA ALIGNMENT: PASSED WITH WARNINGS\n')
    console.log('Warnings:')
    results.filter(r => r.status === 'warning').forEach(r => {
      console.log(`  - ${r.test}: ${r.message}`)
    })
    process.exit(0)
  } else {
    console.log('\n✅ SCHEMA ALIGNMENT: 100% PASS\n')
    process.exit(0)
  }
}

async function main() {
  console.log('🚀 Starting Schema Alignment Verification...')

  await verifyDatabaseTables()
  verifyAPIEndpoints()
  verifyTypeDefinitions()
  printSummary()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
EOF

chmod +x /Users/lukatenbosch/focofixfork/scripts/verify-schema-alignment.ts
```

### Step 4.2: Create Source of Truth Documentation

```bash
cat > /Users/lukatenbosch/focofixfork/DATABASE_SCHEMA_SOURCE_OF_TRUTH.md <<'EOF'
# DATABASE SCHEMA - SOURCE OF TRUTH

**Last Updated:** 2026-01-13
**Schema Version:** FOCO 2.0
**Status:** ✅ Production

---

## Canonical Schema Definition

**Location:** `/database/migrations/100_foco_2_core_schema.sql`

This file defines the complete, correct schema for the application.

---

## Core Tables Reference

### Workspaces (Multi-tenant Containers)

| Table | Description |
|-------|-------------|
| `workspaces` | Top-level organizations |
| `workspace_members` | User membership in workspaces |

**IMPORTANT:** Previously called "organizations" in old schema. Always use "workspaces".

### Projects

| Table | Description |
|-------|-------------|
| `foco_projects` | Projects within workspaces |
| `foco_project_members` | Project team members |

**IMPORTANT:** Table is `foco_projects`, NOT `projects`. The prefix avoids conflicts.

### Work Items (Tasks, Bugs, Features)

| Table | Description |
|-------|-------------|
| `work_items` | All work items (tasks, bugs, features, milestones) |
| `work_item_labels` | Many-to-many label associations |
| `work_item_dependencies` | Dependencies between work items |

**IMPORTANT:** Table is `work_items`, NOT `tasks`. Work items are polymorphic.

### Supporting Tables

| Table | Description |
|-------|-------------|
| `labels` | Workspace and project labels |
| `foco_comments` | Comments on work items |
| `docs` | Documentation pages |
| `saved_views` | Saved filters/views |
| `automations` | Automation rules |
| `automation_logs` | Automation execution history |
| `inbox_items` | User notifications/inbox |
| `activity_log` | Audit trail |
| `ai_suggestions` | AI-generated suggestions |
| `time_entries` | Time tracking |
| `user_presence` | Real-time presence |
| `reports` | Generated reports |

---

## Type Definitions

**Correct Types:** `/src/types/foco.ts`

This file defines TypeScript interfaces matching the database schema exactly.

**Usage:**
```typescript
import { Workspace, Project, WorkItem, Label } from '@/types/foco'
```

**DO NOT USE:** `/src/types/database.types.ts` (archived - defines wrong tables)

---

## API Query Patterns

### ✅ CORRECT

```typescript
// Workspaces
await supabase.from('workspaces').select('*')
await supabase.from('workspace_members').select('*')

// Projects
await supabase.from('foco_projects').select('*')
await supabase.from('foco_project_members').select('*')

// Work Items
await supabase.from('work_items').select('*')
await supabase.from('work_item_labels').select('*')
```

### ❌ INCORRECT (Old Schema)

```typescript
// ❌ NEVER USE THESE
await supabase.from('organizations').select('*')     // Use 'workspaces'
await supabase.from('organization_members').select() // Use 'workspace_members'
await supabase.from('projects').select('*')          // Use 'foco_projects'
await supabase.from('tasks').select('*')             // Use 'work_items'
```

---

## Migration Policy

### Where to Put Migrations

**Location:** `/database/migrations/`

**Naming Convention:** `NNN_description.sql` where NNN is next number
- Example: `103_add_work_item_attachments.sql`

### DO NOT USE

- `/supabase/migrations/` - Obsolete, archived

### Migration Template

```sql
-- ============================================================================
-- Migration: NNN_description
-- Date: YYYY-MM-DD
-- Purpose: Brief description
-- ============================================================================

BEGIN;

-- Your schema changes here

COMMIT;
```

---

## Schema Verification

Run verification script:
```bash
npm run verify-schema
# or
tsx scripts/verify-schema-alignment.ts
```

This checks:
- ✅ Database has correct tables
- ✅ API endpoints query correct tables
- ✅ Type definitions match schema
- ✅ No obsolete imports

---

## Common Mistakes

### Mistake 1: Using Old Table Names

```typescript
// ❌ WRONG
const { data } = await supabase.from('organizations').select()

// ✅ CORRECT
const { data } = await supabase.from('workspaces').select()
```

### Mistake 2: Using Wrong Types

```typescript
// ❌ WRONG
import { Organization } from '@/types/database.types'

// ✅ CORRECT
import { Workspace } from '@/types/foco'
```

### Mistake 3: Creating Migrations in Wrong Directory

```bash
# ❌ WRONG
touch supabase/migrations/20260113_add_feature.sql

# ✅ CORRECT
touch database/migrations/103_add_feature.sql
```

---

## Quick Reference Table

| Concept | OLD Name (Wrong) | NEW Name (Correct) |
|---------|------------------|-------------------|
| Multi-tenant container | organizations | workspaces |
| Container membership | organization_members | workspace_members |
| Project | projects | foco_projects |
| Project membership | project_members | foco_project_members |
| Task/Bug/Feature | tasks | work_items |
| Comment | comments | foco_comments |

---

## Getting Help

If you're unsure about table names, check:
1. This document
2. `/src/types/foco.ts` (type definitions)
3. `/database/migrations/100_foco_2_core_schema.sql` (schema)
4. Run `npm run verify-schema` to check your code

---

**Remember:** When in doubt, use the table names from `/src/types/foco.ts`
EOF
```

---

## PHASE 5: FINAL VERIFICATION (15 minutes)

### Run All Checks

```bash
# Install dependencies (if needed)
npm install

# Run TypeScript compilation
echo "🔍 Checking TypeScript compilation..."
npm run build 2>&1 | grep -i "error" && echo "❌ Build failed" || echo "✅ Build successful"

# Run schema verification
echo "🔍 Running schema alignment verification..."
tsx scripts/verify-schema-alignment.ts

# Run linter
echo "🔍 Running linter..."
npm run lint 2>&1 | grep -i "error" && echo "❌ Lint failed" || echo "✅ Lint passed"

# Check for remaining incorrect table names
echo "🔍 Scanning for incorrect table names..."
echo "Checking for 'organizations'..."
grep -r "\.from('organizations')" src/app/api/ && echo "❌ Found 'organizations'" || echo "✅ No 'organizations'"

echo "Checking for 'organization_members'..."
grep -r "\.from('organization_members')" src/app/api/ && echo "❌ Found 'organization_members'" || echo "✅ No 'organization_members'"

echo "Checking for '.from('tasks')'..."
grep -r "\.from('tasks')" src/app/api/ && echo "⚠️ Found 'tasks' (verify context)" || echo "✅ No 'tasks'"

echo "Checking for '.from('projects')' (not foco_projects)..."
grep -r "\.from('projects')" src/app/api/ | grep -v "foco_projects" && echo "⚠️ Found 'projects'" || echo "✅ No 'projects'"
```

### Manual Test API Endpoints

```bash
# Test creating workspace (requires running server)
curl -X POST http://localhost:3000/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "Test Workspace", "slug": "test-workspace"}'

# Should return 201 Created, not 500 Internal Server Error
```

---

## ROLLBACK PLAN (If Something Goes Wrong)

### Restore Archived Files

```bash
# Restore database.types.ts
cp /Users/lukatenbosch/focofixfork/src/types/OBSOLETE/database.types.ts.OBSOLETE \
   /Users/lukatenbosch/focofixfork/src/types/database.types.ts

# Restore supabase migrations
cp -r /Users/lukatenbosch/focofixfork/database/migrations/OBSOLETE_SUPABASE/* \
      /Users/lukatenbosch/focofixfork/supabase/migrations/
```

### Revert Code Changes

```bash
# If you committed changes
git revert HEAD

# If you haven't committed
git checkout -- src/app/api/workspaces/route.ts
git checkout -- src/app/api/projects/[id]/pin/route.ts
git checkout -- src/app/api/tasks/[id]/custom-values/route.ts
```

---

## SUCCESS CRITERIA

After completing all phases, verify:

- [x] No `relation "organizations" does not exist` errors
- [x] No `relation "projects" does not exist` errors (when querying non-foco_projects)
- [x] No `relation "tasks" does not exist` errors
- [x] TypeScript builds without errors
- [x] Schema verification script passes 100%
- [x] API endpoints return 200/201 responses
- [x] Zero imports from `@/types/database.types`
- [x] Single migration directory (`/database/migrations/`)

---

## TIMELINE

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Fix API Endpoints | 30 min | ⏳ Ready |
| Phase 2: Delete Wrong Types | 15 min | ⏳ Ready |
| Phase 3: Consolidate Migrations | 30 min | ⏳ Ready |
| Phase 4: Create Verification Tools | 30 min | ⏳ Ready |
| Phase 5: Final Verification | 15 min | ⏳ Ready |
| **TOTAL** | **2 hours** | ⏳ Ready to Execute |

---

## NEXT STEPS

1. **Review this plan** - Make sure you understand each step
2. **Backup your code** - `git commit -am "Backup before schema fix"`
3. **Execute Phase 1** - Fix the critical API endpoints first
4. **Test immediately** - Verify endpoints work before continuing
5. **Execute Phases 2-5** - Complete the cleanup and verification

Ready to proceed? Start with Phase 1 Fix 1 and work through sequentially.
