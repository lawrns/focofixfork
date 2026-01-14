# Production Quick Fixes - Priority Actions

**Generated:** 2026-01-13
**Overall Readiness:** 78.5% → Target: 95%+

## 🚨 Critical Fixes (Do These NOW - 2-4 hours)

### 1. Configure Secure Cookies (30 minutes)

**File:** `app/api/auth/[...nextauth]/route.ts`

```typescript
import { AuthOptions } from 'next-auth'

export const authOptions: AuthOptions = {
  // ... existing config ...
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,    // ✅ Prevent XSS attacks
        secure: process.env.NODE_ENV === 'production', // ✅ HTTPS only in prod
        sameSite: 'lax',   // ✅ CSRF protection
        path: '/',
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.callback-url'
        : 'next-auth.callback-url',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Host-next-auth.csrf-token'
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}
```

**Test:**
```bash
# After deploying, check cookies in browser DevTools
# Should see: httpOnly: true, secure: true, sameSite: lax
```

---

### 2. Implement Rate Limiting (1 hour)

**Install dependencies:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Create file:** `lib/rate-limit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Create a new ratelimiter, that allows 10 requests per 10 seconds
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
})

// More restrictive for auth endpoints
export const authRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
})
```

**Update:** `middleware.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ratelimit, authRatelimit } from './lib/rate-limit'

export async function middleware(request: NextRequest) {
  // Rate limit API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const identifier = request.ip ?? request.headers.get('x-forwarded-for') ?? 'anonymous'

    // Use stricter limits for auth endpoints
    const limiter = request.nextUrl.pathname.includes('/auth/')
      ? authRatelimit
      : ratelimit

    const { success, limit, reset, remaining } = await limiter.limit(identifier)

    if (!success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      })
    }

    // Add rate limit headers to response
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', limit.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', reset.toString())

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

**Environment variables:**
```bash
# Add to .env.production
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

**Test:**
```bash
# Run 20 rapid requests
for i in {1..20}; do curl https://foco.mx/api/tasks; done
# Should see 429 responses after 10 requests
```

---

### 3. Fix /tasks/new Page Error (1 hour)

**File:** `app/tasks/new/page.tsx`

**Issue:** `b.map is not a function` suggests undefined array

**Find the problematic code:**
```bash
grep -r "\.map" app/tasks/new/
```

**Likely fix pattern:**
```typescript
// BEFORE (causes error if undefined)
{projects.map(project => (
  <option key={project.id}>{project.name}</option>
))}

// AFTER (safe)
{Array.isArray(projects) && projects.map(project => (
  <option key={project.id}>{project.name}</option>
))}

// OR
{(projects || []).map(project => (
  <option key={project.id}>{project.name}</option>
))}
```

**Add error boundary:**
```typescript
'use client'

import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="p-4 border border-red-500 rounded">
      <h2 className="text-red-600 font-semibold">Something went wrong</h2>
      <pre className="text-sm mt-2">{error.message}</pre>
      <button onClick={resetErrorBoundary} className="mt-2 btn-primary">
        Try again
      </button>
    </div>
  )
}

export default function TaskNewPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <TaskForm />
    </ErrorBoundary>
  )
}
```

**Test:**
```bash
# Navigate to /tasks/new in production
# Should load without errors
# Should be able to submit form
```

---

### 4. Add API Authentication Middleware (30 minutes)

**Create file:** `lib/api-auth.ts`

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { NextResponse } from 'next/server'

export async function requireAuth() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
      session: null,
    }
  }

  return { error: null, session }
}
```

**Update ALL API routes:**
```typescript
// Example: app/api/workspaces/route.ts
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  // ... rest of handler with session.user.id
}

export async function POST(request: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  // ... rest of handler
}
```

**Files to update:**
- `app/api/workspaces/route.ts`
- `app/api/tasks/route.ts`
- `app/api/projects/route.ts`
- `app/api/people/route.ts`
- All other API routes

**Test:**
```bash
# Test without auth
curl https://foco.mx/api/workspaces
# Should return: 401 Unauthorized

