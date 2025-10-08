# 🧪 Foco Production Testing Checklist

**Production URL:** https://foco.mx  
**Test Date:** January 8, 2025  
**Deployment Version:** Latest (commit `3bbf1d8`)

---

## 📋 Pre-Testing Setup

- [ ] Open browser DevTools Console (F12)
- [ ] Clear browser cache and cookies
- [ ] Use incognito/private browsing mode for clean test
- [ ] Have a unique email address ready for testing

---

## 🎯 Critical Fixes to Verify

### ✅ Fixes Deployed Today
1. **time_entries 400 errors** - Fixed column name (start_time → date)
2. **goals 400 errors** - Updated to use API route
3. **Netlify deployment** - Fixed configuration (removed incorrect publish directory)
4. **Organization creation** - Added created_by field
5. **user_profiles RLS** - Added SELECT, INSERT, UPDATE policies

---

## 1️⃣ Landing Page & Site Load

**Objective:** Verify site loads without JavaScript errors

- [ ] Navigate to https://foco.mx
- [ ] Page loads successfully (no blank screen)
- [ ] No "Uncaught SyntaxError" errors in console
- [ ] All sections render correctly (hero, features, pricing, footer)
- [ ] Navigation links work
- [ ] PWA install prompt appears (informational message is OK)

**Expected Console Messages (OK):**
```
✅ [INFO] Banner not shown: beforeinstallpromptevent.preventDefault() called
✅ Supabase client initialization messages
```

**Unexpected Errors (FAIL):**
```
❌ Uncaught SyntaxError: Invalid or unexpected token
❌ Failed to load resource: 500
```

**Status:** ⬜ PASS / ⬜ FAIL  
**Notes:**

---

## 2️⃣ User Registration

**Objective:** Create new account without errors

### Steps:
1. [ ] Click "Comenzar gratis" or navigate to `/register`
2. [ ] Fill in registration form:
   - Username: `TestUser_[timestamp]`
   - Email: `test_[timestamp]@example.com`
   - Password: `SecurePass123!`
   - Confirm Password: `SecurePass123!`
3. [ ] Click "Crear cuenta"
4. [ ] Wait for registration to complete

### Expected Results:
- [ ] ✅ Registration succeeds
- [ ] ✅ Redirected to `/organization-setup` page
- [ ] ✅ **NO 400 error on user_profiles** (CRITICAL FIX)
- [ ] ✅ No 500 errors

### Console Check:
- [ ] Check console for errors
- [ ] **CRITICAL:** Verify NO `400 () @ .../user_profiles` error

**Status:** ⬜ PASS / ⬜ FAIL  
**Console Errors Found:**

---

## 3️⃣ Organization Setup

**Objective:** Create organization without 500 error

### Steps:
1. [ ] On organization setup page, enter organization name
2. [ ] Organization Name: `Test Organization [timestamp]`
3. [ ] Click "Create Organization"
4. [ ] Wait for organization creation

### Expected Results:
- [ ] ✅ Organization created successfully
- [ ] ✅ **NO 500 error on /api/organization-setup** (CRITICAL FIX)
- [ ] ✅ Redirected to `/dashboard`
- [ ] ✅ No error messages displayed

### Console Check:
- [ ] Check console for errors
- [ ] **CRITICAL:** Verify NO `500 () @ .../api/organization-setup` error

**Status:** ⬜ PASS / ⬜ FAIL  
**Console Errors Found:**

---

## 4️⃣ Dashboard Access

**Objective:** Verify dashboard loads and displays correctly

### Steps:
1. [ ] After organization setup, verify dashboard loads
2. [ ] Check all dashboard sections render
3. [ ] Verify organization name displays correctly

### Expected Results:
- [ ] ✅ Dashboard loads without timeout
- [ ] ✅ User information displays correctly
- [ ] ✅ Organization information displays correctly
- [ ] ✅ Navigation menu works
- [ ] ✅ No 401 Unauthorized errors

**Status:** ⬜ PASS / ⬜ FAIL  
**Notes:**

---

## 5️⃣ Projects - CRUD Operations

**Objective:** Test full Create, Read, Update, Delete cycle for projects

### Create Project
- [ ] Navigate to Projects section
- [ ] Click "Create Project" or "New Project"
- [ ] Fill in project details:
  - Name: `Test Project 1`
  - Description: `Testing project creation`
- [ ] Click "Create" or "Save"
- [ ] **Expected:** ✅ Project created successfully
- [ ] **Expected:** ✅ Project appears in project list

### Read Project
- [ ] Click on the created project
- [ ] **Expected:** ✅ Project details page loads
- [ ] **Expected:** ✅ All project information displays correctly

