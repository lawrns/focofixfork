# Production Issues Analysis - foco.mx

## Critical Issues Found

### 1. **Client-Side x-user-id Headers (CRITICAL)**

**Problem**: All client-side fetch calls are trying to set `x-user-id` headers, which browsers block for security reasons.

**Affected Files**:
- `src/app/projects/[id]/page.tsx` - Line 64
- `src/app/dashboard/page.tsx` - Lines 72, 166
- `src/app/milestones/[id]/page.tsx` - Line 179
- `src/app/organizations/page.tsx` - Line 379
- And likely many more...

**Root Cause**: The middleware correctly sets `x-user-id` from the Supabase session (middleware.ts lines 180-181), but this only works for server-side requests. Client-side fetch calls cannot set custom headers.

**Solution**: Remove ALL `x-user-id` headers from client-side fetch calls. The middleware will automatically add them from the session cookie.

**Impact**: This is causing ALL 401 errors in production because:
1. Browser blocks the x-user-id header
2. API receives request without x-user-id
3. API returns 401 Unauthorized

### 2. **Missing Environment Variables in Production**

**Problem**: OpenAI API key and other environment variables from `.env.local` are not deployed to Netlify.

**Missing Variables**:
- `OPENAI_API_KEY` - Required for AI features
- `SUPABASE_SERVICE_ROLE_KEY` - Required for admin operations
- Other configuration variables

**Solution**: Configure environment variables in Netlify dashboard at:
https://app.netlify.com/sites/[site-name]/settings/deploys#environment

**Impact**: AI features return 500 errors because OpenAI API key is missing.

### 3. **Activities Endpoint Implementation**

**Status**: ✅ FIXED - Implemented proper database query

**Changes Made**:
- Updated `/api/activities/route.ts` to query the activities table
- Added support for project_id and organization_id filters
- Added pagination support

### 4. **Project Selection Dropdown**

**Status**: ⚠️ NEEDS INVESTIGATION

**Likely Cause**: Projects not loading due to 401 errors (see issue #1)

**Expected Resolution**: Should work automatically once x-user-id header issue is fixed.

## Fix Strategy

### Phase 1: Remove Client-Side x-user-id Headers (CRITICAL)

Search for all instances of `x-user-id` in client-side code and remove them:

```bash
grep -r "x-user-id.*user\.id" src/app --include="*.tsx"
grep -r "x-user-id.*user\.id" src/components --include="*.tsx"
```

Files to fix:
1. src/app/projects/[id]/page.tsx
2. src/app/dashboard/page.tsx
3. src/app/milestones/[id]/page.tsx
4. src/app/organizations/page.tsx
5. All other client components making API calls

### Phase 2: Environment Variables

Document required environment variables for Netlify:

```
NEXT_PUBLIC_SUPABASE_URL=https://czijxfbkihrauyjwcgfn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key]
SUPABASE_SERVICE_ROLE_KEY=[service role key]
OPENAI_API_KEY=[openai key]
NEXT_PUBLIC_AI_PROVIDER=openai
NEXT_PUBLIC_OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_OPENAI_CHAT_MODEL=gpt-4o-mini
DATABASE_URL=[postgres url]
```

### Phase 3: Testing

After fixes:
1. Test locally to ensure nothing breaks
2. Commit and push changes
3. Wait for Netlify deployment
4. Test on foco.mx with actual login
5. Verify all features work

## Authentication Flow (How It Should Work)

### Production Flow:
1. User logs in via Supabase auth
2. Supabase sets session cookie
3. Browser makes fetch request (NO custom headers)
4. Middleware intercepts request
5. Middleware reads session from cookie
6. Middleware sets x-user-id header from session
7. API receives request with x-user-id header
8. API processes request

### Local Testing Flow (What We Were Doing):
1. Manually set x-user-id header in fetch
2. API receives request with x-user-id
3. Works locally but FAILS in production (browser blocks custom headers)

## Progress Update

### ✅ Completed:
1. **Activities Endpoint** - Implemented proper database query with filters
2. **Milestone Schema** - Fixed status enum to match database constraint
3. **Partial x-user-id Header Removal** - Fixed the following files:
   - src/app/dashboard/page.tsx
   - src/app/projects/[id]/page.tsx
   - src/app/milestones/[id]/page.tsx
   - src/app/organizations/page.tsx
   - src/components/tasks/task-list.tsx
   - src/components/tasks/task-form.tsx
   - src/components/milestones/milestone-form.tsx
   - src/components/milestones/milestone-timeline.tsx
   - src/components/ai/ai-project-creator.tsx
   - src/components/ai/floating-ai-chat.tsx
   - src/components/layout/Sidebar.tsx
   - src/components/projects/project-form.tsx

### ⚠️ Still Need Fixing:
The following files still have x-user-id headers that need to be removed:
- src/components/activity/activity-feed.tsx (1 instance)
- src/components/layout/Header.tsx (3 instances)
- src/components/projects/project-list.tsx (2 instances)
- src/components/projects/ProjectTable.tsx (11 instances!)
- src/components/projects/kanban-board.tsx (2 instances)

### 📋 Environment Variables Needed in Netlify:

Go to: https://app.netlify.com/sites/[your-site]/settings/deploys#environment

Add these variables:
```
NEXT_PUBLIC_SUPABASE_URL=[copy from .env.local]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[copy from .env.local]
SUPABASE_SERVICE_ROLE_KEY=[copy from .env.local]
OPENAI_API_KEY=[copy from .env.local]
NEXT_PUBLIC_AI_PROVIDER=openai
NEXT_PUBLIC_OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_OPENAI_CHAT_MODEL=gpt-4o-mini
DATABASE_URL=[copy from .env.local]
```

**Note**: Copy the actual values from your local `.env.local` file.

## Next Steps

1. ✅ Implement activities endpoint - DONE
2. 🔄 Remove all client-side x-user-id headers - PARTIALLY DONE (5 files remaining)
3. ⏳ Configure environment variables in Netlify
4. ⏳ Test and deploy
5. ⏳ Verify on production

