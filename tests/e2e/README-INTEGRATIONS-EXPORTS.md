# Testing Guide: Integrations & Exports

## Quick Start

### Running the Tests

#### E2E Tests (Playwright)
```bash
# Run all integrations & exports tests
npm run test:e2e -- tests/e2e/integrations-exports.spec.ts

# Run with UI mode for debugging
npm run test:e2e:ui -- tests/e2e/integrations-exports.spec.ts

# Run specific test
npm run test:e2e -- tests/e2e/integrations-exports.spec.ts -g "Export project as CSV"
```

#### Unit Tests (Vitest)
```bash
# Run unit tests for services
npm run test:unit -- tests/unit/export-calendar-services.test.ts

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

---

## Test Credentials

**Email:** member@demo.foco.local
**Password:** DemoMember123!

---

## Test Coverage

### US-8.1: Export Project Data
- ✅ Export as CSV
- ✅ Export as JSON
- ✅ Export as PDF
- ✅ Export as Excel
- ✅ Data integrity verification
- ✅ Filter functionality
- ✅ Export milestones
- ✅ Export tasks

### US-8.2: Calendar Integration
- ✅ View calendar (Month, Week, Day, Agenda)
- ✅ Navigate dates
- ✅ Verify due dates
- ✅ Filter events
- ✅ Create events
- ✅ Export calendar
- ✅ Responsive design
- ✅ Integration infrastructure

---

## Test Files

### E2E Tests
**Location:** `/tests/e2e/integrations-exports.spec.ts`
**Tests:** 29 test cases
**Framework:** Playwright

### Unit Tests
**Location:** `/tests/unit/export-calendar-services.test.ts`
**Tests:** 35+ test cases
**Framework:** Vitest

### Test Reports
- **Detailed Report:** `/tests/e2e/integrations-exports-report.md`
- **Summary:** `/INTEGRATIONS_EXPORTS_TEST_SUMMARY.md`

---

## Manual Testing Checklist

### Export Functionality
- [ ] Navigate to /projects
- [ ] Click "Export" button
- [ ] Select "Projects" export type
- [ ] Select "CSV" format
- [ ] Click "Export CSV" button
- [ ] Verify file downloads
- [ ] Open CSV file and verify data
- [ ] Repeat for JSON, PDF, Excel formats
- [ ] Test with filters applied
- [ ] Test exporting milestones
- [ ] Test exporting tasks

### Calendar Functionality
- [ ] Navigate to /calendar
- [ ] Verify calendar displays
- [ ] Click "Today" button
- [ ] Navigate next/previous month
- [ ] Switch to Week view
- [ ] Switch to Day view
- [ ] Switch to Agenda view
- [ ] Click "Filter" button
- [ ] Apply filters
- [ ] Click "Create Event" button
- [ ] Fill in event details
- [ ] Save event
- [ ] Verify event appears on calendar
- [ ] Test on mobile device
- [ ] Test on tablet device

---

## Expected Results

### Export Tests
All export formats should:
- Download successfully
- Contain correct data
- Include all fields
- Respect filters
- Show progress indicators
- Display success message

### Calendar Tests
Calendar should:
- Display all views correctly
- Navigate smoothly
- Show accurate dates
- Filter events properly
- Allow event creation
- Work on all devices
- Load quickly (<2 seconds)

---

## Troubleshooting

### Common Issues

#### Tests Fail to Login
**Solution:** Verify demo credentials are correct and user exists in database

#### Export Button Not Found
**Solution:** Check if user has export permissions. Verify element selectors are correct.

#### Calendar Not Loading
**Solution:** Check network tab for API errors. Verify Supabase connection.

#### Download Tests Fail
**Solution:** Ensure downloads folder exists. Check browser permissions.

---

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run Integration Tests
  run: npm run test:e2e -- tests/e2e/integrations-exports.spec.ts
```

### Test Reports
Tests automatically generate reports in:
- `playwright-report/` (HTML reports)
- `test-results/` (JSON results)

---

## Performance Benchmarks

### Export Performance
- Small dataset (< 100 rows): < 1 second
- Medium dataset (< 1000 rows): < 3 seconds
- Large dataset (< 10000 rows): < 10 seconds

### Calendar Performance
- Initial load: < 2 seconds
- View switch: < 500ms
- Event creation: < 1 second
- Filter application: < 500ms

---

## Accessibility Testing

### Keyboard Navigation
- Tab through export options
- Use Enter to select format
- Use arrow keys in calendar
- Press 'T' for Today (recommended)
- Escape to close dialogs

### Screen Reader Testing
- Export button should announce "Export Data"
- Calendar should announce current date
- Events should announce title and time
- Success messages should be announced

---

## Security Testing

### Export Security
- ✅ CSV injection prevention
- ✅ HTML escaping in Excel
- ✅ File type validation
- ⚠️ Add permission checks (recommended)
- ⚠️ Add audit logging (recommended)

### Calendar Security
- ✅ OAuth structure ready
- ✅ Input validation
- ⚠️ Implement token refresh (required for production)
- ⚠️ Add scope validation (required for production)

---

## Next Steps

### For Developers
1. Review test files
2. Run tests locally
3. Fix any failing tests
4. Add new tests for features
5. Update documentation

### For QA Engineers
1. Execute manual test checklist
2. Verify all scenarios work
3. Test edge cases
4. Report bugs found
5. Verify bug fixes

### For Product Managers
1. Review test summary report
2. Verify all acceptance criteria met
3. Approve for production
4. Plan OAuth setup for integrations

---

## Support

### Documentation
- **Full Test Report:** `/tests/e2e/integrations-exports-report.md`
- **Test Summary:** `/INTEGRATIONS_EXPORTS_TEST_SUMMARY.md`
- **User Stories:** `/USER_STORIES.md` (US-8.1, US-8.2)

### Contact
For questions or issues with tests, contact the development team.

---

**Last Updated:** January 9, 2026
**Version:** 1.0.0
**Status:** ✅ All Tests Passing
