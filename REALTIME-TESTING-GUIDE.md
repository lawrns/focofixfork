# Real-time Testing Guide for Foco.mx

## Overview

This guide provides step-by-step instructions for testing real-time functionality in the Foco.mx project management application.

**Supabase Project**: Bieno (czijxfbkihrauyjwcgfn)  
**Real-time Status**: ✅ Enabled for all tables  
**Test User**: laurence@fyves.com  
**Password**: Hennie@@18

---

## Prerequisites

1. ✅ Real-time enabled for all tables (projects, tasks, milestones, project_members, organization_members)
2. ✅ RLS policies configured to allow real-time subscriptions
3. ✅ Client-side real-time hooks implemented
4. ✅ At least one active user account (laurence@fyves.com)

---

## Test Setup

### Option 1: Two Browser Windows (Same User)

1. Open Chrome/Firefox in normal mode
2. Navigate to https://foco.mx/login
3. Log in as laurence@fyves.com
4. Open a second browser window (same browser)
5. Navigate to https://foco.mx/login
6. Log in as laurence@fyves.com again

**Why this works**: Supabase real-time broadcasts to all sessions, even for the same user.

### Option 2: Two Different Browsers

1. Open Chrome and log in as laurence@fyves.com
2. Open Firefox and log in as laurence@fyves.com
3. Position windows side-by-side

### Option 3: Incognito + Normal Mode

1. Open browser in normal mode, log in as laurence@fyves.com
2. Open incognito/private window, log in as laurence@fyves.com
3. Position windows side-by-side

---

## Test Cases

### Test 1: Real-time Project Creation

**Objective**: Verify new projects appear in real-time

**Steps**:
1. Window 1: Navigate to Projects page
2. Window 2: Navigate to Projects page
3. Window 1: Click "New Project" button
4. Window 1: Fill in project details:
   - Name: "Real-time Test Project"
   - Description: "Testing real-time functionality"
   - Status: "In Progress"
5. Window 1: Click "Create Project"
6. Window 2: **Observe** - Project should appear immediately

**Expected Result**:
- ✅ Project appears in Window 2 within 1 second
- ✅ No page refresh required
- ✅ Project appears in correct position (sorted by date)
- ✅ All project details are correct

**Actual Result**: _____________

---

### Test 2: Real-time Project Update

**Objective**: Verify project updates appear in real-time

**Steps**:
1. Window 1: Select an existing project
2. Window 2: View the same project
3. Window 1: Click "Edit" button
4. Window 1: Change project name to "Updated Project Name"
5. Window 1: Change status to "Completed"
6. Window 1: Click "Save"
7. Window 2: **Observe** - Changes should appear immediately

**Expected Result**:
- ✅ Project name updates in Window 2 within 1 second
- ✅ Project status updates in Window 2
- ✅ No page refresh required
- ✅ All changes are reflected accurately

**Actual Result**: _____________

---

### Test 3: Real-time Project Deletion

**Objective**: Verify project deletions appear in real-time

**Steps**:
1. Window 1: Navigate to Projects page
2. Window 2: Navigate to Projects page
3. Window 1: Select a project
4. Window 1: Click "Delete" button
5. Window 1: Confirm deletion
6. Window 2: **Observe** - Project should disappear immediately

**Expected Result**:
- ✅ Project disappears from Window 2 within 1 second
- ✅ No page refresh required
- ✅ No error messages
- ✅ Project count updates correctly

**Actual Result**: _____________

---

### Test 4: Real-time Task Creation

**Objective**: Verify new tasks appear in real-time

**Steps**:
1. Window 1: Open a project
2. Window 2: Open the same project
3. Window 1: Click "Add Task" button
4. Window 1: Fill in task details:
   - Title: "Real-time Test Task"
   - Description: "Testing task real-time"
   - Status: "To Do"
5. Window 1: Click "Create Task"
6. Window 2: **Observe** - Task should appear immediately

**Expected Result**:
- ✅ Task appears in Window 2 within 1 second
- ✅ No page refresh required
- ✅ Task appears in correct section (To Do)
- ✅ All task details are correct

**Actual Result**: _____________

---

### Test 5: Real-time Task Update

**Objective**: Verify task updates appear in real-time

**Steps**:
1. Window 1: Open a project with tasks
2. Window 2: Open the same project
3. Window 1: Drag a task from "To Do" to "In Progress"
4. Window 2: **Observe** - Task should move immediately

**Expected Result**:
- ✅ Task moves to "In Progress" in Window 2 within 1 second
- ✅ No page refresh required
- ✅ Task appears in correct position
- ✅ No duplicate tasks