# Test with auth (after login)
curl -H "Cookie: session-token=..." https://foco.mx/api/workspaces
# Should return: 200 with data
```

---

## ⚠️ High Priority Fixes (Do This Week - 2-3 hours)

### 5. Fix "Unknown User" Issue (1 hour)

**File:** `app/people/page.tsx`

**Add fallback for missing user names:**
```typescript
function UserDisplay({ user }: { user: User }) {
  const displayName = user.full_name || user.email?.split('@')[0] || 'Team Member'
  const displayEmail = user.email || ''

  return (
    <div>
      <div className="font-semibold">{displayName}</div>
      {displayEmail && <div className="text-sm text-gray-600">{displayEmail}</div>}
    </div>
  )
}
```

**Run migration to populate missing names:**
```sql
-- supabase/migrations/fix_unknown_users.sql
UPDATE profiles
SET full_name = COALESCE(
  full_name,
  split_part(email, '@', 1)
)
WHERE full_name IS NULL OR full_name = '';
```

---

### 6. Add Error Boundaries (1 hour)

**Create:** `components/error-boundary.tsx`

```typescript
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 border border-red-300 bg-red-50 rounded">
          <h2 className="text-red-800 font-semibold">Something went wrong</h2>
          <p className="text-sm text-red-600 mt-2">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
```

**Wrap all pages:**
```typescript
// app/tasks/page.tsx
export default function TasksPage() {
  return (
    <ErrorBoundary>
      <TasksList />
    </ErrorBoundary>
  )
}
```

---

## 📊 Validation Checklist

After implementing fixes, run these tests:

```bash
# 1. Type check
npm run type-check

# 2. Lint
npm run lint

# 3. Build
npm run build

# 4. Run smoke tests
npx playwright test tests/smoke/production-critical-flows.spec.ts --config=playwright.production.config.ts

# 5. Run security tests
npx playwright test tests/smoke/security-verification.spec.ts --config=playwright.production.config.ts

# 6. Run database tests
npx playwright test tests/smoke/database-health-check.spec.ts --config=playwright.production.config.ts

# 7. Manual testing
# - Login to https://foco.mx
# - Create a task via /tasks/new
# - Verify no console errors
# - Check cookies are secure (DevTools → Application → Cookies)
# - Test rate limiting (rapid API calls)
```

---

## 🎯 Success Metrics

### Before Fixes
- Overall Readiness: 78.5%
- Security Score: 79% (D+)
- Critical Issues: 4 P0

### After Fixes (Target)
- Overall Readiness: 95%+
- Security Score: 95%+ (A)
- Critical Issues: 0 P0

### Verification
```bash
# Should pass all tests
Total Tests: ~41
Passed: 38+ (95%+)
Failed: 0
Skipped: 3

Security: 13/14 passing (93%)
Database: 8/8 passing (100%)
Smoke Tests: 16/19 passing (84%)
```

---

## 🚀 Deployment Plan

1. **Create feature branch:**
   ```bash
   git checkout -b fix/production-critical-issues
   ```

2. **Implement fixes in order:**
   - Secure cookies
   - Rate limiting
   - /tasks/new error
   - API authentication

3. **Test locally:**
   ```bash
   npm run dev
   # Test each fix
   ```

4. **Run all tests:**
   ```bash
   npm run type-check
   npm run lint
   npm test
   npx playwright test
   ```

5. **Deploy to staging:**
   ```bash
   git push origin fix/production-critical-issues
   # Trigger staging deployment
   # Run smoke tests against staging
   ```

6. **Deploy to production:**
   ```bash
   git checkout master
   git merge fix/production-critical-issues
   git push origin master
   # Deploy to production
   ```

7. **Verify in production:**
   ```bash
   # Run smoke tests against production
   npx playwright test tests/smoke/ --config=playwright.production.config.ts
   ```

---

## 📞 Support

If issues arise during implementation:
1. Check error logs in production
2. Rollback if critical functionality breaks
3. Review test failures for root cause
4. Contact team for assistance

**Estimated Total Time:** 4-6 hours
**Target Completion:** Within 24 hours
**Production Certification:** After all P0 fixes verified

---

**Generated by:** Claude Code - Test Automation Engineer
**Date:** 2026-01-13
