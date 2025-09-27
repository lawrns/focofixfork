# Foco Testing Guide

This comprehensive testing guide covers all testing strategies and practices implemented in Foco.

## 🧪 Testing Overview

Foco implements a multi-layered testing strategy to ensure code quality, reliability, and maintainability:

- **Unit Tests**: Test individual functions, components, and utilities
- **Integration Tests**: Test component interactions and service integrations
- **Contract Tests**: Verify API contracts between frontend and backend
- **End-to-End Tests**: Test complete user workflows
- **Visual Regression Tests**: Detect UI changes and inconsistencies
- **Performance Tests**: Monitor application performance
- **Accessibility Tests**: Ensure WCAG 2.1 AA compliance

## 📁 Test Organization

```
src/
├── __tests__/
│   ├── setup.ts                    # Global test setup and utilities
│   ├── contracts/                  # API contract tests
│   │   ├── auth.contract.test.ts
│   │   └── ...
│   └── utils/                      # Test utilities and helpers
├── components/
│   └── ui/
│       └── __tests__/              # Component unit tests
│           ├── button.test.tsx
│           ├── input.test.tsx
│           └── ...
└── lib/
    ├── accessibility/
    │   └── __tests__/              # Accessibility service tests
    ├── services/
    │   └── __tests__/              # Service layer tests
    └── validation/
        └── __tests__/              # Validation logic tests
```

## 🛠️ Test Setup

### Environment Configuration

Tests use Vitest with jsdom for DOM simulation. The setup includes:

- Global mocks for browser APIs (localStorage, Notification, etc.)
- Supabase client mocking
- Framer Motion mocking
- Accessibility utilities
- Test data factories

### Running Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Generate coverage report
npm run test:coverage

# Run contract tests only
npm run test:contract

# Run E2E tests
npm run test:e2e

# Run accessibility tests
npm run test:accessibility
```

## 🧩 Unit Testing

### Component Testing

Components are tested using React Testing Library with these patterns:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../button';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Key Testing Principles

1. **Accessibility First**: All tests verify accessibility compliance
2. **User-Centric**: Tests simulate real user interactions
3. **Comprehensive Coverage**: Tests cover happy paths, error states, and edge cases
4. **Maintainable**: Tests are readable and easy to update

### Service Testing

Services are tested with mocked dependencies:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { AuditService } from '../audit-log';

describe('AuditService', () => {
  it('logs audit events correctly', async () => {
    const entry = {
      user_id: 'user-123',
      action: 'user_login',
      entity_type: 'user',
      entity_id: 'user-123',
      risk_level: 'low',
      status: 'success',
    };

    await AuditService.logEvent(entry);
    const logs = await AuditService.queryLogs();
    expect(logs[0]).toMatchObject(entry);
  });
});
```

## 🔗 Contract Testing

Contract tests verify API contracts between frontend and backend:

```typescript
describe('Auth API Contract', () => {
  it('should handle successful login', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        user: createMockUser(),
        session: { access_token: 'token' }
      }),
    });

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.user.email).toBe(email);
  });
});
```

### Contract Test Benefits

- **API Compatibility**: Ensures frontend expectations match backend responses
- **Early Detection**: Catches breaking changes before deployment
- **Documentation**: Serves as living API documentation
- **Reliability**: Prevents integration issues in production

## 🎭 E2E Testing with Playwright

End-to-end tests cover complete user workflows:

```typescript
import { test, expect } from '@playwright/test';

test('complete user registration flow', async ({ page }) => {
  await page.goto('/register');

  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.fill('[name="fullName"]', 'Test User');

  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=Welcome, Test User')).toBeVisible();
});
```

### E2E Test Categories

1. **Authentication**: Login, registration, password reset
2. **Project Management**: CRUD operations, team collaboration
3. **Task Management**: Creation, assignment, status updates
4. **Accessibility**: Keyboard navigation, screen reader compatibility
5. **Performance**: Load times, responsiveness
6. **Cross-browser**: Compatibility across different browsers

## ♿ Accessibility Testing

Accessibility tests ensure WCAG 2.1 AA compliance:

