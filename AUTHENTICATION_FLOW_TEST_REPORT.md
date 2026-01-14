# Authentication Flow & Response Envelope Contract Test Report

## Executive Summary

Testing of the authentication flow and protected API routes revealed **CRITICAL INCONSISTENCIES** in response envelope format across endpoints. Multiple endpoints do not conform to the canonical response envelope specification, creating a fragmented API contract.

**Test Date:** 2026-01-14
**Status:** FAILING - Multiple endpoints violate response envelope contract

---

## Expected Response Envelope Format

All API endpoints MUST conform to this canonical format:

### Success Response (2xx)
```json
{
  "ok": true,
  "data": <T>,
  "error": null,
  "meta": {
    "pagination": { ... },
    "timing": { ... }
  }
}
```

### Error Response (4xx/5xx)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "timestamp": "2026-01-14T10:30:00.000Z",
    "details": { ... },
    "requestId": "req-uuid",
    "stack": "..."
  },
  "meta": { ... }
}
```

### Key Invariants
1. `ok` field clearly distinguishes success from failure
2. `data` and `error` are mutually exclusive (XOR)
3. Error codes are machine-readable (uppercase with underscores)
4. All responses include timestamp
5. All 401 responses use consistent structure

---

## Test Cases

### Test 1: Unauthenticated Access to Protected Endpoints

**Expected Behavior:** All protected endpoints should return identical 401 response format

**Test Commands:**
```bash
curl -s http://localhost:3000/api/tasks | jq .
curl -s http://localhost:3000/api/projects | jq .
curl -s http://localhost:3000/api/workspaces | jq .
```

**Expected Response:**
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

---

## Findings

### CRITICAL ISSUES FOUND

#### 1. **Inconsistent Response Format in `/api/workspaces` (POST)**

**File:** `/Users/lukatenbosch/focofixfork/src/app/api/workspaces/route.ts`
**Lines:** 76-79, 86-89, 109-112, 135-138, 142-151, 156-159

**Issue:** POST endpoint uses raw `NextResponse.json()` instead of response helpers

**Current (WRONG):**
```typescript
// Line 76-79 - 401 Auth Error
return NextResponse.json(
  { error: 'Unauthorized' },
  { status: 401 }
)

// Line 86-89 - 400 Validation Error
const errorRes = NextResponse.json(
  { error: 'Missing required fields: name, slug' },
  { status: 400 }
)

// Line 142-151 - Success Response
const successRes = NextResponse.json(
  {
    workspace: {
      id: newOrg.id,
      name: newOrg.name,
      slug: newOrg.slug,
      icon,
    },
  },
  { status: 201 }
)
```

**Should Be:**
```typescript
// 401 Auth Error
return authRequiredResponse()

// 400 Validation Error
return missingFieldResponse('name, slug')

// Success Response
return successResponse(result.data, undefined, 201)
```

**Impact:**
- Breaks client error handling (no error.code)
- Missing timestamp in error responses
- Inconsistent response shape
- Cannot use type guards (isSuccess, isError)

---

#### 2. **Inconsistent Response Format in `/api/tasks/export`**

**File:** `/Users/lukatenbosch/focofixfork/src/app/api/tasks/[id]/export/route.ts`
**Lines:** 53, 65-68, 73-76, 87-89, 127-130, 149-151

**Issue:** All error responses use non-standard format with `{ success: false, error: '...' }`

**Current (WRONG):**
```typescript
// Line 53 - 401 Auth Error
return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

// Line 65-68 - 400 Validation Error
return NextResponse.json(
  { success: false, error: 'Invalid format. Use csv or json.' },
  { status: 400 }
)
```

**Should Be:**
```typescript
return authRequiredResponse()
return validationFailedResponse('Invalid format. Use csv or json.')
```

**Impact:**
- Uses `success` field instead of `ok`
- No error code for machine-readable handling
- Missing timestamp
- Different error field structure

---

#### 3. **Inconsistent Response Format in `/api/crico/audit`**

**File:** `/Users/lukatenbosch/focofixfork/src/app/api/crico/audit/route.ts`
**Lines:** 31, 47, 53, 56, 61, 66, 72, 76, 80, 88, 98, 106, 117, 121, 125

**Issue:** Uses `{ success: true/false, data: ... }` instead of canonical format

**Current (WRONG):**
```typescript
// Line 31 - 401 Auth Error
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Line 47 - Success
return NextResponse.json({ success: true, data: { entries } })

