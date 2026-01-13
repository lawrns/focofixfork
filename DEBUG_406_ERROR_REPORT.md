# 406 Error Debug Report: Supabase REST API foco_projects

## Executive Summary
The 406 "Not Acceptable" error on `/rest/v1/foco_projects?select=...&slug=eq.UUID` is caused by a **slug column type mismatch** - the client is querying `slug` as if it contains a UUID, but the database schema defines it as `VARCHAR(100)`.

## Root Cause Analysis

### 1. How the Client Makes Requests

**Location:** `/Users/lukatenbosch/focofixfork/src/app/api/projects/[id]/route.ts` (lines 17-36)

```typescript
// Try to find by ID first, then by slug
let { data, error: queryError } = await supabase
  .from('foco_projects')
  .select('*')
  .eq('id', id)           // UUID comparison - works
  .single()

if (queryError) {
  // Try by slug
  const { data: slugData, error: slugError } = await supabase
    .from('foco_projects')
    .select('*')
    .eq('slug', id)       // UUID comparison on VARCHAR column - FAILS!
    .single()
```

**The Problem:** The route parameter `[id]` is treated as both a UUID (project.id) and as a string (project.slug). When the first query fails, it falls back to querying by slug - but it passes the UUID as-is without converting it to a proper slug format.

### 2. What Headers Are Sent

**Supabase Client Configuration:** `/Users/lukatenbosch/focofixfork/src/lib/supabase-client.ts`

The browser client uses `@supabase/ssr` which handles headers automatically:
- **Accept:** `application/json` (default for supabase-js)
- **Content-Type:** `application/json`
- **Authorization:** Bearer token from session

These are correct. The 406 is NOT about headers.

### 3. RLS Policies on foco_projects

**Location:** `/Users/lukatenbosch/focofixfork/database/migrations/100_foco_2_core_schema.sql` (lines 627-643)

```sql
-- RLS Policies for foco_projects
CREATE POLICY foco_projects_select ON foco_projects FOR SELECT
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY foco_projects_insert ON foco_projects FOR INSERT
  WITH CHECK (user_has_workspace_access(workspace_id));

CREATE POLICY foco_projects_update ON foco_projects FOR UPDATE
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY foco_projects_delete ON foco_projects FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = foco_projects.workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ));
```

RLS policies check workspace membership, not the query format. The 406 occurs before RLS evaluation.

### 4. Why UUID is Used for slug Column

**Schema Definition:** `/Users/lukatenbosch/focofixfork/database/migrations/100_foco_2_core_schema.sql` (line 94)

```sql
CREATE TABLE IF NOT EXISTS foco_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,      -- DEFINED AS VARCHAR, NOT UUID!
  description TEXT,
  -- ...
  UNIQUE(workspace_id, slug)       -- Uniqueness is per-workspace
);
```

The `slug` column is explicitly `VARCHAR(100)`, meant for URL-friendly strings like "project-name" or "my-project", NOT UUIDs.

## The 406 Error Mechanism

HTTP 406 "Not Acceptable" occurs when the REST API cannot process the query due to a format issue. In this case:

1. Client sends: `slug=eq.33d467da-fff5-4fb8-a1da-64c4c23da265` (UUID format)
2. Supabase REST API validates the query parameter
3. The column `slug` is VARCHAR, and Supabase's type system expects a string value
4. Passing a UUID literal without quotes or proper escaping causes the REST API to reject the request

**Error occurs at REST API validation layer, before it reaches the database.**

## Evidence

1. **Query logging** in `/src/app/api/search/route.ts` (line 35) shows proper slug usage:
   ```typescript
   .select('id, name, slug, description, status')
   ```

2. **Database schema** consistently defines slug as VARCHAR:
   - Table definition: `slug VARCHAR(100)`
   - Workspace table: `slug VARCHAR(100) UNIQUE`

3. **Naming pattern** suggests slug should be human-readable:
   - Unique constraint per workspace: `UNIQUE(workspace_id, slug)`
   - This is the same pattern used for workspace slugs which are clearly meant to be readable strings

## Code Fixes

### Fix 1: Validate slug format before query (Client-side)