### Update Project
- [ ] Click "Edit" on the project
- [ ] Change project name to `Test Project 1 - Updated`
- [ ] Click "Save"
- [ ] **Expected:** ✅ Project updated successfully
- [ ] **Expected:** ✅ Updated name displays correctly

### Delete Project
- [ ] Click "Delete" on the project
- [ ] Confirm deletion
- [ ] **Expected:** ✅ Project deleted successfully
- [ ] **Expected:** ✅ Project removed from list

**Status:** ⬜ PASS / ⬜ FAIL  
**Console Errors Found:**

---

## 6️⃣ Tasks - CRUD Operations

**Objective:** Test task management within a project

### Prerequisites:
- [ ] Create a test project first

### Create Task
- [ ] Navigate to project
- [ ] Click "Create Task" or "Add Task"
- [ ] Fill in task details:
  - Title: `Test Task 1`
  - Description: `Testing task creation`
  - Priority: Select any
  - Status: Select any
- [ ] Click "Create"
- [ ] **Expected:** ✅ Task created successfully

### Read Task
- [ ] Click on the created task
- [ ] **Expected:** ✅ Task details display correctly

### Update Task
- [ ] Change task status (e.g., To Do → In Progress)
- [ ] Update task priority
- [ ] Click "Save"
- [ ] **Expected:** ✅ Task updated successfully

### Delete Task
- [ ] Click "Delete" on the task
- [ ] Confirm deletion
- [ ] **Expected:** ✅ Task deleted successfully

**Status:** ⬜ PASS / ⬜ FAIL  
**Console Errors Found:**

---

## 7️⃣ Milestones - CRUD Operations

**Objective:** Test milestone management

### Create Milestone
- [ ] Navigate to Milestones section
- [ ] Click "Create Milestone"
- [ ] Fill in milestone details:
  - Name: `Test Milestone 1`
  - Due Date: Select future date
- [ ] Click "Create"
- [ ] **Expected:** ✅ Milestone created successfully

### Read Milestone
- [ ] View milestone in timeline/list
- [ ] Click on milestone
- [ ] **Expected:** ✅ Milestone details display correctly

### Update Milestone
- [ ] Edit milestone
- [ ] Change name to `Test Milestone 1 - Updated`
- [ ] Update progress percentage
- [ ] Click "Save"
- [ ] **Expected:** ✅ Milestone updated successfully

### Delete Milestone
- [ ] Click "Delete" on milestone
- [ ] Confirm deletion
- [ ] **Expected:** ✅ Milestone deleted successfully

**Status:** ⬜ PASS / ⬜ FAIL  
**Console Errors Found:**

---

## 8️⃣ Goals - CRUD Operations (CRITICAL FIX VERIFICATION)

**Objective:** Verify goals work without 400 errors

### Create Goal
- [ ] Navigate to Goals section
- [ ] Click "Create Goal"
- [ ] Fill in goal details:
  - Title: `Test Goal 1`
  - Target: Enter target value
- [ ] Click "Create"
- [ ] **Expected:** ✅ Goal created successfully
- [ ] **CRITICAL:** ✅ **NO 400 errors in console**

### Read Goals
- [ ] View goals list
- [ ] **CRITICAL:** ✅ **NO 400 error on /api/goals endpoint**
- [ ] **Expected:** ✅ Goals display correctly
- [ ] **Expected:** ✅ Goal analytics display correctly

### Update Goal
- [ ] Edit goal
- [ ] Update progress
- [ ] Click "Save"
- [ ] **Expected:** ✅ Goal updated successfully
- [ ] **CRITICAL:** ✅ **NO 400 errors in console**

### Delete Goal
- [ ] Click "Delete" on goal
- [ ] Confirm deletion
- [ ] **Expected:** ✅ Goal deleted successfully

**Status:** ⬜ PASS / ⬜ FAIL  
**Console Errors Found:**

---

## 9️⃣ Time Tracking (CRITICAL FIX VERIFICATION)

**Objective:** Verify time tracking works without 400 errors

### View Time Entries
- [ ] Navigate to Time Tracking section
- [ ] **CRITICAL:** ✅ **NO 400 error on time_entries endpoint**
- [ ] **Expected:** ✅ Time entries list loads
- [ ] **Expected:** ✅ Time analytics display correctly

### Create Manual Time Entry
- [ ] Click "Add Time Entry" or "Log Time"
- [ ] Fill in details:
  - Project: Select test project
  - Date: Select today's date
  - Hours: `2.5`
  - Description: `Testing time tracking`
- [ ] Click "Save"
- [ ] **Expected:** ✅ Time entry created successfully
- [ ] **CRITICAL:** ✅ **NO 400 errors in console**

