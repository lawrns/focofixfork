# Project Management E2E Test Guide (US-2.1 to US-2.4)

## Overview

This guide provides instructions for executing and validating the Project Management user stories (US-2.1 to US-2.4) using automated E2E tests with Playwright.

## Test Suite Location

**File:** `/tests/e2e/user-stories-project-management.spec.ts`

## Demo Credentials

```
Email: manager@demo.foco.local
Password: DemoManager123!
```

## User Stories Covered

### US-2.1: Create Project
- **Objective:** Create project with title and description
- **Features Tested:**
  - Project creation form
  - Adding title and description
  - Setting project timeline (start date, due date)
  - Adding team members (if available)
  - Verification project appears in dashboard

### US-2.2: View Projects
- **Objective:** View all projects in organization
- **Features Tested:**
  - Display all projects in list/table view
  - Filter projects by status
  - Sort projects by different criteria
  - Display project metadata (title, status, dates)

### US-2.3: Update Project
- **Objective:** Edit project details
- **Features Tested:**
  - Edit project title
  - Edit project description
  - Update project status
  - Update project dates
  - Save and verify changes

### US-2.4: Delete Project
- **Objective:** Archive and restore project
- **Features Tested:**
  - Archive/soft delete project
  - Restore archived project
  - Permanent delete project
  - Confirm deletion with warning

## Prerequisites

1. **Node.js and npm installed**
2. **Dependencies installed:**
   ```bash
   npm install
   ```

3. **Playwright browsers installed:**
   ```bash
   npx playwright install
   ```

4. **Development server running:**
   ```bash
   npm run dev
   ```
   The server should be accessible at `http://localhost:3000`

5. **Demo user account exists** in the database with credentials:
   - Email: `manager@demo.foco.local`
   - Password: `DemoManager123!`

## Running the Tests

### Run All Project Management Tests

```bash
npm run test:e2e -- tests/e2e/user-stories-project-management.spec.ts
```

### Run Tests in Specific Browser

```bash
# Chromium
npm run test:e2e -- tests/e2e/user-stories-project-management.spec.ts --project=chromium

# Firefox
npm run test:e2e -- tests/e2e/user-stories-project-management.spec.ts --project=firefox

# WebKit (Safari)
npm run test:e2e -- tests/e2e/user-stories-project-management.spec.ts --project=webkit
```

### Run Tests in UI Mode (Interactive)

```bash
npm run test:e2e:ui -- tests/e2e/user-stories-project-management.spec.ts
```

### Run Specific Test

```bash
# Run only US-2.1 create project test
npx playwright test tests/e2e/user-stories-project-management.spec.ts -g "US-2.1"

# Run only US-2.2 view projects test
npx playwright test tests/e2e/user-stories-project-management.spec.ts -g "US-2.2"

# Run only US-2.3 update project test
npx playwright test tests/e2e/user-stories-project-management.spec.ts -g "US-2.3"

# Run only US-2.4 delete project test
npx playwright test tests/e2e/user-stories-project-management.spec.ts -g "US-2.4"
```

### Run Tests with Debug Mode

```bash
npx playwright test tests/e2e/user-stories-project-management.spec.ts --debug
```

### Run Tests and Generate HTML Report

```bash
npm run test:e2e -- tests/e2e/user-stories-project-management.spec.ts
npx playwright show-report
```

## Test Cases

### 1. US-2.1: Create Project Tests

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Create project with title and description | User creates a new project with basic details | Project appears in project list |
| Add team members | User adds team members to project | Team members are visible in project |

### 2. US-2.2: View Projects Tests

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Display all projects | View all projects in organization | All projects are visible with metadata |
| Filter by status | Apply status filter to projects | Projects are filtered correctly |
| Sort projects | Sort projects by different criteria | Projects are reordered based on sort option |

### 3. US-2.3: Update Project Tests

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Update project details | Edit project title and description | Changes are saved and visible |
| Update project status | Change project status | Status is updated successfully |

### 4. US-2.4: Delete Project Tests

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Delete project | Delete a project permanently | Project is removed from list |
| Archive and restore | Archive project then restore it | Project is archived then restored successfully |

