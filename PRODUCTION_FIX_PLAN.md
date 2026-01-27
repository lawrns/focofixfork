# Foco Project Production Fix Plan

## Executive Summary

The Foco project has significant database schema inconsistencies that will cause runtime failures in production. This plan outlines all necessary fixes to make the core task/todo management fully functional.

## Current State Analysis

### Build Status
- ✅ Build passes
- ✅ Lint passes (1 minor warning)
- ⚠️ Some test failures (mostly mocking issues)

### Database Schema Conflicts

The project has multiple table naming conventions in use:

| Entity | Legacy Table | Current Table | Status |
|--------|--------------|---------------|--------|
| Workspace | `organizations` | `workspaces` | ✅ Fixed in most places |
| Workspace | `foco_workspaces` | `workspaces` | ❌ Still used in some files |
| Project | `projects` | `foco_projects` | ✅ Fixed |
| Work Item | `tasks` | `work_items` | ✅ Fixed |
| Work Item | `foco_work_items` | `work_items` | ❌ Used in whatsapp-router.ts |

### Files with Incorrect Table References

#### 1. `foco_workspaces` → `workspaces` (4 occurrences)
- `src/app/api/cursos/check-access/route.ts:35`
- `src/lib/middleware/cursos-access.ts:65`
- `src/lib/services/whatsapp-router.ts:345`
- `src/lib/services/whatsapp-router.ts:442`

#### 2. `foco_work_items` → `work_items` (1 occurrence)
- `src/lib/services/whatsapp-router.ts:525`

#### 3. `organizations` → `workspaces` (7 occurrences)
- `src/lib/database/service.ts:85`
- `src/lib/database/service.ts:100`
- `src/lib/database/service.ts:110`
- `src/lib/database/service.ts:274`
- `src/lib/database/connection.ts:99`
- `src/lib/supabase/test-utils.ts:30`

## Detailed Fix Plan

### Phase 1: Fix Table Name References

#### Fix 1.1: WhatsApp Router (`src/lib/services/whatsapp-router.ts`)

**Line 345:** Change `foco_workspaces` → `workspaces`
```typescript
// BEFORE
const { data: workspace } = await this.supabase
  .from('foco_workspaces')
  .select('name')
  .eq('id', session.workspace_id)
  .single()

// AFTER
const { data: workspace } = await this.supabase
  .from('workspaces')
  .select('name')
  .eq('id', session.workspace_id)
  .single()
```

**Line 442:** Change `foco_workspaces` → `workspaces`
```typescript
// BEFORE
const { data: workspaces } = await this.supabase
  .from('foco_workspaces')
  .select('id, name')
  .ilike('name', `%${workspaceName}%`)
  .limit(5)

// AFTER
const { data: workspaces } = await this.supabase
  .from('workspaces')
  .select('id, name')
  .ilike('name', `%${workspaceName}%`)
  .limit(5)
```

**Line 525:** Change `foco_work_items` → `work_items`
```typescript
// BEFORE
const { data: tasks } = await this.supabase
  .from('foco_work_items')
  .select('id, title, status, priority')
  .eq('project_id', context.session.project_id)
  .order('created_at', { ascending: false })
  .limit(10)

// AFTER
const { data: tasks } = await this.supabase
  .from('work_items')
  .select('id, title, status, priority')
  .eq('project_id', context.session.project_id)
  .order('created_at', { ascending: false })
  .limit(10)
```

#### Fix 1.2: Cursos Check Access (`src/app/api/cursos/check-access/route.ts`)

**Line 35:** Change `foco_workspaces` → `workspaces`
```typescript
// BEFORE
const { data: workspace } = await supabase
  .from('foco_workspaces')
  .select('id, slug')
  .eq('slug', slug)
  .single()

// AFTER
const { data: workspace } = await supabase
  .from('workspaces')
  .select('id, slug')
  .eq('slug', slug)
  .single()
```

#### Fix 1.3: Cursos Access Middleware (`src/lib/middleware/cursos-access.ts`)

**Line 65:** Change `foco_workspaces` → `workspaces`
```typescript
// BEFORE
const { data: workspace } = await supabase
  .from('foco_workspaces')
  .select('id')
  .eq('slug', workspaceSlug)
  .single()

// AFTER
const { data: workspace } = await supabase
  .from('workspaces')
  .select('id')
  .eq('slug', workspaceSlug)
  .single()
```

