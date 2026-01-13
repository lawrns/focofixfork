# Workspace API Architecture Analysis: 401 Authentication Failures

**Date:** 2026-01-13
**Scope:** /api/workspaces and /api/workspaces/[id]/members routes
**Issue:** Consistent 401 Unauthorized failures due to authentication architecture mismatch

---

## Executive Summary

The workspace API routes are experiencing 401 authentication failures due to a **fundamental architectural inconsistency** between cookie-based authentication patterns used across the application. The root cause is a mismatch between:

1. **Supabase SSR's automatic cookie naming** (`sb-<project-ref>-auth-token`)
2. **Manual cookie lookup in workspace APIs** (`sb-token`)
3. **Proper auth helper pattern** (`getAuthUser()` from auth-helper.ts)

## Current State Analysis

### 1. Authentication Patterns in Codebase

#### ✅ **CORRECT Pattern** (Used by most APIs)
- **File:** `/src/lib/api/auth-helper.ts`
- **Method:** `getAuthUser(req: NextRequest)`
- **How it works:**
  - Creates `createServerClient` from `@supabase/ssr`
  - Automatically reads ALL cookies via `req.cookies.getAll()`
  - Supabase client handles cookie parsing internally
  - Calls `supabase.auth.getUser()` to validate session

**Example (from `/src/app/api/tasks/route.ts`):**
```typescript
import { getAuthUser } from '@/lib/api/auth-helper'

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthUser(req)

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... proceed with authenticated request
}
```

#### ❌ **INCORRECT Pattern** (Used by workspace APIs)
- **Files:**
  - `/src/app/api/workspaces/route.ts`
  - `/src/app/api/workspaces/[id]/members/route.ts`
- **Method:** Manual cookie lookup for `sb-token`
- **How it fails:**
  - Looks for hardcoded cookie name `sb-token`
  - Supabase SSR actually uses `sb-<project-ref>-auth-token` format
  - Cookie is never found → returns 401

**Current broken code:**
```typescript
const token = request.cookies.get('sb-token')?.value  // ❌ Wrong cookie name!

if (!token) {
  return NextResponse.json(
    { error: 'Unauthorized', workspaces: [] },
    { status: 401 }
  )
}
```

### 2. Cookie Naming Convention

**Supabase SSR Cookie Format (Verified from test scripts):**
```
sb-<project-ref>-auth-token
```

**Example:** For Supabase URL `https://czijxfbkihrauyjwcgfn.supabase.co`:
```
Cookie: sb-czijxfbkihrauyjwcgfn-auth-token=<access_token>
```

**Evidence from test script** (`scripts/testing/test-ai-workflows.js:43`):
```javascript
'Cookie': `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token=${loginData.session.access_token}`
```

### 3. Middleware Configuration

**File:** `/middleware.ts`

**Current behavior:**
- Creates Supabase client with proper cookie handling (✅ CORRECT)
- Validates session and refreshes if needed
- Passes through to API routes without adding headers
- **Comment on line 133-134:** "API route handling - NO MORE x-user-id HEADERS"
  - This indicates a previous migration from header-based auth
  - Workspace APIs were **not migrated** to the new pattern

**Key section (lines 135-207):**
```typescript
if (pathname.startsWith('/api/')) {
  // ... middleware validates session exists
  // Then passes control to route handler
  // Route handlers should use getAuthUser() to re-authenticate
}
```

### 4. Working API Examples

**APIs using correct pattern:**
- `/api/tasks` - Uses `getAuthUser()`
- `/api/organizations` - Uses `getAuthUser()`
- `/api/projects` - Uses `getAuthUser()`
- `/api/settings` - Uses `getAuthUser()`

**Total count:** 39 files in `/src/app/api` use `getAuthUser()` correctly

**Broken APIs:**
- `/api/workspaces` - Uses manual cookie lookup ❌
- `/api/workspaces/[id]/members` - Uses manual cookie lookup ❌

---

## Root Cause Analysis

### Issue #1: Cookie Name Mismatch
**Symptom:** `request.cookies.get('sb-token')` returns `undefined`
**Cause:** Hardcoded cookie name doesn't match Supabase SSR's dynamic naming
**Impact:** Immediate 401 failure before any database query

### Issue #2: Inconsistent Auth Pattern
**Symptom:** Workspace APIs don't follow established auth helper pattern
**Cause:** Code was written before `getAuthUser()` helper was standardized, or during incomplete migration
**Impact:**
- Maintenance burden (two auth patterns)
- Security risk (manual token handling)
- Type safety issues (no proper `User` type)

### Issue #3: Manual Token Handling Anti-Pattern
**Problem:** Manually extracting token and creating client
```typescript
// ❌ ANTI-PATTERN
const token = request.cookies.get('sb-token')?.value
const supabase = createClient(url, key, {
  global: { headers: { Authorization: `Bearer ${token}` }}
})
```