// Line 53 - 400 Validation Error
return NextResponse.json({ error: 'actionId is required' }, { status: 400 })
```

**Should Be:**
```typescript
return authRequiredResponse()
return successResponse(entries)
return missingFieldResponse('actionId')
```

**Impact:**
- Multiple response formats (sometimes error object at root, sometimes nested)
- Inconsistent success indication
- No timestamp in errors
- No error codes

---

#### 4. **Similar Issues in Other CRICO Endpoints**

**Files with Same Pattern:**
- `/api/crico/audit/route.ts` (27 violations)
- `/api/crico/actions/route.ts` (similar pattern)
- `/api/crico/alignment/route.ts` (similar pattern)
- `/api/crico/suggestions/route.ts` (similar pattern)
- `/api/crico/voice/route.ts` (likely similar)

---

## Response Format Comparison

### Standard (CORRECT)
```typescript
// Import helpers
import {
  authRequiredResponse,
  successResponse,
  errorResponse
} from '@/lib/api/response-helpers'

// 401 Auth Error
if (error || !user) {
  return authRequiredResponse()
}

// 400 Validation Error
if (!name) {
  return missingFieldResponse('name')
}

// Success Response
return successResponse(data, meta, 201)
```

**Response Format:**
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

---

### Non-Standard (WRONG PATTERNS FOUND)

#### Pattern 1: Raw NextResponse with error field
```typescript
NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```
Response:
```json
{ "error": "Unauthorized" }
```

#### Pattern 2: Success/failure flag
```typescript
NextResponse.json({ success: true, data: {...} })
NextResponse.json({ success: false, error: '...' })
```

#### Pattern 3: Workspace response (nested data)
```typescript
NextResponse.json({
  workspace: {
    id: '...',
    name: '...'
  }
})
```

#### Pattern 4: Different error location
```typescript
NextResponse.json({ error: 'message' }, { status: 400 })
```

---

## HTTP Status Code Mapping

**Correct mapping per response-envelope.ts:**
| Error Code | HTTP Status |
|------------|------------|
| AUTH_REQUIRED | 401 |
| TOKEN_EXPIRED | 401 |
| TOKEN_INVALID | 401 |
| FORBIDDEN | 403 |
| NOT_FOUND | 404 |
| VALIDATION_FAILED | 400 |
| INTERNAL_ERROR | 500 |

**Verification Results:**
- ✅ `/api/tasks` - Correct (uses authRequiredResponse)
- ✅ `/api/projects` - Correct (uses authRequiredResponse)
- ❌ `/api/workspaces` POST - Uses NextResponse.json with status 401
- ❌ `/api/tasks/export` - Uses NextResponse.json with status 401
- ❌ `/api/crico/*` - Uses NextResponse.json with various status codes

---

## Root Cause Analysis

### Why This Happened

1. **Inconsistent Development Process**
   - Response helpers exist and are well-designed (`response-envelope.ts`, `response-helpers.ts`)
   - But not all developers know about or use them
   - No linting rule enforces their use

2. **Legacy Endpoints**
   - Some endpoints (crico, export, workspaces POST) were likely added before response helpers were standardized
   - No refactoring pass to align them

3. **Copy-Paste Anti-Pattern**
   - Raw `NextResponse.json()` calls are easier to write quickly
   - Developers didn't check for existing patterns

---

## Impact Analysis

### For Clients
- **Type Safety Lost:** Can't use type guards `isSuccess()` and `isError()`
- **Error Handling Broken:** No error code to handle different error types
- **Debugging Harder:** Missing timestamp for request correlation
- **Inconsistent Logic:** Different error formats require different handling per endpoint

### For Server
- **No Machine-Readable Errors:** Can't programmatically distinguish error types
- **Harder to Monitor:** Missing error codes in logs
- **API Fragmentation:** Not a consistent API contract

### For Testing
- **Contract Tests Fail:** Can't write unified tests for all endpoints
- **Integration Tests Harder:** Must handle multiple response formats

---

## Recommendations

### Priority 1: Fix Existing Violations (BLOCKING)

1. **Fix `/api/workspaces` POST endpoint**
   - Replace all `NextResponse.json()` with appropriate helpers
   - Use `authRequiredResponse()` for 401
   - Use `missingFieldResponse()` for 400
   - Use `successResponse()` for 201

2. **Fix `/api/tasks/export` endpoint**
   - Replace `{ success: false, error: '...' }` with `authRequiredResponse()`
   - Replace all validation errors with proper error helpers
   - Use `successResponse()` for actual file downloads (or return file directly)

3. **Fix all CRICO endpoints** (`/api/crico/*`)
   - Refactor all endpoints to use response helpers
   - Ensure consistent 401/400/500 responses
   - Add proper error codes

### Priority 2: Prevent Future Violations

1. **Add ESLint Rule**
   ```typescript
   // ESLint rule to detect raw NextResponse.json in api/
   // Alert when NextResponse.json() used without response helpers
   ```

2. **Add Pre-commit Hook**
   ```bash
   # Validate all new route.ts files use response helpers
   ```

3. **Update Architecture Documentation**
   - Document that ALL endpoints must use `response-helpers`
   - Add code examples to developer guide

4. **Add Contract Tests**
   - Run against all endpoints
   - Validate response envelope shape
   - Check error codes and timestamps

---

## Verification Commands

Once fixed, verify with:

```bash
# Test unauthenticated access
curl -s http://localhost:3000/api/tasks | jq '.error.code'
# Expected: "AUTH_REQUIRED"

curl -s http://localhost:3000/api/projects | jq '.error.code'
# Expected: "AUTH_REQUIRED"

curl -s http://localhost:3000/api/workspaces | jq '.error.code'
# Expected: "AUTH_REQUIRED"

# Test with invalid token
curl -s -H "Authorization: Bearer invalid" \
  http://localhost:3000/api/tasks | jq '.'
# Expected: AUTH_REQUIRED or TOKEN_INVALID code

# Verify response structure
curl -s http://localhost:3000/api/tasks | jq 'keys'
# Expected: ["ok", "data", "error", ...]

curl -s http://localhost:3000/api/tasks | jq '.error | keys'
# Expected: ["code", "message", "timestamp", ...]
```

---

## Files Requiring Changes

### CRITICAL (Breaking API Contract)
1. `/src/app/api/workspaces/route.ts` - POST method (7 violations)
2. `/src/app/api/tasks/export/route.ts` - GET method (6 violations)
3. `/src/app/api/crico/audit/route.ts` - GET & POST (27+ violations)
4. `/src/app/api/crico/actions/route.ts` - Multiple methods
5. `/src/app/api/crico/alignment/route.ts` - Multiple methods
6. `/src/app/api/crico/suggestions/route.ts` - Multiple methods

### Related Files to Audit
- `/src/app/api/crico/voice/route.ts`
- `/src/app/api/tasks/[id]/create-next/route.ts`
- Any other CRICO endpoints

---

## Testing Strategy

### Unit Tests
- Test each helper function returns correct shape
- Test error code to HTTP status mapping

### Integration Tests
- Test each endpoint without authentication
- Verify 401 response format
- Test with invalid token
- Test validation errors
- Test success responses

### Contract Tests
- Validate all endpoints conform to response envelope
- Verify timestamp format (ISO 8601)
- Verify error codes are uppercase with underscores
- Verify ok/data/error mutual exclusion

---

## Conclusion

The project has a well-designed response envelope specification but **inconsistent implementation across endpoints**. Multiple endpoints violate the contract, creating a fragmented API that's harder to consume and maintain.

**Required Action:** Fix all identified violations before deploying to production. The inconsistency breaks client error handling and violates the API contract.

---

## Appendix: Response Helper Reference

```typescript
// Auth errors
authRequiredResponse(message?: string)        // 401
tokenExpiredResponse(message?: string)        // 401
tokenInvalidResponse(message?: string)        // 401

// Authorization errors
forbiddenResponse(message?: string)           // 403

// Validation errors
missingFieldResponse(field: string)           // 400
validationFailedResponse(message, details)    // 400

// Not found errors
notFoundResponse(resource, id)                // 404

// Server errors
internalErrorResponse(message, details)       // 500
databaseErrorResponse(message, details)       // 500

// Success response
successResponse(data, meta, status=200)       // 200/201
```

All helpers automatically:
- Set correct HTTP status code
- Include ISO 8601 timestamp
- Use proper error codes
- Return proper envelope structure
