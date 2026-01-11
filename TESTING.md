# Testing Documentation

## Overview

This document describes the comprehensive testing infrastructure for Foco, including unit tests, integration tests, and end-to-end tests.

## Test Stack

- **Unit/Integration Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright
- **Coverage Target**: 70% minimum across all metrics

## Running Tests

### Unit & Integration Tests

```bash
# Run all Jest tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- path/to/test.spec.ts
```

### E2E Tests

```bash
# Run all Playwright tests
npm run test:e2e

# Run in UI mode
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/complete-workflow.spec.ts

# Generate test report
npx playwright show-report
```

## Test Structure

### Unit Tests

Located in `src/**/__tests__/` or `src/**/*.test.{ts,tsx}`

**Coverage includes:**
- Utility functions (`src/lib/utils`)
- React hooks (`src/lib/hooks`)
- UI components (`src/components`)
- Store logic (`src/lib/stores`)

**Example:**
```typescript
// src/lib/utils/__tests__/cn.test.ts
import { cn } from '../cn'

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })
})
```

### Integration Tests

Located in `src/app/api/**/__tests__/`

**Coverage includes:**
- API route handlers
- Database operations
- Authentication flows
- Data transformations

**Example:**
```typescript
// src/app/api/projects/__tests__/route.test.ts
describe('Projects API', () => {
  it('should fetch projects for authenticated user', async () => {
    const response = await GET(mockRequest)
    expect(response.status).toBe(200)
  })
})
```

### E2E Tests

Located in `tests/e2e/`

**Coverage includes:**
- Complete user workflows
- Navigation flows
- Form submissions
- API integrations
- Performance metrics
- Accessibility checks

**Example:**
```typescript
// tests/e2e/complete-workflow.spec.ts
test('should complete full project creation workflow', async ({ page }) => {
  await page.goto('/login')
  // ... test steps
})
```

## Test Utilities

### Mock Data

```typescript
// tests/mocks/data.ts
export const mockProject = {
  id: '1',
  name: 'Test Project',
  status: 'active',
}
```

### Test Helpers

```typescript
// tests/helpers/render.tsx
export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <TooltipProvider>
        {ui}
      </TooltipProvider>
    </AuthProvider>
  )
}
```

## Coverage Requirements

| Metric | Minimum | Target |
|--------|---------|--------|
| Statements | 70% | 80% |
| Branches | 70% | 80% |
| Functions | 70% | 80% |
| Lines | 70% | 80% |

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Pre-deployment

### GitHub Actions Workflow

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
      - run: npx playwright install
      - run: npm run test:e2e
```

## Best Practices

### Writing Tests

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Descriptive Names**: Use clear test descriptions
3. **Isolation**: Each test should be independent
4. **Mock External Dependencies**: Don't rely on real APIs
5. **Test User Behavior**: Focus on what users do, not implementation

### What to Test

✅ **Do Test:**
- User interactions
- Edge cases
- Error handling
- Accessibility
- Performance critical paths

❌ **Don't Test:**
- Third-party libraries
- Implementation details
- Trivial code

### Example Test Pattern

```typescript
describe('Component/Feature Name', () => {
  // Setup
  beforeEach(() => {
    // Common setup
  })

  // Happy path
  it('should handle normal case', () => {
    // Test
  })

  // Edge cases
  it('should handle empty state', () => {
    // Test
  })

  // Error cases
  it('should handle errors gracefully', () => {
    // Test
  })

  // Cleanup
  afterEach(() => {
    // Cleanup
  })
})
```

## Debugging Tests

### Jest

```bash
# Run with node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test in debug mode
npm test -- --testNamePattern="test name" --runInBand
```

### Playwright

```bash
# Run with headed browser
npx playwright test --headed

# Run with debugger
npx playwright test --debug

# Generate trace
npx playwright test --trace on
npx playwright show-trace trace.zip
```

## Performance Testing

### Metrics Tracked

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **Page Load Time**: < 3s

### Running Performance Tests

```bash
# Lighthouse CI
npm run lighthouse

# Playwright performance tests
npx playwright test tests/e2e/performance.spec.ts
```

## Accessibility Testing

### Tools Used

- **jest-axe**: Automated a11y testing
- **Playwright**: Keyboard navigation tests
- **Manual Testing**: Screen reader verification

### Running A11y Tests

```bash
# Run accessibility tests
npm test -- --testPathPattern=a11y

# Playwright a11y tests
npx playwright test tests/accessibility/
```

## Continuous Improvement

### Coverage Reports

Coverage reports are generated in `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML report
- `coverage/lcov.info` - LCOV format for CI

### Test Metrics Dashboard

Track test metrics over time:
- Test execution time
- Flaky test rate
- Coverage trends
- E2E test reliability

## Troubleshooting

### Common Issues

**Tests timing out:**
```typescript
// Increase timeout
jest.setTimeout(10000)
```

**Flaky tests:**
- Add proper waits
- Use `waitFor` instead of arbitrary delays
- Check for race conditions

**Mock issues:**
- Clear mocks between tests: `jest.clearAllMocks()`
- Reset modules: `jest.resetModules()`

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