### Start/Stop Timer (if available)
- [ ] Click "Start Timer"
- [ ] Wait a few seconds
- [ ] Click "Stop Timer"
- [ ] **Expected:** ✅ Timer works correctly
- [ ] **Expected:** ✅ Time entry created automatically

### View Time Analytics
- [ ] Navigate to time analytics/reports
- [ ] Filter by date range
- [ ] **CRITICAL:** ✅ **NO 400 errors when filtering by date**
- [ ] **Expected:** ✅ Analytics display correctly

**Status:** ⬜ PASS / ⬜ FAIL  
**Console Errors Found:**

---

## 🔟 Additional Features

### AI Project Creation (if available)
- [ ] Navigate to AI project creation
- [ ] Enter project description
- [ ] Click "Generate with AI"
- [ ] **Expected:** ✅ AI generates project structure
- [ ] **Expected:** ✅ No errors

**Status:** ⬜ PASS / ⬜ FAIL

### Navigation
- [ ] Test all navigation menu items
- [ ] **Expected:** ✅ All pages load correctly
- [ ] **Expected:** ✅ No broken links

**Status:** ⬜ PASS / ⬜ FAIL

### PWA Install (Mobile/Desktop)
- [ ] Look for browser install prompt
- [ ] Click "Install" if available
- [ ] **Expected:** ✅ App installs successfully
- [ ] **Expected:** ✅ App works offline (if applicable)

**Status:** ⬜ PASS / ⬜ FAIL

---

## 📊 Final Console Verification

**Objective:** Comprehensive console error check

### After completing all tests above:
1. [ ] Review entire console log
2. [ ] Document ALL errors and warnings
3. [ ] Categorize errors:
   - ⬜ Critical (blocks functionality)
   - ⬜ High (impacts user experience)
   - ⬜ Medium (minor issues)
   - ⬜ Low (cosmetic/informational)

### Critical Errors to Check For:
- [ ] ✅ **NO** `400 () @ .../user_profiles`
- [ ] ✅ **NO** `500 () @ .../api/organization-setup`
- [ ] ✅ **NO** `400 () @ .../time_entries`
- [ ] ✅ **NO** `400 () @ .../goals`
- [ ] ✅ **NO** `401 Unauthorized` errors
- [ ] ✅ **NO** `Uncaught SyntaxError` errors

**Console Errors Found:**
```
[List all errors here]
```

---

## 📈 Overall Assessment

### Test Summary
- **Total Tests:** 10 sections
- **Tests Passed:** _____ / 10
- **Tests Failed:** _____ / 10
- **Critical Issues Found:** _____
- **Non-Critical Issues Found:** _____

### Site Status
⬜ 🟢 **FULLY FUNCTIONAL** - All tests passed  
⬜ 🟡 **PARTIALLY FUNCTIONAL** - Some non-critical issues  
⬜  🟠 **MAJOR ISSUES** - Critical features broken  
⬜ 🔴 **NOT FUNCTIONAL** - Site unusable

### Completion Rate
**Estimated:** _____ %

### Critical Fixes Verification
- [ ] ✅ time_entries 400 errors - **FIXED**
- [ ] ✅ goals 400 errors - **FIXED**
- [ ] ✅ Netlify deployment - **FIXED**
- [ ] ✅ Organization creation 500 error - **FIXED**
- [ ] ✅ user_profiles 400 error - **FIXED**

---

## 🐛 Issues Found

### Critical Issues
1. **Issue:** [Description]
   - **Impact:** [High/Medium/Low]
   - **Steps to Reproduce:** [Steps]
   - **Expected:** [Expected behavior]
   - **Actual:** [Actual behavior]

### Non-Critical Issues
1. **Issue:** [Description]
   - **Impact:** [High/Medium/Low]
   - **Notes:** [Additional notes]

---

## ✅ Recommendations

### Immediate Actions Required
- [ ] [Action item 1]
- [ ] [Action item 2]

### Future Improvements
- [ ] [Improvement 1]
- [ ] [Improvement 2]

---

## 📝 Testing Notes

**Tester Name:** _________________  
**Test Duration:** _________________  
**Browser Used:** _________________  
**Device Used:** _________________  

**Additional Comments:**
```
[Add any additional observations, suggestions, or concerns here]
```

---

## 🎯 Next Steps

Based on test results:
1. [ ] If all tests pass → Mark deployment as successful
2. [ ] If critical issues found → Create bug reports and fix immediately
3. [ ] If non-critical issues found → Document for future sprint
4. [ ] Update documentation with any new findings
5. [ ] Share test results with team

---

**End of Testing Checklist**

