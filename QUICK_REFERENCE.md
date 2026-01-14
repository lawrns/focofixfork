# Authentication Testing - Quick Reference Guide

## 30-Second Summary

**Status:** ⚠️ CRITICAL - Response format inconsistencies in 6 endpoint files

**Problem:** Some endpoints bypass response helpers and return non-standard formats
- ✅ `/api/tasks`, `/api/projects` - Correct
- ❌ `/api/workspaces` POST, `/api/tasks/export`, `/api/crico/*` - Wrong

**Solution:** Use response helpers (2-3 hours to fix)

---

## Test Results

| Test | Result | Endpoints |
|------|--------|-----------|
| Unauthenticated access | ❌ FAILED | 3 pass, 6 fail |
| Response format | ❌ FAILED | 4 different patterns |
| Invalid auth headers | ⚠️ PARTIAL | Detection works, format broken |
| Public endpoints | ✅ PASS | None found |
| Unified 401 format | ❌ FAILED | 3/9 endpoints correct |

---

## What's Wrong

### Expected Format
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2026-01-14T10:30:00.000Z"
  }
}
```

### What 6 Endpoints Return (WRONG)
```json
{ "error": "Unauthorized" }
{ "success": false, "error": "..." }
```

---

## Files to Fix

1. `/src/app/api/workspaces/route.ts` - POST method
2. `/src/app/api/tasks/export/route.ts` - GET method
3. `/src/app/api/crico/audit/route.ts` - Both methods
4. `/src/app/api/crico/actions/route.ts` - Both methods
5. `/src/app/api/crico/alignment/route.ts` - Both methods
6. `/src/app/api/crico/suggestions/route.ts` - Both methods

---

## How to Fix

### Pattern 1: Replace Raw NextResponse.json()
```typescript
// WRONG
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// CORRECT
import { authRequiredResponse } from '@/lib/api/response-helpers'
return authRequiredResponse()
```

### Pattern 2: Replace Success Flag
```typescript
// WRONG
return NextResponse.json({ success: false, error: '...' }, { status: 401 })

// CORRECT
return authRequiredResponse()
```

### Pattern 3: Replace Custom Auth Handler
```typescript
// WRONG
const userId = await getAuthenticatedUser(request)
if (!userId) return NextResponse.json({ error: '...' }, { status: 401 })

// CORRECT
import { getAuthUser } from '@/lib/api/auth-helper'
const { user, error } = await getAuthUser(request)
if (error || !user) return authRequiredResponse()
```

---

## Helper Functions to Use

```typescript
// Auth errors (401)
authRequiredResponse()
tokenExpiredResponse()
tokenInvalidResponse()

// Validation errors (400)
missingFieldResponse('fieldName')
validationFailedResponse('message', details)

// Not found (404)
notFoundResponse('Resource', id)

// Server errors (500)
internalErrorResponse('message', details)
databaseErrorResponse('message', details)

// Success
successResponse(data, meta, status)
```

**Location:** `/src/lib/api/response-helpers.ts`

---

## Verification

### Before Fix
```bash
curl -s http://localhost:3000/api/tasks | jq '.error.code'
# "AUTH_REQUIRED" ✅

curl -s http://localhost:3000/api/crico/audit | jq '.error.code'
# (undefined) ❌
```

### After Fix
```bash
curl -s http://localhost:3000/api/crico/audit | jq '.error.code'
# "AUTH_REQUIRED" ✅
```

---

## Documentation Files

- **TESTING_COMPLETE_SUMMARY.md** - Complete test report
- **RESPONSE_ENVELOPE_VIOLATIONS_DETAIL.md** - Code examples
- **AUTHENTICATION_FLOW_TEST_REPORT.md** - Detailed findings
- **TEST_DOCUMENTATION_INDEX.md** - Navigation guide

---

## Priority

🔴 **CRITICAL** - Breaks client error handling
⏱️ **Effort:** 2-3 hours to fix
⚠️ **Must fix before production deployment**

---

## Key Files Referenced

- `/src/lib/api/response-envelope.ts` - Format specification
- `/src/lib/api/response-helpers.ts` - Helper functions
- `/src/app/api/tasks/route.ts` - Reference implementation (correct)

---

**Last Updated:** 2026-01-14
**Test Status:** Complete
**Action Required:** Fix violations immediately
