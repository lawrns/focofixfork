# Quick Start Guide: Project Management Tests (US-2.1 to US-2.4)

## 🚀 Get Started in 5 Minutes

### Step 1: Prerequisites Check

Ensure you have:
- ✅ Node.js installed (v18 or higher)
- ✅ npm installed
- ✅ Dependencies installed: `npm install`
- ✅ Playwright browsers: `npx playwright install`

### Step 2: Start Development Server

```bash
npm run dev
```

Wait for server to start at `http://localhost:3000`

### Step 3: Run Tests

#### Option A: Run All Tests (Recommended for first run)
```bash
npx playwright test tests/e2e/user-stories-project-management.spec.ts
```

#### Option B: Use Helper Script
```bash
chmod +x tests/e2e/run-project-management-tests.sh
./tests/e2e/run-project-management-tests.sh chromium
```

#### Option C: Interactive UI Mode (Best for debugging)
```bash
npx playwright test tests/e2e/user-stories-project-management.spec.ts --ui
```

### Step 4: View Results

```bash
npx playwright show-report
```

This opens an HTML report in your browser.

---

## 📋 What Gets Tested

| User Story | What It Tests | Expected Time |
|------------|---------------|---------------|
| **US-2.1** | Create project with title, description, timeline, team members | ~10s |
| **US-2.2** | View all projects, filter by status, sort projects | ~8s |
| **US-2.3** | Update project details and status | ~8s |
| **US-2.4** | Delete/archive and restore projects | ~8s |
| **Integration** | Complete CRUD workflow end-to-end | ~10s |

**Total Execution Time:** ~45-60 seconds

---

## 🔑 Demo Credentials

```
Email: manager@demo.foco.local
Password: DemoManager123!
```

These credentials are automatically used by the test suite.

---

## ✅ Success Looks Like

```
Running 10 tests using 1 worker

  ✓ US-2.1: Should create a new project with title and description
  ✓ US-2.1: Should add team members to project
  ✓ US-2.2: Should display all projects in organization
  ✓ US-2.2: Should filter projects by status
  ✓ US-2.2: Should sort projects by different criteria
  ✓ US-2.3: Should update project details
  ✓ US-2.3: Should update project status
  ✓ US-2.4: Should archive and delete project
  ✓ US-2.4: Should archive and restore project
  ✓ Integration: Complete CRUD workflow

  10 passed (45s)
```

---

## 🐛 Common Issues & Quick Fixes

### Issue: "Server not running"
```bash
# Fix: Start the dev server
npm run dev
```

### Issue: "Login failed"
```bash
# Fix: Verify demo user exists in database
# Check .env.local has correct Supabase credentials
```

### Issue: "Element not found"
```bash
# Fix: Run in UI mode to see what's happening
npx playwright test tests/e2e/user-stories-project-management.spec.ts --ui --debug
```

### Issue: "Tests are flaky"
```bash
# Fix: Run tests multiple times to identify pattern
npx playwright test tests/e2e/user-stories-project-management.spec.ts --repeat-each=3
```

---

## 📊 Generating Test Report

After running tests, fill out the report:

```bash
# Copy template
cp tests/e2e/TEST_REPORT_TEMPLATE.md tests/e2e/test-report-$(date +%Y%m%d).md

# Edit with your results
code tests/e2e/test-report-$(date +%Y%m%d).md
```

---

## 🎯 Quick Test Commands Reference

```bash
# Run all project management tests
npm run test:e2e -- tests/e2e/user-stories-project-management.spec.ts

# Run specific user story
npx playwright test tests/e2e/user-stories-project-management.spec.ts -g "US-2.1"

# Run in specific browser
npx playwright test tests/e2e/user-stories-project-management.spec.ts --project=firefox

# Run in debug mode
npx playwright test tests/e2e/user-stories-project-management.spec.ts --debug

# Run with video recording
npx playwright test tests/e2e/user-stories-project-management.spec.ts --video=on

# Generate trace for debugging
npx playwright test tests/e2e/user-stories-project-management.spec.ts --trace=on
```

---

## 📖 Need More Details?

- **Full Guide:** `tests/e2e/PROJECT_MANAGEMENT_TEST_GUIDE.md`
- **Report Template:** `tests/e2e/TEST_REPORT_TEMPLATE.md`
- **Test Code:** `tests/e2e/user-stories-project-management.spec.ts`

---

## 🎉 That's It!

You're ready to test Project Management user stories (US-2.1 to US-2.4).

**Questions?** Check the full test guide or reach out to the QA team.
