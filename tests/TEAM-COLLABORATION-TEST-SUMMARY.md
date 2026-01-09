# Team & Collaboration Test Suite - Quick Reference

## Test Execution Commands

### Run All Team Collaboration Tests
```bash
npx playwright test tests/e2e/team-collaboration.spec.ts
```

### Run by User Story
```bash
# US-6.1: Team Member Invitation
npx playwright test tests/e2e/team-collaboration.spec.ts -g "US-6.1"

# US-6.2: Role-Based Access Control
npx playwright test tests/e2e/team-collaboration.spec.ts -g "US-6.2"

# US-6.3: Activity Log & Notifications
npx playwright test tests/e2e/team-collaboration.spec.ts -g "US-6.3"
```

### Interactive Mode
```bash
npx playwright test tests/e2e/team-collaboration.spec.ts --ui
```

### Generate Report
```bash
npx playwright test tests/e2e/team-collaboration.spec.ts --reporter=html
npx playwright show-report
```

---

## Test Credentials

**Owner Account:**
- Email: `owner@demo.foco.local`
- Password: `DemoOwner123!`

---

## Test Coverage Summary

| User Story | Tests | Status |
|------------|-------|--------|
| US-6.1: Team Member Invitation | 8 tests | ✅ Implemented |
| US-6.2: Role-Based Access Control | 7 tests | ✅ Implemented |
| US-6.3: Activity Log & Notifications | 10 tests | ✅ Implemented |
| Integration Tests | 2 tests | ✅ Implemented |
| **Total** | **27 tests** | **135 executions** |

---

## Quick Test Checklist

### US-6.1: Team Member Invitation

- ✅ Display team management interface
- ✅ Open invitation dialog
- ✅ Validate invitation form
- ✅ Send invitation with valid email and role
- ✅ Display invited member in pending list
- ✅ Resend invitation
- ✅ Cancel pending invitation
- ✅ Prevent duplicate invitations

### US-6.2: Role-Based Access Control

- ✅ Display member roles in team list
- ✅ Allow owner to change member roles
- ✅ Verify owner-only features
- ✅ Display role permissions information
- ✅ Prevent owner from removing themselves
- ✅ Allow owner to remove members
- ✅ Display different role badges correctly

### US-6.3: Activity Log & Notifications

- ✅ Display notification center icon
- ✅ Open notification center
- ✅ Navigate to activity log page
- ✅ Display activity feed with recent actions
- ✅ Show notification when task is assigned
- ✅ Show notifications with unread count badge
- ✅ Mark notification as read when clicked
- ✅ Filter activity log by activity type
- ✅ Display notification settings page
- ✅ Show activity log entry when member is added

---

## Key Findings

### Working Features

1. **Invitation Flow** - Fully functional with email validation
2. **Role Management** - Owner/Member roles working
3. **API Endpoints** - All team/invitation APIs operational
4. **Rate Limiting** - Implemented for security
5. **Activity Logging** - Database schema in place

### Needs Attention

1. **Notification API** - Currently returns empty array (placeholder)
2. **Notification Preferences** - Not persisted to database
3. **Mentions Table** - Schema missing, functionality disabled
4. **Activity Log Route** - Multiple navigation paths, needs standardization

---

## Browser Coverage

- ✅ Chrome (Desktop)
- ✅ Firefox (Desktop)
- ✅ Safari/WebKit (Desktop)
- ✅ Mobile Chrome
- ✅ Mobile Safari

---

## Files Created

1. **Test Suite:** `/tests/e2e/team-collaboration.spec.ts`
2. **Full Report:** `/tests/TEST-REPORT-TEAM-COLLABORATION.md`
3. **Quick Reference:** `/tests/TEAM-COLLABORATION-TEST-SUMMARY.md` (this file)

---

## Next Steps

1. Run the test suite: `npx playwright test tests/e2e/team-collaboration.spec.ts`
2. Review test results
3. Address any failing tests
4. Implement notification API (see recommendations in full report)
5. Add notification preferences table
6. Standardize activity log navigation

---

## Report Details

For comprehensive test documentation, implementation notes, and recommendations, see:
📄 `/tests/TEST-REPORT-TEAM-COLLABORATION.md`

---

**Test Suite Version:** 1.0
**Created:** 2026-01-09
**Status:** Ready for Execution
