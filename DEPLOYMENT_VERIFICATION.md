# Deployment Verification Checklist

**Deployment URL:** https://foco.mx
**Date:** 2025-10-10
**Commit:** bbe705f - Remove all mock data and fix UI issues

## ✅ Pre-Verification Steps

- [x] Code committed successfully
- [x] Code pushed to master
- [x] Netlify deployment triggered
- [x] Site is accessible (HTTP 200)

---

## 🧪 Manual Testing Required

### 1. User Registration Flow

**Test Steps:**
1. Go to https://foco.mx
2. Click "Sign Up" or "Register"
3. Fill in registration form:
   - Email: test-user-{timestamp}@example.com
   - Password: Test123!@#
   - Full Name: Test User
4. Submit form
5. Verify account creation

**Expected Results:**
- [ ] Registration form loads without errors
- [ ] Form validation works (required fields, email format, password strength)
- [ ] User account is created in Supabase
- [ ] User is redirected to appropriate page (dashboard or org setup)
- [ ] No console errors

**Known Issues to Check:**
- Database RLS policies blocking user creation
- Missing user_profiles creation
- Email validation errors
- Session creation issues

---

### 2. User Login Flow

**Test Steps:**
1. Go to https://foco.mx/login
2. Enter credentials:
   - Email: existing user email
   - Password: correct password
3. Submit form

**Expected Results:**
- [ ] Login form loads without errors
- [ ] Successful authentication
- [ ] Redirect to dashboard
- [ ] User session persists
- [ ] No console errors

---

### 3. Empty States Verification

#### 3.1 Milestones Page
**URL:** https://foco.mx/milestones

**Expected:**
- [ ] No mock data displayed
- [ ] Empty state shows: "No milestones yet"
- [ ] "Create Milestone" button visible
- [ ] Target icon displayed
- [ ] Proper styling with centered content
- [ ] No console errors about failed API calls

#### 3.2 Inbox/Notifications Page
**URL:** https://foco.mx/inbox

**Expected:**
- [ ] No mock notifications displayed
- [ ] Empty state shows: "No notifications" or "All caught up!"
- [ ] Inbox icon displayed
- [ ] Tabs work (All vs Unread)
- [ ] Proper empty state for each tab
- [ ] No console errors

#### 3.3 Projects Page
**URL:** https://foco.mx/projects or https://foco.mx/dashboard

**Expected:**
- [ ] If no projects: "No projects yet" with "Create your first project"
- [ ] Projects load if they exist
- [ ] No duplicate key warnings in console
- [ ] Table renders properly

#### 3.4 Organizations Page
**URL:** https://foco.mx/organizations

**Expected:**
- [ ] If no orgs: "No organizations yet"
- [ ] Create organization button visible
- [ ] Proper empty state styling

---

### 4. UI Fixes Verification

#### 4.1 Badge Component Dark Mode
**Test Steps:**
1. Toggle to dark mode (if available)
2. View any page with badges (tasks, projects, milestones)

**Expected:**
- [ ] Badge text is readable in dark mode
- [ ] No dark text on dark background
- [ ] Secondary variant has proper contrast
- [ ] Info variant has proper contrast

#### 4.2 Layout Padding
**Test Steps:**
1. View any main content page
2. Check horizontal spacing

**Expected:**
- [ ] Content extends closer to edges than before
- [ ] No excessive white space on right side
- [ ] Responsive padding on mobile (px-2 sm:px-3 md:px-4)
- [ ] Projects table uses full width appropriately

#### 4.3 Analytics Dashboard
**Test Steps:**
1. Go to https://foco.mx/dashboard/analytics
2. Open browser console

**Expected:**
- [ ] No React duplicate key warnings
- [ ] Charts and data render correctly
- [ ] No console errors

---

### 5. Database Access Verification

**Check in Browser Console:**
```javascript
// These should NOT return 406 errors
fetch('/api/users').then(r => console.log('Users API:', r.status))
fetch('/api/projects').then(r => console.log('Projects API:', r.status))
fetch('/api/organizations').then(r => console.log('Organizations API:', r.status))
```

**Expected:**
- [ ] Users API: 200 or 404 (not 406)
- [ ] Projects API: 200 or 404 (not 406)
- [ ] Organizations API: 200 or 404 (not 406)
- [ ] No RLS policy violations

---

### 6. Critical User Stories

#### Story 1: New User Registration
**As a new user, I want to create an account**

Steps:
1. Visit site
2. Click Register
3. Fill form with valid data
4. Submit
5. Verify account created

Pass Criteria:
- [ ] Account created in database
- [ ] User can log in
- [ ] Redirected to appropriate page

#### Story 2: View Empty Dashboard
**As a new user, I want to see an empty dashboard with guidance**

