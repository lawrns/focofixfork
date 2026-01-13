# Project API Architecture Analysis Report

**Date**: 2026-01-13
**Database**: Production Supabase PostgreSQL
**Scope**: /api/projects/* routes and slug/ID handling

---

## Executive Summary

The project API architecture has **critical bugs and inconsistencies** that are causing broken functionality:

1. **Pin API uses wrong table name** - references non-existent `user_project_pins` table
2. **Slug vs ID inconsistency** - multiple conflicting patterns across frontend/backend
3. **Missing workspace context** - slug lookups don't filter by workspace
4. **Schema mismatch** - pin API uses `projects` table instead of `foco_projects`

**Impact**: Pin functionality is broken, potential slug conflicts across workspaces, inconsistent navigation.

---

## Database Schema Analysis

### Production Table: `foco_projects`

```sql
Columns:
- id: uuid (PRIMARY KEY)
- workspace_id: uuid (NOT NULL)
- name: varchar(255) (NOT NULL)
- slug: varchar(100) (NOT NULL)
- description: text
- brief: text
- color: varchar(7) DEFAULT '#6366F1'
- icon: varchar(50) DEFAULT 'folder'
- status: varchar(50) DEFAULT 'active'
- owner_id: uuid
- default_status: work_item_status DEFAULT 'next'
- settings: jsonb
- is_pinned: boolean DEFAULT false
- archived_at: timestamptz
- created_at: timestamptz DEFAULT now()
- updated_at: timestamptz DEFAULT now()

Unique Constraint:
- foco_projects_workspace_id_slug_key (workspace_id, slug)

Indexes:
- idx_foco_projects_slug (workspace_id, slug)
- idx_foco_projects_workspace (workspace_id)
- idx_foco_projects_owner (owner_id)
```

### Production Data Sample

```
id                                    | name       | slug       | workspace_id
--------------------------------------+------------+------------+--------------------------------------
33d467da-fff5-4fb8-a1da-64c4c23da265 | Campfire   | campfire   | d7de1d3e-cae6-4210-ae4e-775fb84ddb7d
6d37f7bd-a0f5-4525-9493-a93ae5dce65b | Locomotion | locomotion | d7de1d3e-cae6-4210-ae4e-775fb84ddb7d
1f9bbc67-b13f-40ed-b955-0dfe1afb99da | Mintory    | mintory    | d7de1d3e-cae6-4210-ae4e-775fb84ddb7d
```

**Key Observations**:
- Slugs are simple, lowercase, single words
- Unique constraint is at **workspace level** (workspace_id + slug)
- `is_pinned` column exists directly on `foco_projects` table

---

## API Route Inventory

### Existing Routes

| Route | Methods | Purpose | Status |
|-------|---------|---------|--------|
| `/api/projects` | GET, POST | List/create projects | ✅ Working |
| `/api/projects/[id]` | GET, PATCH, DELETE | CRUD single project | ⚠️ Partial - ID/slug fallback |
| `/api/projects/[id]/custom-fields` | GET, POST | Manage custom fields | ✅ Working |
| `/api/projects/[id]/pin` | POST, DELETE | Pin/unpin project | ❌ **BROKEN** |
| `/api/projects/bulk` | POST | Bulk operations | ✅ Working |
| `/api/projects/check-slug` | POST | Validate slug availability | ✅ Working |
| `/api/projects/from-template/[templateId]` | POST | Create from template | ✅ Working |

### Missing Routes

- `/api/projects/stats` - Referenced in `projectClientService.ts` but **doesn't exist**

---

## Critical Bug #1: Broken Pin API

**File**: `/src/app/api/projects/[id]/pin/route.ts`

### Issues

1. **Wrong table reference**: Uses `projects` instead of `foco_projects`
   ```typescript
   // Lines 43-47, 156-160
   const { data: project, error: projectError } = await supabase
     .from('projects')  // ❌ Should be 'foco_projects'
     .select('organization_id')  // ❌ Should be 'workspace_id'
     .eq('id', projectId)
     .single()
   ```

2. **Non-existent table**: References `user_project_pins` which doesn't exist
   ```typescript
   // Lines 72-79, 185-189
   const { data, error } = await supabase
     .from('user_project_pins')  // ❌ Table doesn't exist
     .insert({ user_id: user.id, project_id: projectId })
   ```

3. **Wrong authorization check**: Uses `organization_members` instead of `workspace_members`
   ```typescript
   // Lines 56-62, 169-175
   const { data: orgMember, error: memberError } = await supabase
     .from('organization_members')  // ❌ Should be 'workspace_members'
     .select('id')
     .eq('organization_id', project.organization_id)  // ❌ Should use workspace_id
   ```

4. **Uses old auth pattern**: Doesn't use `getAuthUser()` helper (inconsistent with other routes)

### Correct Implementation

The `is_pinned` column already exists on `foco_projects` table. The pin API should:
- Use PATCH to update `is_pinned` field directly on `foco_projects`
- Check workspace membership via `workspace_members` table
- Use `getAuthUser()` helper for consistency

---

## Critical Bug #2: Slug vs ID Inconsistency

### Frontend Usage Patterns

**Inconsistent Link Patterns**:

1. **Uses SLUG** (11 locations):
   - `src/app/projects/ProjectsPageClient.tsx` (lines 119, 277)
   - `src/app/projects/[slug]/page.tsx` (page route)
   - `src/features/projects/components/project-card.tsx` (lines 193, 234)
   - `src/components/layout/Sidebar.tsx` (line 227)
   - `src/app/search/SearchPageClient.tsx` (line 505)
   - `src/app/tasks/[id]/page.tsx` (lines 357, 453)
   - `src/components/foco/layout/left-rail.tsx` (line 178)

2. **Uses ID** (1 location):
   - `src/features/projects/components/project-card.tsx` (line 302) - "View Project" button

### Backend Handling

**`/api/projects/[id]` GET endpoint** (lines 17-36):
```typescript
// Try to find by ID first, then by slug
let { data, error: queryError } = await supabase
  .from('foco_projects')
  .select('*')
  .eq('id', id)
  .single()

if (queryError) {
  // Try by slug
  const { data: slugData, error: slugError } = await supabase
    .from('foco_projects')
    .select('*')
    .eq('slug', id)
    .single()
```

### Problem

**No workspace filtering on slug lookup!**

The fallback slug query doesn't filter by `workspace_id`, which can cause:
- **Slug collisions across workspaces**: Different workspaces can have projects with the same slug
- **Unauthorized access**: User could access projects from other workspaces if they guess the slug
- **Data leak**: Returns wrong project if slug exists in multiple workspaces

---

## Critical Bug #3: Missing Workspace Context

### Issue

The GET endpoint for `/api/projects/[id]` attempts slug fallback but doesn't consider workspace context:

```typescript
// ❌ VULNERABLE CODE - No workspace filtering
const { data: slugData, error: slugError } = await supabase
  .from('foco_projects')
  .select('*')
  .eq('slug', id)
  .single()
```

### Security Implications

1. **Cross-workspace data access**: User can access projects from workspaces they don't belong to
2. **Slug confusion**: If two workspaces have projects with slug "website", random one is returned
3. **RLS bypass potential**: While RLS policies exist, the query doesn't explicitly filter by workspace

### Correct Implementation

Should either:
1. **Option A**: Remove slug fallback entirely, only support UUID lookups via API
2. **Option B**: Require workspace context in query params
   ```typescript
   const workspaceId = searchParams.get('workspace_id')

   const { data: slugData } = await supabase
     .from('foco_projects')
     .select('*')
     .eq('slug', id)
     .eq('workspace_id', workspaceId)  // ✅ Filter by workspace
     .single()
   ```

---

## Critical Bug #4: Missing Stats API

**File**: `src/features/projects/services/projectClientService.ts` (lines 263-294)

The `getProjectStats()` method calls `/api/projects/stats` which **doesn't exist**.

```typescript
const response = await apiGet('/api/projects/stats')  // ❌ 404 - Route doesn't exist
```

**Impact**: Any code calling `ProjectClientService.getProjectStats()` will fail with 404.

---

## Architecture Inconsistencies

### 1. Authentication Pattern Mismatch

| Route | Auth Pattern |
|-------|--------------|
| `/api/projects/route.ts` | ✅ `getAuthUser(req)` |
| `/api/projects/[id]/route.ts` | ✅ `getAuthUser(req)` |
| `/api/projects/[id]/custom-fields/route.ts` | ✅ `getAuthUser(req)` |
| `/api/projects/[id]/pin/route.ts` | ❌ Manual `createServerClient + getUser()` |
| `/api/projects/bulk/route.ts` | ✅ `getAuthUser(req)` |
| `/api/projects/check-slug/route.ts` | ✅ `getAuthUser(req)` |

**Pin API is the only outlier** - should use `getAuthUser()` helper.

### 2. Parameter Handling Inconsistency

| Route | Params Handling |
|-------|----------------|
| `/api/projects/[id]/route.ts` | ✅ `const { id } = await params` (Next.js 15 async) |
| `/api/projects/[id]/custom-fields/route.ts` | ✅ `const { id: projectId } = await params` |
| `/api/projects/[id]/pin/route.ts` | ❌ `const projectId = params.id` (sync, old pattern) |
| `/api/projects/from-template/[templateId]/route.ts` | ❌ `params: { templateId: string }` (sync) |

**Next.js 15 requires async params** - some routes haven't been updated.

### 3. Table Name Inconsistency

Pin API uses:
- `projects` table (doesn't match schema)
- `organization_id` field (should be `workspace_id`)
- `organization_members` table (should be `workspace_members`)

All other routes correctly use:
- `foco_projects` table
- `workspace_id` field
- `workspace_members` for authorization

---

## Frontend Page Routes

### `/app/projects/[slug]/page.tsx`

**Current Implementation**:
- Page route accepts `[slug]` parameter
- Queries database using slug: `.eq('slug', slug)`
- **No workspace filtering** in the query (line 254)

**Issues**:
1. Directly queries database from client component (not using API)
2. No workspace context validation
3. Could return wrong project if slug exists in multiple workspaces

**Correct Approach**:
Should call `/api/projects/[slug]` which validates workspace membership.

---

## URL Pattern Analysis

### Current Routing Strategy

The application uses **slug-based URLs** for user-facing navigation:
- ✅ SEO-friendly
- ✅ Human-readable
- ✅ Bookmarkable

**Examples from production**:
- `/projects/campfire`
- `/projects/locomotion`
- `/projects/mintory`

### API Parameter Strategy

The API uses **ID-based parameters** with fallback:
- Primary: UUID lookup (`eq('id', id)`)
- Fallback: Slug lookup (`eq('slug', id)`)

**Problem**: Fallback is unsafe without workspace filtering.

---

## Recommendations

### Priority 1: Critical Security Fixes

1. **Fix PIN API** (`/api/projects/[id]/pin/route.ts`):
   ```typescript
   // Replace entire implementation with:
   export async function PATCH(
     req: NextRequest,
     { params }: { params: Promise<{ id: string }> }
   ) {
     const { user, supabase, error } = await getAuthUser(req)
     if (error || !user) {
       return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
     }

     const { id } = await params
     const body = await req.json()
     const { is_pinned } = body

     // Update is_pinned field directly on foco_projects
     const { data, error: updateError } = await supabase
       .from('foco_projects')
       .update({ is_pinned })
       .eq('id', id)
       .select()
       .single()

     if (updateError) {
       return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
     }

     return NextResponse.json({ success: true, data })
   }
   ```

2. **Add workspace filtering to slug fallback**:
   ```typescript
   // In /api/projects/[id]/route.ts GET method
   if (queryError) {
     // Extract workspace from user's context or require it as query param
     const { searchParams } = new URL(req.url)
     const workspaceId = searchParams.get('workspace_id')

     if (!workspaceId) {
       return NextResponse.json(
         { success: false, error: 'workspace_id required for slug lookup' },
         { status: 400 }
       )
     }

     const { data: slugData, error: slugError } = await supabase
       .from('foco_projects')
       .select('*')
       .eq('slug', id)
       .eq('workspace_id', workspaceId)  // ✅ Add workspace filter
       .single()
   }
   ```

3. **Create missing stats API** (`/api/projects/stats/route.ts`):
   ```typescript
   export async function GET(req: NextRequest) {
     const { user, supabase, error } = await getAuthUser(req)
     if (error || !user) {
       return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
     }

     const { searchParams } = new URL(req.url)
     const workspaceId = searchParams.get('workspace_id')

     if (!workspaceId) {
       return NextResponse.json({ success: false, error: 'workspace_id required' }, { status: 400 })
     }

     // Query project stats
     const { data: projects } = await supabase
       .from('foco_projects')
       .select('id, status')
       .eq('workspace_id', workspaceId)
       .is('archived_at', null)

     const stats = {
       total: projects?.length || 0,
       active: projects?.filter(p => p.status === 'active').length || 0,
       completed: projects?.filter(p => p.status === 'completed').length || 0,
       overdue: 0  // Implement based on due_date logic
     }

     return NextResponse.json({ success: true, data: stats })
   }
   ```

### Priority 2: Consistency Improvements

4. **Standardize async params handling**:
   - Update `/api/projects/from-template/[templateId]/route.ts` to use async params
   - Remove legacy sync params pattern

5. **Decide on ID vs Slug API strategy**:

   **Option A: ID-only APIs** (Recommended)
   - Remove slug fallback from `/api/projects/[id]`
   - Frontend always passes UUID to API
   - Page route `/projects/[slug]` resolves slug to ID first, then calls API

   **Option B: Separate endpoints**
   - `/api/projects/[id]` - ID only
   - `/api/projects/by-slug/[slug]` - Slug only (with workspace param)
   - Explicit separation prevents ambiguity

6. **Fix frontend to use API consistently**:
   - Update `/app/projects/[slug]/page.tsx` to call API instead of direct DB query
   - Ensure all frontend calls include workspace context

### Priority 3: Enhanced Features

7. **Add proper error handling for slug conflicts**:
   - Return clear error messages when slug exists in multiple workspaces
   - Suggest using ID-based URLs when ambiguity exists

8. **Add API documentation**:
   - Document which endpoints accept slugs vs IDs
   - Document required workspace context
   - Add OpenAPI/Swagger schema

---

## Testing Recommendations

### Unit Tests Needed

1. **PIN API tests**:
   - Test pinning project by ID
   - Test unpinning project
   - Test unauthorized pin attempt
   - Test pinning non-existent project

2. **Slug/ID resolution tests**:
   - Test ID lookup returns correct project
   - Test slug lookup with workspace context
   - Test slug lookup fails without workspace
   - Test slug collision across workspaces

3. **Stats API tests**:
   - Test stats calculation accuracy
   - Test workspace filtering
   - Test empty workspace handling

### Integration Tests Needed

1. **End-to-end navigation**:
   - Click project link from list → verify correct project loads
   - Bookmark project URL → verify correct project loads
   - Pin project → verify state persists

2. **Cross-workspace isolation**:
   - User in Workspace A cannot access Workspace B projects
   - Slug collision doesn't cause data leaks

---

## Migration Plan

### Phase 1: Critical Fixes (Deploy Immediately)

1. Fix PIN API to use `foco_projects` and `is_pinned` column
2. Add workspace filtering to slug fallback
3. Create stats API endpoint

**Risk**: Low - These are bug fixes with no breaking changes

### Phase 2: Architecture Cleanup (Next Sprint)

1. Decide on ID-only vs separate endpoints strategy
2. Update all routes to async params pattern
3. Update frontend to use API consistently

**Risk**: Medium - May require frontend refactoring

### Phase 3: Enhanced Features (Future)

1. Add comprehensive API documentation
2. Add slug resolution caching
3. Add detailed logging for slug conflicts

**Risk**: Low - Additive features only

---

## Database Queries for Validation

### Check for slug collisions across workspaces
```sql
SELECT slug, COUNT(*), array_agg(workspace_id) as workspaces
FROM foco_projects
GROUP BY slug
HAVING COUNT(*) > 1;
```

### Check if is_pinned is actually used
```sql
SELECT COUNT(*) as pinned_projects
FROM foco_projects
WHERE is_pinned = true;
```

### Verify unique constraint
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'foco_projects'::regclass
AND conname LIKE '%slug%';
```

---

## Conclusion

The project API has **3 critical bugs** that should be fixed immediately:

1. ❌ **PIN API is completely broken** - uses wrong tables and columns
2. ❌ **Slug lookup bypasses workspace filtering** - security vulnerability
3. ❌ **Stats API doesn't exist** - 404 errors in production

The root cause is **legacy code migration** - the PIN API wasn't updated when the project moved from `projects`/`organization_id` to `foco_projects`/`workspace_id` schema.

**Immediate Action Required**: Deploy Priority 1 fixes to prevent data leaks and restore pin functionality.
