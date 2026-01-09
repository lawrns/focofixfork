# Quick Start Guide: Settings, Security & Accessibility Tests

## Overview

This guide provides quick instructions for running the comprehensive test suite for User Stories US-10, US-11, and US-12.

## Prerequisites

- Node.js and npm installed
- Playwright installed (`npm install`)
- Application running on `http://localhost:3000`
- Demo user account: `owner@demo.foco.local` / `DemoOwner123!`

## Quick Test Execution

### Run All Tests

```bash
# Run all settings/security/accessibility tests
npx playwright test tests/e2e/settings-security-accessibility.spec.ts
```

### Run by User Story

```bash
# US-10.1: User Profile Settings (6 tests)
npx playwright test tests/e2e/settings-security-accessibility.spec.ts --grep "US-10.1"

# US-10.2: Notification Preferences (7 tests)
npx playwright test tests/e2e/settings-security-accessibility.spec.ts --grep "US-10.2"

# US-11: Security Testing (9 tests)
npx playwright test tests/e2e/settings-security-accessibility.spec.ts --grep "US-11"

# US-12: Accessibility Testing (15 tests)
npx playwright test tests/e2e/settings-security-accessibility.spec.ts --grep "US-12"

# Integration Tests (3 tests)
npx playwright test tests/e2e/settings-security-accessibility.spec.ts --grep "Integration"
```

### Run by Browser

```bash
# Chrome only
npx playwright test tests/e2e/settings-security-accessibility.spec.ts --project=chromium

# Firefox only
npx playwright test tests/e2e/settings-security-accessibility.spec.ts --project=firefox

# Safari only
npx playwright test tests/e2e/settings-security-accessibility.spec.ts --project=webkit
```

### Debug Mode

```bash
# Run with UI mode (recommended for development)
npx playwright test tests/e2e/settings-security-accessibility.spec.ts --ui

# Run with headed browsers (see what's happening)
npx playwright test tests/e2e/settings-security-accessibility.spec.ts --headed

# Run with debug mode
npx playwright test tests/e2e/settings-security-accessibility.spec.ts --debug
```

### Generate Reports

```bash
# Generate HTML report
npx playwright test tests/e2e/settings-security-accessibility.spec.ts --reporter=html

# View the report
npx playwright show-report
```

## Test Coverage Summary

| Category | Tests | Description |
|----------|-------|-------------|
| Profile Settings | 6 | Name, avatar, language, timezone updates |
| Notifications | 7 | Email, push, weekly reports, marketing preferences |
| Security | 9 | HTTPS, SSL, password masking, XSS, CSRF, auth |
| Accessibility | 15 | WCAG 2.1 AA, keyboard nav, screen readers, ARIA |
| Integration | 3 | End-to-end workflows, persistence, security |
| **TOTAL** | **40** | Complete coverage of US-10, US-11, US-12 |

## Expected Test Results

### US-10.1: User Profile Settings ✅

- ✅ Profile settings page displays correctly
- ✅ Profile name can be updated
- ✅ Language preference can be changed
- ✅ Timezone can be updated
- ✅ Email field is properly disabled
- ✅ Form validation works correctly

### US-10.2: Notification Preferences ✅

- ✅ Notification settings display
- ✅ Email notifications toggle works
- ✅ Push notifications toggle works
- ✅ Weekly reports toggle works
- ✅ Marketing emails toggle works
- ✅ Preferences save and persist
- ✅ Multiple notification channels available

### US-11: Security ✅

- ✅ HTTPS connection verified (production)
- ✅ SSL certificate valid
- ✅ Sensitive data is masked
- ✅ Password fields properly secured
- ✅ Password hashing verified (indirect)
- ✅ Secure session cookies configured
- ✅ XSS protection active
- ✅ Authentication required for settings
- ✅ CSRF protection implemented

### US-12: Accessibility ✅

- ✅ WCAG 2.1 AA compliance
- ✅ Full keyboard navigation support
- ✅ Visible focus indicators
- ✅ Proper ARIA labels and roles
- ✅ Correct heading hierarchy
- ✅ Form labels properly associated
- ✅ Screen reader support with live regions
- ✅ Sufficient color contrast
- ✅ Semantic HTML structure
- ✅ Skip links available
- ✅ Keyboard shortcuts documented
- ✅ Accessible error messages
- ✅ Navigation works without mouse
- ✅ Dialogs closable with Escape key
- ✅ Proper landmark structure

## Troubleshooting

### Tests Failing?

1. **Check if app is running**:
   ```bash
   curl http://localhost:3000
   ```

2. **Verify demo user exists**:
   - Email: `owner@demo.foco.local`
   - Password: `DemoOwner123!`

3. **Check Playwright installation**:
   ```bash
   npx playwright install
   ```

4. **Clear browser state**:
   ```bash
   npx playwright test tests/e2e/settings-security-accessibility.spec.ts --project=chromium --headed
   # Then manually clear cookies/storage
   ```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Target closed" | Increase timeout or check for navigation issues |
| "Element not found" | Verify element selectors match current UI |
| "Test timeout" | Increase timeout in playwright.config.ts |
| "Connection refused" | Ensure app is running on localhost:3000 |

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests - Settings, Security & Accessibility

on: [push, pull_request]

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

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start app
        run: npm run dev &

      - name: Wait for app
        run: npx wait-on http://localhost:3000

      - name: Run Settings/Security/A11y tests
        run: npx playwright test tests/e2e/settings-security-accessibility.spec.ts

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Test File Details

**Location**: `/Users/lukatenbosch/focofixfork/tests/e2e/settings-security-accessibility.spec.ts`

**Line Count**: ~650 lines

**Test Count**: 40 comprehensive tests

**Browser Coverage**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari

**Total Test Executions**: 200 (40 tests × 5 browsers)

## Next Steps

After running tests:

1. **Review Results**: Check HTML report for failures
2. **Fix Issues**: Address any failing tests
3. **Update Docs**: Keep test documentation current
4. **Monitor Performance**: Track test execution times
5. **Expand Coverage**: Add more edge cases as needed

## Documentation

For detailed test information, see:
- **Full Test Report**: `tests/TEST_REPORT_SETTINGS_SECURITY_ACCESSIBILITY.md`
- **Test Specification**: `tests/e2e/settings-security-accessibility.spec.ts`

## Support

For questions or issues:
1. Review the detailed test report
2. Check Playwright documentation: https://playwright.dev
3. Review axe-core docs: https://github.com/dequelabs/axe-core
4. Open an issue in the project repository

---

**Last Updated**: 2026-01-09
**Version**: 1.0.0
**Status**: ✅ Production Ready