**Why it's wrong:**
- Bypasses Supabase SSR's cookie management
- Doesn't handle chunked cookies (large sessions)
- Doesn't refresh expired tokens
- Fragile to cookie name changes
- Requires manual session validation

### Issue #4: Database Schema Confusion
**Found in `/api/workspaces/route.ts` POST handler:**
- Lines 156-165: Creates workspace in `organizations` table ❌
- Lines 178-186: Adds member to `organization_members` table ❌

**Correct schema (per authorization.ts):**
- Tables: `workspaces`, `workspace_members`
- Columns: `workspace_id` (not `organization_id`)

This indicates partial migration from old schema naming.

---

## Architectural Issues

### 1. **Lack of Auth Abstraction Enforcement**
- No type system enforcement to use `getAuthUser()`
- Developers can still manually access cookies
- No linting rule to catch manual cookie access

### 2. **Incomplete Migration**
- Comments indicate migration from `x-user-id` header pattern
- Workspace APIs were left behind in old pattern
- No migration checklist or verification

### 3. **Schema Naming Inconsistency**
- Code references both `organizations` and `workspaces` tables
- POST handler uses `organizations`, GET handler uses `workspaces`
- Suggests incomplete renaming refactor

### 4. **Missing Error Context**
- 401 errors don't indicate *why* auth failed
- No logging of actual cookie names present
- Makes debugging difficult

---

## Recommended Fixes

### Priority 1: Fix Authentication Pattern (CRITICAL)

**Change:** Replace manual cookie lookup with `getAuthUser()` helper

**File:** `/src/app/api/workspaces/route.ts`
```typescript
// Before (❌ BROKEN):
const token = request.cookies.get('sb-token')?.value
if (!token) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
const supabase = createClient(url, key, {
  global: { headers: { Authorization: `Bearer ${token}` }}
})
const { data: { user }, error: userError } = await supabase.auth.getUser()

// After (✅ CORRECT):
import { getAuthUser } from '@/lib/api/auth-helper'

const { user, supabase, error } = await getAuthUser(request)
if (error || !user) {
  return NextResponse.json({
    success: false,
    error: 'Unauthorized'
  }, { status: 401 })
}
```

**File:** `/src/app/api/workspaces/[id]/members/route.ts`
- Same fix as above

### Priority 2: Fix Schema Consistency (HIGH)

**Issue:** POST handler uses wrong table names

**File:** `/src/app/api/workspaces/route.ts` (lines 156-200)
```typescript
// Before (❌ WRONG TABLES):
await supabase.from('organizations').insert([...])
await supabase.from('organization_members').insert([...])

// After (✅ CORRECT TABLES):
await supabase.from('workspaces').insert([...])
await supabase.from('workspace_members').insert([...])
```

### Priority 3: Standardize Response Format (MEDIUM)

**Issue:** Inconsistent error response shapes

**Current:**
- `/api/workspaces`: `{ error: string, workspaces: [] }`
- `/api/organizations`: `{ success: false, error: string }`

**Recommendation:**
```typescript
// Standardize on:
{
  success: boolean
  data?: T
  error?: { code: string, message: string }
}
```

### Priority 4: Add Type Safety (MEDIUM)

**Create auth types:**
```typescript
// /src/lib/api/types.ts
import { User, SupabaseClient } from '@supabase/supabase-js'

export interface AuthenticatedContext {
  user: User
  supabase: SupabaseClient
}

export type ApiHandler<T> = (
  req: NextRequest,
  context: AuthenticatedContext
) => Promise<NextResponse<T>>
```

**Usage:**
```typescript
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req)
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return handleGet(req, { user: auth.user, supabase: auth.supabase })
}

async function handleGet(
  req: NextRequest,
  { user, supabase }: AuthenticatedContext
) {
  // Type-safe access to user and supabase
}
```

### Priority 5: Add Observability (LOW)

**Add correlation IDs and logging:**
```typescript
import { nanoid } from 'nanoid'

export async function GET(req: NextRequest) {
  const correlationId = req.headers.get('x-correlation-id') ?? nanoid()

  const { user, supabase, error } = await getAuthUser(req)
  if (error || !user) {
    console.error('[AUTH_FAILED]', {
      correlationId,
      path: req.nextUrl.pathname,
      error,
      cookiesPresent: req.cookies.getAll().map(c => c.name)
    })
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: { 'x-correlation-id': correlationId }
      }
    )
  }

  // ... proceed with request
}
```

---

## Best Practices for Next.js 14+ with Supabase SSR

### 1. **Always Use Server Client Helpers**
```typescript
// ✅ DO THIS
import { getAuthUser } from '@/lib/api/auth-helper'
const { user, supabase, error } = await getAuthUser(req)

// ❌ DON'T DO THIS
const token = req.cookies.get('some-token')?.value
```

