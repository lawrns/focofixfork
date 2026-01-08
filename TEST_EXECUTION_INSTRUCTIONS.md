# Test Execution Instructions

## Quick Start

Due to environment constraints, please execute the following commands manually:

### Option 1: Run Comprehensive Test Script (Recommended)
```bash
./run-comprehensive-tests.sh
```

This script will:
- Run linting
- Run type checking
- Execute all unit tests
- Execute integration tests
- Execute contract tests
- Execute component tests
- Execute service tests
- Generate coverage report
- Display comprehensive summary

### Option 2: Run Individual Test Suites

#### All Tests with Coverage
```bash
npm run test:coverage
```

#### Unit Tests Only
```bash
npm run test:unit
```

#### Integration Tests
```bash
npm run test:integration
```

#### Contract Tests
```bash
npm run test:contract
```

#### All Tests (No Coverage)
```bash
npm run test:run
```

## Expected Results

### Test Counts
- **Total Test Files**: 43
- **Estimated Test Cases**: 150-200
- **Expected Pass Rate**: 100%
- **Coverage Target**: 70%+

### Test Categories
1. **Unit Tests** (11 files) - Services, components, utilities
2. **Voice Feature Tests** (8 files) - Voice planning functionality
3. **Integration Tests** (2 files) - API integration
4. **E2E Tests** (12 files) - User journeys (Playwright)
5. **Performance Tests** (1 file) - Benchmarks
6. **Smoke Tests** (3 files) - Quick validation

## What to Check

### 1. Linting (Should Already Pass ✅)
```bash
npm run lint
```
- **Expected**: 0 errors, warnings acceptable
- **Status**: ✅ Confirmed passing

### 2. Test Execution
Look for:
- ✅ No failed tests
- ✅ No import errors
- ✅ No module not found errors
- ✅ Coverage above 70%

### 3. Common Issues After Consolidation

#### Issue: Import Path Errors
**Symptom**: `Cannot find module '@/components/voice/...'`

**Fix**:
```typescript
// Old import
import { Component } from '@/components/voice/component';

// New import
import { Component } from '@/features/voice/components/component';
```

#### Issue: API Route 404 Errors
**Symptom**: Tests fail with 404 on API routes

**Fix**: Update API paths in integration tests to match consolidated routes

#### Issue: Mock Signature Mismatch
**Symptom**: TypeScript errors in test mocks

**Fix**: Update mock implementations to match new service signatures

## After Running Tests

### If All Tests Pass ✅

1. Review coverage report:
   ```bash
   open coverage/index.html
   ```

2. Commit the validation:
   ```bash
   git add .
   git commit -m "Phase Tests: Comprehensive test validation passing"
   ```

### If Tests Fail ❌

1. **Identify the failure**:
   - Read error message
   - Note which test file failed
   - Check if it's import-related, API-related, or logic-related

2. **Fix based on error type**:

   **Import Errors**:
   - Update import paths for moved components
   - Check `/src/features/` structure

   **API Errors**:
   - Verify API route paths
   - Check consolidated route structure
   - Update test expectations

   **Logic Errors**:
   - Review consolidation changes
   - Verify service signatures
   - Update test mocks

3. **Re-run tests**:
   ```bash
   npm run test:run
   ```

4. **Repeat until all pass**

## Coverage Analysis

### View Coverage Report
```bash
npm run test:coverage
open coverage/index.html
```

### Coverage Targets
- **Overall**: 70%+
- **Unit Tests**: 80%+
- **Integration**: 60%+
- **E2E**: 50%+

### Well-Covered Areas (Expected)
- ✅ Authentication service
- ✅ Database service
- ✅ Voice feature (8 test files)
- ✅ UI components
- ✅ API contracts

### Areas Needing Coverage (Known)
- ⚠️ Dashboard widgets
- ⚠️ Goal service
- ⚠️ Export functionality
- ⚠️ Analytics service

## Troubleshooting

### Tests Won't Run
```bash
# Ensure dependencies installed
npm install

# Clear cache
npx vitest run --clearCache

# Try with explicit config
npx vitest run --config vitest.config.ts
```

### Import Errors Persist
```bash
# Check TypeScript paths
npm run type-check

# Verify paths in tsconfig.json
cat tsconfig.json | grep -A 5 "paths"
```

### Coverage Not Generating
```bash
# Install coverage provider
npm install --save-dev @vitest/coverage-v8

# Run with explicit coverage
npx vitest run --coverage
```

## Files Created

1. **TEST_VALIDATION_REPORT.md** - Comprehensive analysis of test structure
2. **run-comprehensive-tests.sh** - Automated test execution script
3. **TEST_EXECUTION_INSTRUCTIONS.md** - This file

## Next Steps

1. ✅ Run tests: `./run-comprehensive-tests.sh`
2. ⏳ Review results
3. ⏳ Fix any failures
4. ⏳ Verify coverage ≥ 70%
5. ⏳ Commit passing validation

---

**Generated**: 2026-01-08
**Phase**: Post-Consolidation Test Validation
**Status**: Ready for Manual Execution