### 5. Integration Test

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Complete CRUD workflow | Create, view, update, delete in sequence | All operations complete successfully |

## Expected Test Output

### Successful Test Run

```
Running 10 tests using 1 worker

  ✓ US-2.1: Should create a new project with title and description (5.2s)
  ✓ US-2.1: Should add team members to project (3.8s)
  ✓ US-2.2: Should display all projects in organization (2.1s)
  ✓ US-2.2: Should filter projects by status (3.5s)
  ✓ US-2.2: Should sort projects by different criteria (2.8s)
  ✓ US-2.3: Should update project details (4.6s)
  ✓ US-2.3: Should update project status (3.2s)
  ✓ US-2.4: Should archive and delete project (4.1s)
  ✓ US-2.4: Should archive and restore project (4.9s)
  ✓ Integration: Complete CRUD workflow for project management (8.3s)

  10 passed (42.5s)
```

## Troubleshooting

### Common Issues

#### 1. Test Fails to Login

**Symptom:** Test fails at login step with timeout error

**Solutions:**
- Verify demo user exists in database
- Check credentials are correct: `manager@demo.foco.local` / `DemoManager123!`
- Ensure development server is running on `http://localhost:3000`
- Check Supabase connection in `.env.local`

#### 2. Elements Not Found

**Symptom:** Test fails with "Element not found" error

**Solutions:**
- Verify the UI components exist in the application
- Check if element selectors match the actual HTML structure
- Increase timeout values if elements load slowly
- Use Playwright UI mode to debug: `npm run test:e2e:ui`

#### 3. Test Skipped

**Symptom:** Test shows as "skipped" in results

**Solutions:**
- This indicates a feature is not available in the current UI
- Review the console output for skip reasons
- Verify the feature is implemented in the application

#### 4. Flaky Tests

**Symptom:** Tests pass sometimes but fail other times

**Solutions:**
- Add appropriate `waitForTimeout()` or `waitForLoadState()` calls
- Ensure database state is consistent between test runs
- Check for race conditions in UI rendering
- Use Playwright's auto-waiting features

#### 5. Server Not Running

**Symptom:** Test fails immediately with connection error

**Solutions:**
- Start development server: `npm run dev`
- Verify server is accessible at `http://localhost:3000`
- Check port 3000 is not used by another process

## Test Report Template

After running tests, fill out this report:

### Test Execution Report

**Date:** [DATE]
**Tester:** [NAME]
**Environment:** [Development/Staging/Production]
**Browser:** [Chromium/Firefox/WebKit]

#### Test Results Summary

| User Story | Test Cases | Passed | Failed | Skipped | Notes |
|------------|------------|--------|--------|---------|-------|
| US-2.1 | 2 | | | | |
| US-2.2 | 3 | | | | |
| US-2.3 | 2 | | | | |
| US-2.4 | 2 | | | | |
| Integration | 1 | | | | |
| **Total** | **10** | | | | |

#### CRUD Operations Status

- [ ] **Create:** All CRUD operations working
- [ ] **Read:** Filter/sort functionality working
- [ ] **Update:** Project details can be modified
- [ ] **Delete:** Projects can be deleted/archived

#### Issues Found

| Issue ID | Description | Severity | User Story | Status |
|----------|-------------|----------|------------|--------|
| | | | | |

#### Screenshots

Attach screenshots of:
1. Project list view
2. Project creation form
3. Project edit form
4. Filter/sort functionality
5. Any errors encountered

#### Recommendations

[List any recommendations for improvements or bug fixes]

#### Sign-off

- [ ] All critical tests passed
- [ ] All issues documented
- [ ] Report reviewed

**Tester Signature:** _______________  **Date:** _______________

## Continuous Integration

To run these tests in CI/CD pipeline, add to your workflow:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests - Project Management

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e -- tests/e2e/user-stories-project-management.spec.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Additional Resources

- **Playwright Documentation:** https://playwright.dev/
- **Project API Documentation:** `/src/app/api/projects/route.ts`
- **Project Components:** `/src/features/projects/`
- **Test Best Practices:** See `/tests/README.md`

## Support

For issues or questions about the tests, contact the QA team or open an issue in the project repository.
