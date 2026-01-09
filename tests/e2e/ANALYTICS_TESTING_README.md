# Analytics & Reporting E2E Test Suite

Comprehensive end-to-end testing suite for Analytics & Reporting features covering user stories US-7.1, US-7.2, and US-7.3.

## 📋 Overview

This test suite validates the following user stories:

### US-7.1: Test Project Dashboard
- View project completion percentage
- Check task status distribution
- View team workload distribution
- Check timeline health status
- Verify real-time metric updates

### US-7.2: Test Team Performance Report
- Generate team performance report
- View individual contributor metrics
- Check on-time delivery percentage
- Export report as PDF
- View metrics over time

### US-7.3: Test Burndown Chart
- View burndown chart for project
- Complete tasks and verify chart updates
- Check velocity metrics
- View historical trends

## 🔑 Test Credentials

**Username:** `manager@demo.foco.local`
**Password:** `DemoManager123!`

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** (v7 or higher)
3. **Development server** running on `http://localhost:3000`

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests

#### Option 1: Using the Test Script (Recommended)

```bash
# Run the automated test script
./tests/e2e/run-analytics-tests.sh
```

This script will:
- Check environment setup
- Start dev server if not running
- Execute all analytics tests
- Generate comprehensive HTML report
- Display results and next steps

#### Option 2: Using Playwright Directly

```bash
# Run all analytics tests
npx playwright test tests/e2e/analytics-reporting.spec.ts

# Run with UI mode (interactive)
npx playwright test tests/e2e/analytics-reporting.spec.ts --ui

# Run specific test suite
npx playwright test tests/e2e/analytics-reporting.spec.ts -g "US-7.1"

# Run in debug mode
npx playwright test tests/e2e/analytics-reporting.spec.ts --debug

# Run headed (see browser)
npx playwright test tests/e2e/analytics-reporting.spec.ts --headed
```

#### Option 3: Using npm Scripts

```bash
# Add to package.json scripts section:
{
  "scripts": {
    "test:analytics": "playwright test tests/e2e/analytics-reporting.spec.ts",
    "test:analytics:ui": "playwright test tests/e2e/analytics-reporting.spec.ts --ui",
    "test:analytics:debug": "playwright test tests/e2e/analytics-reporting.spec.ts --debug"
  }
}

# Then run:
npm run test:analytics
```

## 📊 Test Reports

### Viewing Reports

After running tests, multiple report formats are generated:

#### 1. HTML Report (Primary)

```bash
# View Playwright HTML report
npx playwright show-report

# Or open directly
open test-results/analytics-reports/analytics-test-report-[timestamp].html
```

#### 2. JSON Report

```bash
# View raw test results
cat test-results/results.json | jq
```

#### 3. Console Output

Real-time test execution output with color-coded status indicators.

### Report Contents

Reports include:
- ✅ Test execution summary
- 📊 Success/failure metrics
- ⏱️ Test duration and performance
- 📋 User story coverage
- 🔍 Detailed test results
- ⚠️ Failure details and stack traces
- 📈 Trend analysis

## 🧪 Test Structure

### Test Files

```
tests/e2e/
├── analytics-reporting.spec.ts          # Main test suite
├── test-report-generator.ts             # Report generation utilities
├── run-analytics-tests.sh               # Automated test execution script
└── ANALYTICS_TESTING_README.md          # This file
```

### Test Organization

```typescript
// Test suites are organized by user story
describe('US-7.1: Test Project Dashboard', () => {
  // Tests for project dashboard functionality
});

describe('US-7.2: Test Team Performance Report', () => {
  // Tests for team performance reports
});

describe('US-7.3: Test Burndown Chart', () => {
  // Tests for burndown charts and trends
});
```

## 🎯 Test Scenarios

### Dashboard Tests (US-7.1)

1. **Project Completion Percentage**
   - Validates completion metrics display
   - Verifies percentage calculations (0-100%)
   - Checks progress visualization

2. **Task Status Distribution**
   - Validates status indicators (todo, in_progress, done)
   - Checks badge/label rendering
   - Verifies count accuracy

3. **Team Workload Distribution**
   - Validates team member displays
   - Checks workload metrics
   - Verifies task assignment data

4. **Timeline Health Status**
   - Validates health indicators
   - Checks overdue task tracking
   - Verifies timeline status

5. **Real-time Metric Updates**
   - Tests refresh functionality
   - Validates time range selection
   - Checks metric recalculation

### Team Performance Tests (US-7.2)

1. **Performance Report Generation**
   - Validates report data loading
   - Checks team metrics display
   - Verifies contributor information

2. **Individual Contributor Metrics**
   - Validates individual cards/rows
   - Checks task completion metrics
   - Verifies hours tracked data

3. **On-time Delivery Percentage**
   - Validates delivery metrics
   - Checks percentage calculations
   - Verifies overdue indicators

4. **Report Export**
   - Tests export button functionality
   - Validates format options (PDF, CSV, JSON)
   - Checks download behavior

5. **Metrics Over Time**
   - Tests time range selection
   - Validates trend data
   - Checks historical metrics

