# Quick Start: Mobile & Offline Tests

## Test Credentials
```
Email: member@demo.foco.local
Password: DemoMember123!
```

## Quick Run Commands

### Run All Tests
```bash
npx playwright test mobile-offline-user-stories.spec.ts
```

### Run by User Story
```bash
# US-9.1: Mobile Project Viewing (8 tests)
npx playwright test mobile-offline-user-stories.spec.ts -g "US-9.1"

# US-9.2: Offline Support (10 tests)
npx playwright test mobile-offline-user-stories.spec.ts -g "US-9.2"

# Integration Tests (3 tests)
npx playwright test mobile-offline-user-stories.spec.ts -g "Mobile & Offline Integration"
```

### Debug Mode
```bash
# Interactive UI mode
npx playwright test mobile-offline-user-stories.spec.ts --ui

# Debug with browser visible
npx playwright test mobile-offline-user-stories.spec.ts --debug

# Run specific test by line number
npx playwright test mobile-offline-user-stories.spec.ts:37
```

### Reports
```bash
# Generate HTML report
npx playwright test mobile-offline-user-stories.spec.ts --reporter=html

# View report
npx playwright show-report
```

## Test Structure

```
tests/e2e/mobile-offline-user-stories.spec.ts
├── US-9.1: Mobile Project Viewing (8 tests)
│   ├── should display responsive layout on mobile viewport (375px)
│   ├── should view project list on mobile
│   ├── should view project tasks on mobile
│   ├── should update task status with touch interaction
│   ├── should support drag-and-drop on touch devices
│   ├── should create new task on mobile
│   ├── should have touch-friendly buttons (min 48x48px)
│   └── should verify mobile navigation is intuitive
│
├── US-9.2: Offline Support (10 tests)
│   ├── should cache data when online
│   ├── should verify cached data is available offline
│   ├── should update task while offline and queue for sync
│   ├── should sync when coming back online
│   ├── should show offline indicator when connection is lost
│   ├── should handle no conflicts when syncing
│   ├── should show sync status indicators
│   ├── should persist user preferences offline
│   ├── should handle service worker for offline functionality
│   └── should gracefully degrade when offline features unavailable
│
└── Mobile & Offline Integration (3 tests)
    ├── should provide mobile-optimized offline experience
    ├── should handle touch interactions in offline mode
    └── should sync mobile interactions when connection restored
```

## Expected Results

### US-9.1: Mobile Responsiveness ✅
- Viewport adapts to 375px (iPhone size)
- Project list displays in mobile-optimized layout
- Touch interactions work (tap, drag)
- Buttons meet touch target guidelines (≥44px)
- Mobile navigation intuitive

### US-9.2: Offline Functionality ✅
- Data cached by service worker
- Offline access to cached content
- Actions queued when offline
- Background sync on reconnection
- Offline indicator appears
- User preferences persist

## File Locations

| File | Path |
|------|------|
| Test Suite | `/tests/e2e/mobile-offline-user-stories.spec.ts` |
| Detailed Report | `/TEST_REPORT_MOBILE_OFFLINE.md` |
| Summary | `/MOBILE_OFFLINE_TEST_SUMMARY.md` |
| Quick Start | `/QUICK_START_MOBILE_OFFLINE_TESTS.md` (this file) |

## Stats

- **Total Tests**: 21
- **Test Suites**: 3
- **Lines of Code**: 727
- **Device**: iPhone 12 emulation (375x667px)
- **Framework**: Playwright + TypeScript

## Troubleshooting

### Browser Not Installed
```bash
npx playwright install webkit
```

### Dev Server Not Running
```bash
npm run dev
```

### View Detailed Logs
```bash
DEBUG=pw:api npx playwright test mobile-offline-user-stories.spec.ts
```

---

**Quick Status Check**
```bash
# Verify test file exists
ls -lh tests/e2e/mobile-offline-user-stories.spec.ts

# Count tests
grep -c "test(" tests/e2e/mobile-offline-user-stories.spec.ts

# Dry run (see what would be tested)
npx playwright test mobile-offline-user-stories.spec.ts --list
```

**Report Generated**: 2026-01-09
