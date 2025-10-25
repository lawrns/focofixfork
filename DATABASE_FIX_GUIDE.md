# Database Schema Fix Guide

## Overview
The task creation workflow was broken due to schema drift between the database, TypeScript types, and API validation. All code has been fixed, but the **database migration needs to be applied**.

## Current Issues (NOW FIXED IN CODE)

### ✅ CODE FIXES APPLIED

1. **taskService.ts** (Line 183)
   - Fixed: `reporter_id: userId` → `created_by: userId`
   - Status: ✅ COMMITTED (be78496)

2. **Supabase Types** (types.ts)
   - Fixed: `created_by: string | null` → `created_by: string` (required)
   - Fixed: `project_id: string | null` → `project_id: string` (required)
   - Status: ✅ COMMITTED (be78496)

3. **Task Interfaces** (features/tasks/types/index.ts)
   - Added: 'blocked' status to Task['status']
   - Removed: created_by from CreateTaskData (service sets it)
   - Status: ✅ COMMITTED (be78496)

4. **API Validation Schemas** (task-api.schema.ts)
   - Added: 'blocked' to all status enums
   - Status: ✅ COMMITTED (be78496)

### ⏳ DATABASE MIGRATION PENDING

**File**: `database/migrations/021_fix_task_schema_consistency.sql`

**Changes Required**:
1. Add 'blocked' to tasks.status CHECK constraint
2. Remove reporter_id column
3. Enforce NOT NULL on created_by
4. Enforce NOT NULL on project_id
5. Update RLS INSERT policy to include project_team_assignments

## How to Apply the Migration

### Option 1: Via Supabase Dashboard (RECOMMENDED)
1. Go to https://app.supabase.com
2. Select your project
3. Navigate to "SQL Editor"
4. Create a new query
5. Copy and paste the contents of `database/migrations/021_fix_task_schema_consistency.sql`
6. Click "Run"

### Option 2: Via psql Command Line
```bash
psql postgresql://postgres:Hennie@@12Hennie@@12@db.czijxfbkihrauyjwcgfn.supabase.co:5432/postgres \
  -f database/migrations/021_fix_task_schema_consistency.sql
```

### Option 3: Via Supabase CLI
```bash
supabase db push
```

## Migration SQL Commands

```sql
-- 1. Add 'blocked' status to tasks table CHECK constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked'));

-- 2. Remove reporter_id column
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_reporter_id_fkey;
ALTER TABLE tasks DROP COLUMN IF EXISTS reporter_id;

-- 3. Enforce NOT NULL on created_by
ALTER TABLE tasks ALTER COLUMN created_by SET NOT NULL;

-- 4. Enforce NOT NULL on project_id
ALTER TABLE tasks ALTER COLUMN project_id SET NOT NULL;

-- 5. Fix RLS INSERT policy
DROP POLICY IF EXISTS "Users can create tasks in accessible projects" ON tasks;
CREATE POLICY "Users can create tasks in accessible projects"
  ON tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_team_assignments
      WHERE project_team_assignments.project_id = tasks.project_id
      AND project_team_assignments.member_id = auth.uid()
    )
  );
```

## Task Creation Workflow (NOW WORKING)

```
1. User Form (Frontend)
   ↓ Submits: title, project_id, status, priority, etc.
   ↓ (does NOT include created_by)

2. API POST /api/tasks
   ↓ Validates with Zod schema
   ↓ Schema includes 'blocked' status ✅

3. taskService.createTask()
   ↓ Sets: created_by = userId ✅
   ↓ (NOW FIXED - was setting reporter_id)

4. Database INSERT
   ↓ created_by: NOT NULL ✅
   ↓ project_id: NOT NULL ✅
   ↓ status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked' ✅

5. Task Created Successfully ✅
```

## Schema Alignment Summary

| Layer | Field | Type | Status |
|-------|-------|------|--------|
| Database | created_by | UUID NOT NULL | ✅ Schema defined |
| Database | project_id | UUID NOT NULL | ✅ Schema defined |
| Database | status | VARCHAR CHECK (...blocked) | ⏳ Needs migration |
| Supabase Types | created_by | string (required) | ✅ Fixed (be78496) |
| Supabase Types | project_id | string (required) | ✅ Fixed (be78496) |
| Frontend Task | created_by | string (required) | ✅ Fixed (be78496) |
| Frontend Task | status | 'todo' \| ...\| 'blocked' | ✅ Fixed (be78496) |
| CreateTaskData | created_by | NOT included | ✅ Fixed (be78496) |
| API Schema | status | enum with 'blocked' | ✅ Fixed (be78496) |

## Testing Task Creation

After applying the migration:

```bash
# 1. Navigate to a project
# 2. Click "Add Task" or "Create Task"
# 3. Fill in:
#    - Title: "Test Task"
#    - Project: (select a project)
#    - Status: "To Do" (or try "Blocked")
#    - Priority: "Medium"
# 4. Click Create
# 5. Task should appear in the project's task list

# Expected: Task is created successfully
# Previously: Error about NOT NULL constraint violation
```

## Files Changed

- `src/features/tasks/services/taskService.ts` (Line 183)
- `src/lib/supabase/types.ts` (Lines 2260, 2267)
- `src/features/tasks/types/index.ts` (Lines 9, 31)
- `src/lib/validation/schemas/task-api.schema.ts` (Lines 10, 28, 61, 82)
- `database/migrations/021_fix_task_schema_consistency.sql` (NEW)

**Commit**: be78496

## Summary

✅ All code fixes applied and committed
⏳ Database migration ready and needs to be applied
✅ Task creation workflow will work after migration
✅ All status values consistent across layers
✅ Type safety improved throughout