```typescript
import { test, expect } from '@playwright/test';

test('homepage meets accessibility standards', async ({ page }) => {
  await page.goto('/');

  // Check for accessibility violations
  const violations = await page.evaluate(() => {
    // Use axe-core or similar accessibility checker
    return window.axe.run(document);
  });

  expect(violations.violations).toHaveLength(0);
});
```

### Accessibility Test Areas

- **Color Contrast**: WCAG AA compliance (4.5:1 normal, 3.0:1 large text)
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Screen Reader**: Proper ARIA labels and semantic HTML
- **Focus Management**: Logical tab order and focus indicators
- **Form Validation**: Accessible error messages and field association

## 📊 Test Coverage

### Coverage Goals

- **Components**: >90% coverage
- **Services**: >85% coverage
- **Utilities**: >95% coverage
- **API Contracts**: 100% coverage
- **E2E Workflows**: Critical user journeys covered

### Coverage Report

```bash
npm run test:coverage
```

Generates detailed coverage reports in multiple formats:
- HTML report with interactive file explorer
- JSON data for CI/CD integration
- Terminal summary with coverage percentages

## 🔧 Test Utilities

### Mock Data Factories

```typescript
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: null,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});
```

### Custom Matchers

```typescript
expect.extend({
  toBeAccessible(received) {
    // Custom accessibility assertions
  }
});
```

### Test Helpers

```typescript
export const renderWithProviders = (component) => {
  // Wrap with necessary providers for testing
};

export const mockApiResponse = (url, response) => {
  // Mock fetch responses
};
```

## 🚀 CI/CD Integration

### GitHub Actions

```yaml
- name: Run Tests
  run: |
    npm run test:run
    npm run test:contract
    npm run test:e2e
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/coverage-final.json
```

### Quality Gates

- **Unit Tests**: Must pass on all PRs
- **Contract Tests**: Must pass before backend deployments
- **E2E Tests**: Must pass on main branch
- **Coverage**: Minimum 80% overall coverage
- **Accessibility**: Zero WCAG AA violations

## 🐛 Debugging Tests

### Common Issues

1. **Async Operations**: Use `waitFor` or `findBy*` queries
2. **Timers**: Mock timers for consistent test execution
3. **Network Requests**: Mock API calls to avoid external dependencies
4. **DOM Updates**: Wait for state updates before assertions

### Debug Commands

```bash
# Debug specific test
npm test -- --run button.test.tsx

# Debug with browser UI
npm run test:ui

# Step through test execution
npm test -- --inspect-brk
```

## 📈 Performance Testing

### Lighthouse CI

Automated performance testing ensures optimal user experience:

```yaml
- name: Lighthouse
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: http://localhost:3000
    configPath: .lighthouserc.json
```

### Performance Budgets

```json
{
  "budgets": [
    {
      "path": "/",
      "resourceSizes": [
        { "resourceType": "document", "budget": 20 },
        { "resourceType": "script", "budget": 150 },
        { "resourceType": "stylesheet", "budget": 50 }
      ]
    }
  ]
}
```

## 🎯 Best Practices

### Test Organization

1. **Arrange-Act-Assert**: Clear test structure
2. **One Concept Per Test**: Single responsibility principle
3. **Descriptive Names**: Tests should read like documentation
4. **DRY Principle**: Share setup and teardown logic

### Test Categories

- **Smoke Tests**: Basic functionality verification
- **Regression Tests**: Prevent reintroduction of bugs
- **Integration Tests**: Component and service interactions
- **Performance Tests**: Monitor and prevent degradation

### Maintenance

- **Regular Updates**: Keep tests in sync with code changes
- **Flaky Test Management**: Identify and fix unreliable tests
- **Test Data Management**: Use consistent, realistic test data
- **Documentation**: Keep testing documentation current

## 📚 Resources

- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Guide](https://playwright.dev/docs/intro)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-testing-mistakes)

---

## 🚀 Continuous Testing

Testing is integrated throughout the development lifecycle:

1. **Pre-commit**: Lint and unit tests
2. **PR Review**: Full test suite and coverage
3. **Merge**: E2E tests and accessibility checks
4. **Deploy**: Performance and contract tests
5. **Monitor**: Production error tracking and analytics

This comprehensive testing strategy ensures Foco maintains high quality, accessibility, and reliability across all user interactions and environments.
