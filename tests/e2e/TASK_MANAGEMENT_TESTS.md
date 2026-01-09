# Task Management E2E Tests Documentation

## Overview
Comprehensive end-to-end tests for Task Management user stories (US-3.1 to US-3.4) using Playwright.

## Test Credentials
```
Email: member@demo.foco.local
Password: DemoMember123!
```

## Running the Tests

### Run all task management tests
```bash
npm run test:e2e -- tests/e2e/task-management.spec.ts
```

### Run with UI mode (recommended for debugging)
```bash
npx playwright test tests/e2e/task-management.spec.ts --ui
```

### Run specific test suite
```bash
# Create & Update tests only
npx playwright test tests/e2e/task-management.spec.ts -g "US-3.1"

# Status changes tests only
npx playwright test tests/e2e/task-management.spec.ts -g "US-3.2"

# Assignment & Collaboration tests only
npx playwright test tests/e2e/task-management.spec.ts -g "US-3.3"

# Search & Filter tests only
npx playwright test tests/e2e/task-management.spec.ts -g "US-3.4"
```

### Run in headed mode (see browser)
```bash
npx playwright test tests/e2e/task-management.spec.ts --headed
```

### Run with specific browser
```bash
npx playwright test tests/e2e/task-management.spec.ts --project=chromium
npx playwright test tests/e2e/task-management.spec.ts --project=firefox
npx playwright test tests/e2e/task-management.spec.ts --project=webkit
```

### Debug mode
```bash
npx playwright test tests/e2e/task-management.spec.ts --debug
```

## Test Coverage

### US-3.1: Create & Update Task
- ✅ **US-3.1.1**: Create task with full details (title, description, priority, due date)
- ✅ **US-3.1.2**: Create task with minimal information (title only)
- ✅ **US-3.1.3**: Validate required fields
- ✅ **US-3.1.4**: Update existing task

### US-3.2: Task Status Changes & Kanban
- ✅ **US-3.2.1**: Change task status from To Do to In Progress
- ✅ **US-3.2.2**: Change task status from In Progress to Done
- ✅ **US-3.2.3**: Verify progress updates when changing status
- ✅ **US-3.2.4**: Support kanban board view

### US-3.3: Task Assignment & Collaboration
- ✅ **US-3.3.1**: Assign task to team member
- ✅ **US-3.3.2**: Add comment to task
- ✅ **US-3.3.3**: Verify activity feed shows changes

### US-3.4: Search, Filter & Attachments
- ✅ **US-3.4.1**: Search tasks by title
- ✅ **US-3.4.2**: Filter tasks by priority
- ✅ **US-3.4.3**: Filter tasks by status
- ✅ **US-3.4.4**: Filter tasks by assignee
- ✅ **US-3.4.5**: Support file attachments

### Additional Tests
- ✅ **Comprehensive Workflow**: Complete task lifecycle (create → update → status changes → complete)

## Test Architecture

### Helper Functions

#### `login(page: Page)`
Handles authentication with demo credentials and navigates to dashboard.

#### `navigateToTasks(page: Page)`
Intelligently navigates to tasks section using multiple strategies:
- Direct task links
- Navigation menu items
- Via project pages

#### `createTask(page: Page, taskData)`
Creates a task with provided data:
```typescript
await createTask(page, {
  title: 'My Task',
  description: 'Task description',
  priority: 'high' | 'medium' | 'low' | 'urgent',
  dueDate: '2026-01-15'
})
```

## Adaptive Selectors

The tests use intelligent selector strategies that try multiple approaches to find elements:
- Data test IDs (`[data-testid="..."]`)
- Text content matching
- ID and name attributes
- ARIA roles and labels
- Class-based selectors (fallback)

This makes the tests resilient to UI changes and internationalization.

## Expected Test Results

### What to Verify

1. **Task Creation**: Tasks appear in the list after creation
2. **Task Updates**: Changes are persisted and visible
3. **Status Changes**: Task status transitions work correctly
4. **Assignment**: Team members can be assigned to tasks
5. **Comments**: Comments can be added and are visible
6. **Search/Filter**: Tasks can be filtered by various criteria
7. **Activity Feed**: Changes are tracked in activity log

### Known Considerations

- **Kanban Drag-and-Drop**: Tests verify kanban board existence; manual testing recommended for drag-and-drop
- **File Attachments**: Tests verify attachment UI exists; actual file upload should be tested manually
- **Activity Feed**: May be implemented at different levels (task, project, or global)

## Debugging Failed Tests

### Take screenshots on failure
```bash
npx playwright test tests/e2e/task-management.spec.ts --screenshot=on
```

### Generate trace for debugging
```bash
npx playwright test tests/e2e/task-management.spec.ts --trace=on
npx playwright show-trace trace.zip
```

### Increase timeout for slow connections
```bash
npx playwright test tests/e2e/task-management.spec.ts --timeout=60000
```

## Test Data Cleanup

Tests create tasks with unique timestamps to avoid conflicts. After testing, you may want to:
1. Delete test tasks manually via UI
2. Use the API to bulk delete test data
3. Reset the test database

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Task Management Tests
  run: npx playwright test tests/e2e/task-management.spec.ts

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: task-management-test-results
    path: playwright-report/
```

### Test Reports
After running tests, view the HTML report:
```bash
npx playwright show-report
```

## Manual Test Checklist

While E2E tests cover most scenarios, some functionality should be manually verified:

- [ ] Kanban drag-and-drop feels smooth and responsive
- [ ] File attachments upload correctly and can be downloaded
- [ ] Real-time collaboration updates work across multiple sessions
- [ ] Mobile responsive design for task management
- [ ] Keyboard navigation and shortcuts
- [ ] Accessibility with screen readers

## API Endpoints Tested

The tests interact with these API endpoints:
- `POST /api/tasks` - Create task
- `PUT /api/tasks/[id]` - Update task
- `GET /api/tasks` - List tasks (via UI interactions)

## Test Maintenance

### When to Update Tests

1. **UI Changes**: Update selectors if component structure changes
2. **New Features**: Add new test cases for additional functionality
3. **Bug Fixes**: Add regression tests for fixed bugs
4. **Workflow Changes**: Update helper functions if user flows change

### Selector Strategy

Tests use a fallback selector strategy. If the UI changes:
1. Add new selectors to the beginning of selector arrays
2. Keep old selectors as fallbacks
3. Remove selectors that are confirmed unused

Example:
```typescript
const createButtons = [
  '[data-testid="create-task-btn"]',  // New preferred selector
  'button:has-text("Create Task")',    // Text-based fallback
  'button:has-text("New Task")',       // Alternative text
  'button:has-text("+")'               // Icon-based fallback
]
```

## Performance Considerations

- Tests use `waitForTimeout` sparingly (only when necessary)
- Prefer `waitForSelector` and `waitForLoadState` for better reliability
- Each test is independent (creates its own data)
- Tests run in parallel when possible

## Success Metrics

✅ **All tests passing** = Task management functionality is working as expected
⚠️ **Some tests failing** = Review failures and determine if UI changed or bugs exist
❌ **All tests failing** = Authentication or navigation issues; check credentials and environment

## Support

If tests fail unexpectedly:
1. Check that dev server is running (`npm run dev`)
2. Verify test credentials are valid
3. Review Playwright trace for detailed execution steps
4. Check browser console for JavaScript errors
5. Ensure database is seeded with required test data

## Next Steps

1. Run tests with: `npm run test:e2e -- tests/e2e/task-management.spec.ts`
2. Review test report
3. Document any failures or UI mismatches
4. Update tests if needed for current UI implementation
5. Integrate into CI/CD pipeline