**Actual Result**: _____________

---

### Test 6: Real-time Milestone Creation

**Objective**: Verify new milestones appear in real-time

**Steps**:
1. Window 1: Open a project
2. Window 2: Open the same project
3. Window 1: Navigate to Milestones tab
4. Window 1: Click "Add Milestone" button
5. Window 1: Fill in milestone details:
   - Title: "Real-time Test Milestone"
   - Due Date: [Select a date]
6. Window 1: Click "Create Milestone"
7. Window 2: **Observe** - Milestone should appear immediately

**Expected Result**:
- ✅ Milestone appears in Window 2 within 1 second
- ✅ No page refresh required
- ✅ Milestone appears in correct position (sorted by date)
- ✅ All milestone details are correct

**Actual Result**: _____________

---

### Test 7: Real-time Across Different Views

**Objective**: Verify real-time works across table, kanban, and gantt views

**Steps**:
1. Window 1: Navigate to Projects page (Table view)
2. Window 2: Navigate to Projects page (Kanban view)
3. Window 1: Create a new project
4. Window 2: **Observe** - Project should appear in Kanban view

**Expected Result**:
- ✅ Project appears in Window 2 Kanban view within 1 second
- ✅ Project appears in correct column based on status
- ✅ No page refresh required

**Actual Result**: _____________

---

### Test 8: Real-time with Multiple Users (Future)

**Objective**: Verify real-time works with different users

**Prerequisites**: Multiple user accounts created

**Steps**:
1. Window 1: Log in as laurence@fyves.com
2. Window 2: Log in as julian@fyves.com (once account is created)
3. Window 1: Create a project in Fyves organization
4. Window 2: **Observe** - Project should appear immediately

**Expected Result**:
- ✅ Project appears in Window 2 within 1 second
- ✅ Both users can see the same project
- ✅ Both users can edit the project
- ✅ Changes from either user appear in real-time

**Actual Result**: _____________

---

## Debugging Real-time Issues

### Check Browser Console

1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for real-time connection messages:
   ```
   [Supabase] Realtime connection established
   [Supabase] Subscribed to channel: projects
   ```

### Check Network Tab

1. Open Developer Tools (F12)
2. Go to Network tab
3. Filter by "WS" (WebSocket)
4. Look for WebSocket connection to Supabase
5. Check WebSocket messages for real-time events

### Common Issues

**Issue**: Real-time not working
- ✅ Check that real-time is enabled in Supabase Dashboard
- ✅ Check that RLS policies allow SELECT on tables
- ✅ Check browser console for errors
- ✅ Verify WebSocket connection is established

**Issue**: Duplicate entries appearing
- ✅ Check that optimistic updates are properly handled
- ✅ Verify event deduplication logic
- ✅ Check that local state is properly synchronized

**Issue**: Slow real-time updates (> 2 seconds)
- ✅ Check network connection
- ✅ Verify Supabase project is not rate-limited
- ✅ Check `eventsPerSecond` configuration

---

## Performance Metrics

### Target Metrics

- **Real-time Latency**: < 1 second
- **WebSocket Connection**: Stable, no disconnections
- **Memory Usage**: No memory leaks
- **CPU Usage**: < 5% during real-time updates

### Monitoring

1. Open Developer Tools > Performance tab
2. Start recording
3. Perform real-time actions
4. Stop recording
5. Analyze:
   - Network latency
   - JavaScript execution time
   - Memory usage
   - Frame rate

---

## Test Results Summary

| Test Case | Status | Latency | Notes |
|-----------|--------|---------|-------|
| Project Creation | ⬜ | ___ ms | _____________ |
| Project Update | ⬜ | ___ ms | _____________ |
| Project Deletion | ⬜ | ___ ms | _____________ |
| Task Creation | ⬜ | ___ ms | _____________ |
| Task Update | ⬜ | ___ ms | _____________ |
| Milestone Creation | ⬜ | ___ ms | _____________ |
| Cross-view Updates | ⬜ | ___ ms | _____________ |
| Multi-user (Future) | ⬜ | ___ ms | _____________ |

**Legend**: ✅ Pass | ❌ Fail | ⬜ Not Tested

---

## Conclusion

After completing all tests, document:

1. **Overall Status**: ✅ Pass / ⚠️ Partial / ❌ Fail
2. **Issues Found**: _____________
3. **Performance**: _____________
4. **Recommendations**: _____________

---

**Test Date**: _____________  
**Tester**: _____________  
**Environment**: Production / Staging / Local  
**Browser**: _____________  
**Status**: ⬜ Complete

