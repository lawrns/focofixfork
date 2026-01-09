# Test Execution Guide - Milestone & Goals Features

Quick reference for running the comprehensive test suite for US-4.1, US-4.2, and US-5.1.

## Quick Start

### Run All Tests

```bash
# Unit tests
npm run test:run

# E2E tests (requires dev server)
npm run test:e2e
```

## Step-by-Step Execution

### 1. Unit Tests (Fast - No Server Required)

```bash
# Run all unit tests
npm run test:run

# Run specific test suites
npm run test:run src/lib/services/__tests__/milestones.test.ts
npm run test:run src/lib/services/__tests__/goals.service.test.ts

# Watch mode for development
npm run test

# With coverage report
npm run test:coverage
```

**Expected Results:**
- Milestones Service: 12+ tests passing
- Goals Service: 15+ tests passing
- Total: 27+ tests passing

### 2. E2E Tests (Requires Running Server)

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run E2E tests
npm run test:e2e

# Or run specific test files
npx playwright test tests/e2e/milestones.spec.ts
npx playwright test tests/e2e/goals.spec.ts

# Run with UI for debugging
npm run test:e2e:ui
```

**Expected Results:**
- Milestone Tests (US-4.1 & US-4.2): 8+ tests
- Goals Tests (US-5.1): 9+ tests
- Total: 17+ E2E tests

## Test Files Location

### Unit Tests
- `/src/lib/services/__tests__/milestones.test.ts` - Milestone service unit tests
- `/src/lib/services/__tests__/goals.service.test.ts` - Goals service unit tests

### E2E Tests
- `/tests/e2e/milestones.spec.ts` - Milestone user workflow tests
- `/tests/e2e/goals.spec.ts` - Goals user workflow tests

## Demo Credentials

The E2E tests use these demo credentials:
- Email: `owner@demo.foco.local`
- Password: `DemoOwner123!`

## Understanding Test Results

### Unit Tests Output

```bash
✓ src/lib/services/__tests__/milestones.test.ts (12 tests)
  ✓ MilestonesService
    ✓ getUserMilestones
      ✓ should fetch milestones for authenticated user
      ✓ should filter milestones by project_id
      ✓ should filter milestones by status
      ...
```

### E2E Tests Output

```bash
Running 8 tests using 3 workers

  ✓ [chromium] › milestones.spec.ts:10:7 › should create a milestone with name and date
  ✓ [chromium] › milestones.spec.ts:45:7 › should associate tasks with milestone
  ✓ [chromium] › goals.spec.ts:12:7 › should create goal with name and description
  ...

  8 passed (30s)
```

## Troubleshooting

### Unit Tests

**Issue:** Tests fail with "Cannot find module"
```bash
# Solution: Install dependencies
npm install
```

**Issue:** Mock errors
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules/.vite
npm run test:run
```

### E2E Tests

**Issue:** "Target closed" or timeout errors
```bash
# Solution: Ensure dev server is running
npm run dev

# Wait for server to be ready, then run tests
npm run test:e2e
```

**Issue:** Tests can't find elements
```bash
# Solution: Run with UI mode to debug
npm run test:e2e:ui

# Or run with headed mode to see browser
npx playwright test --headed
```

**Issue:** Login fails
```bash
# Solution: Verify demo credentials are set up in database
# Email: owner@demo.foco.local
# Password: DemoOwner123!
```

## Test Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# View report
open coverage/index.html
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:run

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install
      - run: npm run build
      - run: npm run test:e2e
```

## Feature Coverage

### US-4.1: Create Milestone
- ✅ Unit tests: Milestone creation, updates, status changes
- ✅ E2E tests: Complete user workflow

### US-4.2: Milestone Timeline View
- ✅ E2E tests: Timeline view, drag-and-drop, task visualization

### US-5.1: Create Goal
- ✅ Unit tests: Goal CRUD, key results, project linking
- ✅ E2E tests: Complete user workflow with validation

## Additional Commands

### Lint Tests
```bash
npm run lint
```

### Type Check
```bash
npx tsc --noEmit
```

### Run Specific Test Pattern
```bash
npm run test:run -- --reporter=verbose
npm run test:run -- --coverage
```

## Next Steps After Testing

1. Review test results in terminal output
2. Check coverage report: `coverage/index.html`
3. Review E2E test screenshots (on failures): `test-results/`
4. Address any failing tests
5. Integrate into CI/CD pipeline

## Support

For detailed test implementation, refer to:
- `MILESTONE_GOALS_TEST_REPORT.md` - Comprehensive test documentation
- Test files themselves for specific test logic
- Vitest docs: https://vitest.dev
- Playwright docs: https://playwright.dev

---

**Quick Test Command Reference:**

```bash
# Unit tests
npm run test:run                                    # All unit tests
npm run test                                        # Watch mode
npm run test:coverage                              # With coverage

# E2E tests
npm run test:e2e                                   # All E2E tests
npm run test:e2e:ui                               # With UI
npx playwright test tests/e2e/milestones.spec.ts # Specific file

# Combined
npm run test:all                                   # All tests (if configured)
```