**File:** `/Users/lukatenbosch/focofixfork/src/app/api/projects/[id]/route.ts`

```typescript
function isUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Only attempt UUID lookup if ID is actually a UUID
    if (isUUID(id)) {
      const { data, error: queryError } = await supabase
        .from('foco_projects')
        .select('*')
        .eq('id', id)
        .single()

      if (!queryError) {
        return NextResponse.json({ success: true, data })
      }
    }

    // Try by slug (for human-readable slugs like "my-project")
    const { data: slugData, error: slugError } = await supabase
      .from('foco_projects')
      .select('*')
      .eq('slug', id)  // Now 'id' is treated as a slug string, not UUID
      .single()

    if (slugError) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: slugData })
  } catch (err: any) {
    console.error('Project GET error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
```

### Fix 2: Use routing discrimination

Alternatively, separate the routes:

```typescript
// /api/projects/[id]/route.ts - for UUID lookups
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Only handle UUID format
}

// /api/projects/by-slug/[slug]/route.ts - for slug lookups
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  // Only handle slug format
}
```

## Testing Approach

1. **Unit Test**: Validate `isUUID()` function
   ```typescript
   expect(isUUID('33d467da-fff5-4fb8-a1da-64c4c23da265')).toBe(true);
   expect(isUUID('my-project')).toBe(false);
   expect(isUUID('project-name')).toBe(false);
   ```

2. **Integration Test**: Query by both UUID and slug
   ```typescript
   // Test UUID lookup
   const res1 = await fetch('/api/projects/33d467da-fff5-4fb8-a1da-64c4c23da265');
   expect(res1.status).toBe(200);

   // Test slug lookup
   const res2 = await fetch('/api/projects/my-project-slug');
   expect(res2.status).toBe(200);

   // Test invalid UUID (should not attempt UUID lookup)
   const res3 = await fetch('/api/projects/not-a-uuid');
   expect(res3.status).toBe(200 or 404); // Falls back to slug lookup
   ```

3. **Supabase REST API Test**: Verify REST calls directly
   ```bash
   # This should work (UUID on id column)
   curl -H "Authorization: Bearer $TOKEN" \
     "$SUPABASE_URL/rest/v1/foco_projects?select=*&id=eq.33d467da-fff5-4fb8-a1da-64c4c23da265"

   # This FAILS (UUID on slug column)
   curl -H "Authorization: Bearer $TOKEN" \
     "$SUPABASE_URL/rest/v1/foco_projects?select=*&slug=eq.33d467da-fff5-4fb8-a1da-64c4c23da265"

   # This works (string on slug column)
   curl -H "Authorization: Bearer $TOKEN" \
     "$SUPABASE_URL/rest/v1/foco_projects?select=*&slug=eq.my-project-slug"
   ```

## Prevention Recommendations

1. **Add type safety to routing parameters**
   - Create a `ProjectId` branded type that validates format
   - Use discriminated unions in API responses

2. **Add database constraints**
   - Add slug validation constraint (alphanumeric + hyphens)
   - This ensures slugs can never accidentally be UUIDs

   ```sql
   ALTER TABLE foco_projects
   ADD CONSTRAINT slug_format_check
   CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR slug ~ '^[a-z0-9]$');
   ```

3. **Document the API contract**
   - Clearly distinguish between `/api/projects/:id` (UUID) and `/api/projects/slug/:slug` (string)
   - Add OpenAPI schema validation

4. **Add pre-request validation in client SDK**
   - Create a wrapper around Supabase query builder that validates column types
   - Similar to what TypeScript types provide, but at runtime

5. **Error handling**
   - Catch 406 errors specifically and provide helpful debugging info
   - Log the actual query being sent for debugging

## Summary

| Aspect | Finding |
|--------|---------|
| **Error Type** | HTTP 406 Not Acceptable |
| **Root Cause** | UUID passed to VARCHAR column query |
| **Location** | `/src/app/api/projects/[id]/route.ts` line 29 |
| **Headers** | Correct (not the issue) |
| **RLS Policies** | Correct and not involved in 406 |
| **Column Type** | `VARCHAR(100)` as intended |
| **Fix** | Add UUID validation before slug query |
| **Severity** | Medium - breaks project lookup by slug |