### 2. **Let Supabase SSR Handle Cookies**
- Supabase SSR manages cookie naming conventions
- Handles chunked cookies for large sessions
- Automatically refreshes expired tokens
- Supports PKCE flow

### 3. **Create Supabase Client Per Request**
```typescript
// ✅ DO THIS (creates fresh client per request)
export async function GET(req: NextRequest) {
  const { user, supabase } = await getAuthUser(req)
  const { data } = await supabase.from('table').select('*')
}

// ❌ DON'T DO THIS (reuses global client)
const supabase = createClient(url, key) // Global instance
export async function GET(req: NextRequest) {
  const { data } = await supabase.from('table').select('*')
}
```

### 4. **Middleware vs Route Handler Auth**

**Middleware Role:**
- Validate session exists
- Refresh expired sessions
- Redirect unauthenticated page requests
- Add security headers

**Route Handler Role:**
- Re-authenticate using `getAuthUser()`
- Perform authorization checks
- Execute business logic

**Why both?**
- Middleware can't access request body
- Middleware redirects are for pages, not APIs
- Route handlers need full user context

### 5. **Error Response Standardization**
```typescript
// Standard error response
interface ApiError {
  success: false
  error: {
    code: string          // Machine-readable
    message: string       // Human-readable
    details?: unknown     // Optional debug info
  }
}

// Standard success response
interface ApiSuccess<T> {
  success: true
  data: T
  meta?: {
    pagination?: { total: number, page: number, limit: number }
    timestamp?: string
  }
}
```

---

## Migration Checklist

When migrating an API route to proper auth pattern:

- [ ] Remove manual cookie access (`req.cookies.get('sb-token')`)
- [ ] Import and use `getAuthUser()` helper
- [ ] Remove manual Supabase client creation with `Authorization` header
- [ ] Use returned `supabase` client from `getAuthUser()`
- [ ] Standardize error response format
- [ ] Add correlation ID handling
- [ ] Update to correct table names (`workspaces`, `workspace_members`)
- [ ] Add proper TypeScript types
- [ ] Test with actual Supabase session cookies
- [ ] Verify token refresh works for long sessions
- [ ] Add unit tests for auth failure cases

---

## Testing Strategy

### Unit Tests
```typescript
describe('GET /api/workspaces', () => {
  it('returns 401 when not authenticated', async () => {
    const req = new NextRequest('http://localhost/api/workspaces')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns workspaces when authenticated', async () => {
    const req = new NextRequest('http://localhost/api/workspaces', {
      headers: {
        Cookie: `sb-test-auth-token=${validToken}`
      }
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.workspaces).toBeDefined()
  })
})
```

### Integration Tests
1. Create test user with Supabase
2. Authenticate and get real session cookies
3. Make API request with actual cookies
4. Verify response

### E2E Tests
1. Login via UI
2. Navigate to workspaces page
3. Verify workspace list loads
4. Check network tab for successful API calls

---

## Related Files

**Auth Infrastructure:**
- `/middleware.ts` - Session validation and refresh
- `/src/lib/api/auth-helper.ts` - Auth helper functions
- `/src/lib/supabase-client.ts` - Browser client (singleton)
- `/src/lib/supabase-server.ts` - Server admin client

**Authorization:**
- `/src/lib/middleware/authorization.ts` - RBAC functions

**Working API Examples:**
- `/src/app/api/tasks/route.ts`
- `/src/app/api/organizations/route.ts`
- `/src/app/api/projects/route.ts`

**Broken APIs (Need Fix):**
- `/src/app/api/workspaces/route.ts`
- `/src/app/api/workspaces/[id]/members/route.ts`

---

## Conclusion

The 401 authentication failures in workspace APIs are caused by:

1. **Hardcoded cookie name** that doesn't match Supabase SSR's dynamic naming
2. **Manual token handling** instead of using established `getAuthUser()` pattern
3. **Incomplete migration** from old authentication approach
4. **Schema naming inconsistency** between old and new table names

**Fix summary:**
- Replace manual cookie lookup with `getAuthUser()` helper (2 files)
- Fix table names from `organizations` to `workspaces` (1 POST handler)
- Standardize error response format
- Add proper observability

**Estimated effort:** 2-4 hours
**Risk level:** Low (following established pattern used by 39 other API routes)
**Testing:** Required (unit + integration tests)

---

## References

**Supabase Documentation:**
- [Server-Side Auth Guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [SSR Package](https://supabase.com/docs/guides/auth/server-side/advanced-guide)

**Next.js Documentation:**
- [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

**Codebase Evidence:**
- Test script: `/scripts/testing/test-ai-workflows.js:43` (cookie format)
- Auth helper: `/src/lib/api/auth-helper.ts` (correct pattern)
- Working example: `/src/app/api/tasks/route.ts` (39 files use this pattern)
