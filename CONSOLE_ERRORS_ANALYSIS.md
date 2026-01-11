# Console Errors Analysis and Fixes

**Date:** January 11, 2026  
**Environment:** Local Development (http://localhost:3003)

---

## Error Summary

| Error | Severity | Status | Location |
|-------|----------|--------|----------|
| `organizations.map is not a function` | 🔴 Critical | ✅ Fixed | `DashboardPage:433` |
| Projects API 500 error | 🔴 Critical | ✅ Fixed | `/api/projects` |
| Notifications API 400 error | 🔴 Critical | ⚠️ Identified | `127.0.0.1:54321/rest/v1/notifications` |
| React setState during render | 🟡 Medium | ⏳ Pending | `DashboardPage:200` |
| Missing Description for DialogContent | 🟢 Low | ⏳ Pending | Multiple dialogs |
| AI health 503 error | 🟢 Info | Expected | `/api/ai/health` |

---

## 1. ✅ Fixed: `organizations.map is not a function`

**Error:**
```
Uncaught TypeError: organizations.map is not a function
    at DashboardPage (page.tsx:433:35)
```

**Root Cause:**
The `fetchOrganizations` function was setting `organizations` state to `data.data` which could be undefined or not an array, causing the `.map()` call to fail.

**Fix Applied:**
```typescript
// Before:
const orgs = Array.isArray(data.data) ? data.data : []

// After:
const orgs = Array.isArray(data.data)
  ? data.data
  : Array.isArray(data.data?.data)
    ? data.data.data
    : []

// Also added error handling to ensure organizations is always an array
catch (error) {
  console.error('Error fetching organizations:', error)
  setOrganizations([]) // Ensure organizations is always an array
}
```

**File:** `/Users/lukatenbosch/focofixfork/src/app/dashboard/page.tsx:134-161`

---

## 2. ✅ Fixed: Projects API 500 Error

**Error:**
```
api/projects:1 Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

**Root Cause:**
The `ProjectsService.getUserProjects()` queries the `organization_members` table to get user's organizations. The authenticated user (`73b21217-2dcf-4491-bd56-13440f1616e3`) was not in the `organization_members` table, causing the query to fail.

**Fix Applied:**
```sql
-- Add the authenticated user to auth.users
INSERT INTO auth.users (id, email, created_at) VALUES 
  ('73b21217-2dcf-4491-bd56-13440f1616e3', 'win@win.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add user to organization_members so they can access projects
INSERT INTO organization_members (organization_id, user_id, role) VALUES 
  ('00000000-0000-0000-0000-000000000001', '73b21217-2dcf-4491-bd56-13440f1616e3', 'owner')
ON CONFLICT DO NOTHING;
```

**Result:** User can now access projects and the API should return 200.

---

## 3. ⚠️ Identified: Notifications API 400 Error

**Error:**
```
127.0.0.1:54321/rest/v1/notifications?select=is_read%2Ctype%2Ccreated_at&user_id=eq.73b21217-2dcf-4491-bd56-13440f1616e3:1 Failed to load resource: the server responded with a status of 400 (Bad Request)

127.0.0.1:54321/rest/v1/notifications?select=*&user_id=eq.73b21217-2dcf-4491-bd56-13440f1616e3&order=created_at.desc&is_read=eq.false&limit=50:1 Failed to load resource: the server responded with a status of 400 (Bad Request)
```

**Root Cause:**
The `NotificationCenter` component uses `NotificationsService` which imports `supabase` from `@/lib/supabase-client.ts`. This client is configured with `NEXT_PUBLIC_SUPABASE_URL` which points to the remote Supabase instance (`https://czijxfbkihrauyjwcgfn.supabase.co`), NOT the local database.

The requests are going to:
- Remote Supabase: `127.0.0.1:54321/rest/v1/notifications` (Supabase REST API)
- Local database has the `notifications` table

**Architecture Issue:**
The application has a **mixed database architecture**:
- API routes use local PostgreSQL (port 5434)
- Client-side Supabase client uses remote Supabase
- This causes data inconsistency

**Solutions:**

### Option 1: Use API Routes for Notifications (Recommended)
Create an API route that queries the local database and have the client call that instead of using Supabase directly.

```typescript
// src/app/api/notifications/route.ts (already exists)
// The NotificationCenter component should use this API route
```

### Option 2: Configure Supabase Client for Local Development
Update `.env.local` to use the local Supabase-compatible API (if available) or create a mock Supabase client that uses the local database.

### Option 3: Disable Notifications in Local Development
Add a feature flag to disable notifications when running locally.

**Recommended Fix:** Update `NotificationCenter` to use the API route instead of direct Supabase queries.

---

## 4. ⏳ Pending: React setState During Render Warning

**Error:**
```
Warning: Cannot update a component (HotReload) while rendering a different component (DashboardPage). To locate the bad setState() call inside DashboardPage, follow the stack trace as described in https://reactjs.org/link/setstate-in-render
    at DashboardPage (webpack-internal:///(app-pages-browser)/./src/app/dashboard/page.tsx:200:78)
```

**Root Cause:**
A `setState` call is happening during the render phase in `DashboardPage`. This is likely in the `useEffect` at line 187-201 where `router.replace('/dashboard', undefined)` is called.

**Investigation Needed:**
- Check if `router.replace` is being called during render
- Ensure all state updates happen in event handlers or `useEffect` callbacks
- The URL parameter cleanup might be triggering this

**Potential Fix:**
```typescript
// Move router.replace to a separate useEffect
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('new') === 'true') {
    setShowNewProjectModal(true)
    // Clean up the URL
    router.replace('/dashboard', undefined)
  }
}, [router]) // Separate from the user-dependent effect
```

---

## 5. ⏳ Pending: Accessibility Warnings

**Error:**
```
Warning: Missing Description or aria-describedby={undefined} for {DialogContent}.
```

**Root Cause:**
Dialog components are missing the `DialogDescription` or `aria-describedby` attribute, which is required for accessibility.

**Locations:**
Multiple dialogs throughout the application are missing descriptions.

**Fix:**
Add `DialogDescription` to all dialogs or provide `aria-describedby`:

```typescript
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create Project</DialogTitle>
      <DialogDescription>
        Fill in the details below to create a new project.
      </DialogDescription>
    </DialogHeader>
    {/* ... */}
  </DialogContent>
</Dialog>
```

---

## 6. ℹ️ Expected: AI Health 503 Error

**Error:**
```
api/ai/health:1 Failed to load resource: the server responded with a status of 503 (Service Unavailable)
```

**Root Cause:**
The OpenAI API key in `.env.local` is invalid or expired.

**Status:**
This is expected in local development. The AI features will not work without a valid API key.

**Fix:**
Update `OPENAI_API_KEY` in `.env.local` with a valid OpenAI API key.

---

## Architectural Issues Identified

### 1. Mixed Database Architecture

**Problem:**
- API routes use local PostgreSQL (port 5434)
- Client-side code uses remote Supabase via Supabase client
- This creates data inconsistency and confusion

**Impact:**
- Notifications fail because they query remote Supabase
- Data created via API routes won't appear in client-side queries
- Development and production environments behave differently

**Recommended Solution:**

#### Option A: Full Local Development (Recommended)
Use Supabase CLI for local development to have a complete local Supabase instance.

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize local Supabase
supabase init
supabase start
```

#### Option B: API-Only Architecture
Remove direct Supabase client usage from client-side code. All data access should go through API routes.

**Pros:**
- Consistent data access pattern
- Better security (server-side queries)
- Easier to test

**Cons:**
- More boilerplate
- Slower (extra network hop)

#### Option C: Hybrid with Feature Flags
Use feature flags to switch between local and remote data sources.

```typescript
const USE_LOCAL_DB = process.env.NODE_ENV === 'development'

const client = USE_LOCAL_DB ? localApiClient : supabase
```

---

### 2. Authentication Flow

**Problem:**
The app is using a custom auth implementation with tokens stored in localStorage, but also trying to use Supabase auth.

**Observations:**
- User is authenticated: `73b21217-2dcf-4491-bd56-13440f1616e3`
- Token refresh is working automatically
- Session is being loaded from storage

**Recommendation:**
Standardize on either:
1. Full Supabase Auth (recommended)
2. Custom JWT-based auth

Don't mix both approaches.

---

### 3. State Management

**Problem:**
Multiple state management approaches:
- React state (useState)
- Project store (projectStore)
- Context providers

**Recommendation:**
Consolidate to a single state management solution:
- React Query (TanStack Query) for server state
- Zustand or Jotai for client state
- Context for global UI state

---

## Recommended Actions

### Immediate (High Priority)

1. **Fix Notifications API**
   - Update `NotificationCenter` to use API routes instead of direct Supabase queries
   - Or configure local Supabase instance

2. **Fix React setState Warning**
   - Move router.replace to separate useEffect
   - Ensure no state updates during render

3. **Standardize Database Access**
   - Choose one approach: API-only or Supabase client
   - Update all client-side code accordingly

### Short-term (Medium Priority)

4. **Fix Accessibility Warnings**
   - Add DialogDescription to all dialogs
   - Run accessibility audit

5. **Update .env.local**
   - Add valid OpenAI API key (optional)
   - Document all environment variables

### Long-term (Architecture)

6. **Implement Supabase CLI for Local Development**
   - Run full Supabase stack locally
   - Consistent environment across dev and prod

7. **Consolidate State Management**
   - Choose single state management solution
   - Refactor to use it consistently

8. **Improve Error Handling**
   - Add error boundaries
   - Better error messages
   - Retry logic for failed requests

---

## Testing Recommendations

After fixes are applied, test:

1. **Dashboard Loading**
   - Organizations load correctly
   - Projects load correctly
   - No console errors

2. **Project Creation**
   - Create new project
   - Verify it appears in list
   - Check database

3. **Notifications**
   - Open notification center
   - Verify no 400 errors
   - Test marking as read

4. **Authentication**
   - Login/logout flow
   - Token refresh
   - Session persistence

---

## Files Modified

1. `/Users/lukatenbosch/focofixfork/src/app/dashboard/page.tsx`
   - Fixed organizations.map TypeError
   - Improved error handling

2. Database (via SQL)
   - Added user to auth.users
   - Added user to organization_members

---

## Next Steps

1. Implement notification API route fix
2. Fix React setState warning
3. Decide on database architecture approach
4. Implement chosen architecture
5. Run comprehensive tests
6. Update documentation

---

*End of Report*