Steps:
1. Log in as new user with no data
2. View dashboard

Pass Criteria:
- [ ] No mock data shown
- [ ] Empty state displayed
- [ ] Clear call-to-action buttons
- [ ] Professional appearance

#### Story 3: Create First Project
**As a user, I want to create my first project**

Steps:
1. Click "Create Project" or "New Project"
2. Fill in project details
3. Submit

Pass Criteria:
- [ ] Form loads correctly
- [ ] Project created successfully
- [ ] Project appears in list
- [ ] No more empty state

#### Story 4: View Projects
**As a user, I want to view my projects**

Steps:
1. Navigate to projects page
2. View project list/table

Pass Criteria:
- [ ] Projects display correctly
- [ ] No duplicate keys warning
- [ ] Full width utilized
- [ ] Badges readable in light/dark mode

---

## 🐛 Known Issues to Verify Are Fixed

1. **Fixed:** Multiple GoTrueClient instances warning
   - [ ] Check console for this warning (should still appear in dev, okay)

2. **Fixed:** Duplicate React keys in analytics
   - [ ] No duplicate key warnings in analytics dashboard

3. **Fixed:** Dark text on dark background
   - [ ] All badges readable in dark mode

4. **Fixed:** Mock data in milestones
   - [ ] No fake milestones displayed

5. **Fixed:** Mock data in inbox
   - [ ] No fake notifications displayed

6. **Fixed:** 406 errors on users endpoint
   - [ ] Users API returns proper status codes

7. **Fixed:** Reduced padding/white space
   - [ ] Content uses more screen width

8. **Fixed:** RLS not enabled
   - [ ] organization_members has RLS enabled
   - [ ] organizations has RLS enabled

---

## 🔍 Registration Issues - Diagnostic Steps

If registration fails, check these:

### Browser Console Errors
1. Open Developer Tools (F12)
2. Go to Console tab
3. Attempt registration
4. Look for:
   - Red error messages
   - Network request failures
   - RLS policy errors
   - 401/403/406 status codes

### Network Tab Investigation
1. Open Developer Tools > Network tab
2. Attempt registration
3. Find the POST request to `/api/register` or `/api/auth/*`
4. Check:
   - Request payload (email, password sent?)
   - Response status (200, 400, 500?)
   - Response body (error messages?)

### Common Registration Issues

#### Issue: "User already exists"
**Solution:** Email might be taken, try different email

#### Issue: 401/403 Error
**Potential Causes:**
- Supabase keys incorrect
- RLS policies too restrictive
- Missing environment variables

**Check:**
```javascript
// In browser console
console.log(window.ENV) // Check if env vars are set
```

#### Issue: "Email not confirmed"
**Solution:**
- Check Supabase email settings
- Or use auto-confirm in development

#### Issue: No redirect after registration
**Potential Causes:**
- Session not created
- Auth context not updating
- Redirect logic broken

#### Issue: RLS Policy Violation
**Check Database:**
```sql
-- Run in Supabase SQL Editor
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('users', 'user_profiles');
```

**Should see:**
- "Users can view all user profiles" (SELECT, public)
- "Users can update own profile" (UPDATE, public)
- Policies for INSERT on user_profiles

---

## 📊 Success Criteria

### Minimum Viable (Must Pass):
- [ ] Site loads without errors
- [ ] No mock data visible anywhere
- [ ] All empty states display correctly
- [ ] User can attempt to register (even if it fails, form should work)
- [ ] No console errors on page load
- [ ] Dark mode badges are readable

### Full Success (All Pass):
- [ ] All Minimum Viable criteria
- [ ] User registration works end-to-end
- [ ] User can log in
- [ ] User can create a project
- [ ] User can view organizations
- [ ] All API endpoints return proper status codes
- [ ] No RLS policy violations
- [ ] All empty states function correctly
- [ ] Responsive design works on mobile

---

## 📝 Test Results

**Tester:** [Your Name]
**Test Date:** [Fill in]
**Browser:** [Chrome/Firefox/Safari]
**Device:** [Desktop/Mobile]

### Issues Found:
1.
2.
3.

### Screenshots:
- [ ] Empty milestones page
- [ ] Empty inbox page
- [ ] Registration form
- [ ] Any errors encountered

---

## 🚀 Next Steps After Verification

Based on test results:

### If All Tests Pass:
1. Mark deployment as successful
2. Close related issues
3. Document any remaining technical debt

### If Registration Fails:
1. Document exact error messages
2. Check Supabase logs
3. Verify RLS policies
4. Check environment variables
5. Create fix PR if needed

### If Other Issues Found:
1. Document in issues tracker
2. Prioritize based on severity
3. Create fix plan