### Burndown Chart Tests (US-7.3)

1. **Chart Visualization**
   - Validates chart rendering (canvas/svg)
   - Checks visual elements
   - Verifies chart dimensions

2. **Task Completion Updates**
   - Tests workflow integration
   - Validates metric reflection
   - Checks real-time updates

3. **Velocity Metrics**
   - Validates velocity calculations
   - Checks throughput indicators
   - Verifies numeric values

4. **Historical Trends**
   - Tests trend visualization
   - Validates time series data
   - Checks date/time labels

## 🔧 Configuration

### Playwright Configuration

Located in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

### Test Credentials

Stored in test file as constants:

```typescript
const TEST_EMAIL = 'manager@demo.foco.local';
const TEST_PASSWORD = 'DemoManager123!';
```

## 🐛 Debugging

### Debug Mode

```bash
# Run with Playwright Inspector
npx playwright test tests/e2e/analytics-reporting.spec.ts --debug

# Debug specific test
npx playwright test tests/e2e/analytics-reporting.spec.ts --debug -g "should display project completion"
```

### Trace Viewer

```bash
# View trace for failed tests
npx playwright show-trace test-results/trace.zip
```

### Screenshots and Videos

Failed tests automatically capture:
- **Screenshots**: Saved to `test-results/`
- **Videos**: Saved to `test-results/` (if enabled)
- **Traces**: Saved to `test-results/` for debugging

### Verbose Logging

```bash
# Run with debug logs
DEBUG=pw:api npx playwright test tests/e2e/analytics-reporting.spec.ts
```

## 📈 Performance Considerations

### Test Execution Time

Average execution times:
- **US-7.1 Suite**: ~30-45 seconds
- **US-7.2 Suite**: ~25-35 seconds
- **US-7.3 Suite**: ~20-30 seconds
- **Total Suite**: ~75-110 seconds

### Optimization Tips

1. **Parallel Execution**: Tests run in parallel by default
2. **Selective Testing**: Run specific suites using `-g` flag
3. **Headed vs Headless**: Headless is faster
4. **Wait Strategies**: Use `waitForLoadState` instead of fixed timeouts

## 🔍 Common Issues and Solutions

### Issue: Tests Timeout

**Solution:**
```bash
# Increase timeout
npx playwright test --timeout=60000
```

### Issue: Server Not Running

**Solution:**
```bash
# Start dev server manually
npm run dev

# Or use the test script which auto-starts it
./tests/e2e/run-analytics-tests.sh
```

### Issue: Authentication Fails

**Solution:**
- Verify test credentials are correct
- Check if user exists in database
- Ensure authentication endpoints are working

### Issue: Elements Not Found

**Solution:**
- Check if UI has changed
- Update selectors in test file
- Use Playwright Inspector to find correct selectors

## 🎨 Best Practices

### Writing Tests

1. **Use Data Attributes**: Prefer `[data-testid]` selectors
2. **Avoid Hardcoded Waits**: Use `waitFor*` methods
3. **Test Isolation**: Each test should be independent
4. **Descriptive Names**: Use clear, descriptive test names
5. **Assertions**: Use specific assertions

Example:
```typescript
// Good
await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();

// Avoid
await page.waitForTimeout(5000);
```

### Test Organization

1. Group related tests in `describe` blocks
2. Use `beforeEach` for common setup
3. Clean up after tests if needed
4. Document test purpose in comments

## 📚 Additional Resources

### Playwright Documentation

- [Playwright Testing Library](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)

### Project Documentation

- Main README: `/README.md`
- API Documentation: `/docs/api.md`
- Architecture Guide: `/docs/architecture.md`

## 🤝 Contributing

### Adding New Tests

1. Follow existing test structure
2. Use descriptive test names
3. Add appropriate assertions
4. Update this README
5. Run tests before committing

### Test Review Checklist

- [ ] Test name is descriptive
- [ ] Proper assertions used
- [ ] No hardcoded waits
- [ ] Selectors are maintainable
- [ ] Test is isolated
- [ ] Documentation updated

## 📝 Test Validation Checklist

After running tests, verify:

- [ ] All test suites executed
- [ ] Dashboard metrics display correctly
- [ ] Team performance reports generate
- [ ] Export functionality works
- [ ] Charts and visualizations render
- [ ] No console errors
- [ ] Responsive design validated
- [ ] API integration verified

## 🎯 Expected Outcomes

After successful test execution:

1. **Dashboards**: ✅ Rendering correctly
2. **Metrics**: ✅ Displaying accurate data
3. **Reports**: ✅ Generating successfully
4. **Exports**: ✅ Working as expected
5. **Charts**: ✅ Visualizing data properly
6. **Performance**: ✅ Meeting requirements

## 📞 Support

For issues or questions:

1. Check this README first
2. Review Playwright documentation
3. Check test output and error messages
4. Review application logs
5. Contact development team

## 📜 License

This test suite is part of the Foco project and follows the same license.

---

**Last Updated:** 2026-01-09
**Version:** 1.0.0
**Maintained By:** Test Automation Team