#### Fix 1.4: Database Service (`src/lib/database/service.ts`)

**Lines 85, 100, 110, 274:** Change all `organizations` → `workspaces`

```typescript
// Line 85
// BEFORE
let query = client.from('organizations').select('*')
// AFTER
let query = client.from('workspaces').select('*')

// Line 100
// BEFORE
return await client.from('organizations').select('*').eq('id', id).single()
// AFTER
return await client.from('workspaces').select('*').eq('id', id).single()

// Line 110
// BEFORE
return await client.from('organizations').insert(data as any).select().single()
// AFTER
return await client.from('workspaces').insert(data as any).select().single()

// Line 274
// BEFORE
const { data, error } = await client.from('organizations').select('count').limit(1)
// AFTER
const { data, error } = await client.from('workspaces').select('count').limit(1)
```

#### Fix 1.5: Database Connection (`src/lib/database/connection.ts`)

**Line 99:** Change `organizations` → `workspaces`
```typescript
// BEFORE
const { data, error } = await (client as any).from('organizations').select('count').limit(1)

// AFTER
const { data, error } = await (client as any).from('workspaces').select('count').limit(1)
```

#### Fix 1.6: Supabase Test Utils (`src/lib/supabase/test-utils.ts`)

**Line 30:** Change `organizations` → `workspaces`
```typescript
// BEFORE
const { data } = await supabase.from('organizations').select('*').limit(1)

// AFTER
const { data } = await supabase.from('workspaces').select('*').limit(1)
```

### Phase 2: Verify Repository Alignment

The following repositories use the CORRECT table names and should NOT be modified:

- ✅ `src/lib/repositories/workspace-repository.ts` → uses `workspaces`
- ✅ `src/lib/repositories/project-repository.ts` → uses `foco_projects`
- ✅ `src/lib/repositories/task-repository.ts` → uses `work_items`
- ✅ `src/lib/repositories/organization-repository.ts` → uses `workspaces`

### Phase 3: Database Migration Verification

Ensure the following tables exist in production:

1. `workspaces` - Core workspace/organization table
2. `workspace_members` - Workspace membership
3. `foco_projects` - Project table
4. `work_items` - Tasks and work items table
5. `work_item_dependencies` - Task dependencies

### Phase 4: RLS Policy Verification

Key RLS policies must be enabled:

1. **workspaces**: Users can view workspaces they are members of
2. **workspace_members**: Users can view members of their workspaces
3. **foco_projects**: Users can view projects in their workspaces
4. **work_items**: Users can view work items in their workspaces

## Implementation Script

```bash
#!/bin/bash
# Run these commands to apply all fixes

# Fix 1: WhatsApp Router
sed -i "s/.from('foco_workspaces')/.from('workspaces')/g" src/lib/services/whatsapp-router.ts
sed -i "s/.from('foco_work_items')/.from('work_items')/g" src/lib/services/whatsapp-router.ts

# Fix 2: Cursos routes
sed -i "s/.from('foco_workspaces')/.from('workspaces')/g" src/app/api/cursos/check-access/route.ts
sed -i "s/.from('foco_workspaces')/.from('workspaces')/g" src/lib/middleware/cursos-access.ts

# Fix 3: Database service and connection
sed -i "s/.from('organizations')/.from('workspaces')/g" src/lib/database/service.ts
sed -i "s/.from('organizations')/.from('workspaces')/g" src/lib/database/connection.ts
sed -i "s/.from('organizations')/.from('workspaces')/g" src/lib/supabase/test-utils.ts

echo "All table name fixes applied!"
```

## Testing Checklist

After applying fixes, verify:

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] API routes respond correctly:
  - [ ] GET /api/workspaces
  - [ ] GET /api/projects
  - [ ] GET /api/tasks
  - [ ] GET /api/work-items/[id]/dependencies
- [ ] WhatsApp webhook works (if configured)
- [ ] Database queries return expected results

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wrong table name assumption | High | Verify actual table names in production DB before applying |
| Missing table in production | High | Run migration to create missing tables first |
| Data inconsistency | Medium | Ensure data migration completed before code deployment |

## Post-Deployment Verification

1. Check application logs for database errors
2. Verify core user flows:
   - Create workspace
   - Create project
   - Create task
   - Assign task
   - View tasks
3. Monitor error tracking for 404/500 errors
