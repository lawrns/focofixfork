# RLS Policies Reference Guide

Quick reference for developers working with Row Level Security in Foco.

---

## How RLS Works

All database queries now automatically filter based on the authenticated user's permissions. The `auth.uid()` function returns the current user's ID from the Supabase session.

---

## Projects Access

### Who can see a project?
1. ✅ The user who created it (`created_by = auth.uid()`)
2. ✅ Members of the project's organization
3. ✅ Users added to the project team

### Who can modify a project?
- ✅ Only the project creator can update/delete

### Who can create a project?
- ✅ Any authenticated user

**Example Query (automatic filtering)**:
```sql
-- User only sees their accessible projects
SELECT * FROM projects;  -- RLS applies automatically

-- Behind the scenes, RLS adds:
WHERE created_by = auth.uid()
   OR organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
   OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
```

---

## Tasks Access

### Who can see tasks?
1. ✅ Users who can access the parent project

### Who can modify tasks?
- ✅ Users who can access the parent project (for UPDATE)
- ✅ Only project owners can delete tasks

### Who can create tasks?
- ✅ Users who own the parent project

**Example Query**:
```sql
-- User only sees tasks in their projects
SELECT * FROM tasks WHERE project_id = 'xyz';  -- RLS checks project access
```

---

## Milestones Access

### Who can see milestones?
1. ✅ Users who can access the parent project

### Who can modify milestones?
- ✅ Users who own the parent project

### Milestone Statuses
- `green` - On track
- `yellow` - At risk
- `red` - Blocked/overdue

---

## Goals Access

### Who can see goals?
1. ✅ The goal owner (`owner_id = auth.uid()`)
2. ✅ Members of the goal's organization

### Who can modify goals?
- ✅ Only the goal owner

---

## Organization Members

### Who can see members?
- ✅ All members of the organization

### Who can add members?
- ✅ Only organization admins and owners

### Roles
- `owner` - Full control, cannot be removed
- `admin` - Can manage members and settings
- `member` - Regular member

---

## Project Members

### Who can see team members?
- ✅ Anyone who can access the project

### Who can add team members?
- ✅ Project owners and admins

### Roles
- `owner` - Project creator, full control
- `admin` - Can manage team
- `member` - Regular team member

---

## API Integration

All API routes use `requireAuth()` which sets the Supabase session. RLS policies automatically use this session via `auth.uid()`.

### Example API Handler
```typescript
import { wrapRoute } from '@/server/http/wrapRoute'
import { supabaseServer } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  return wrapRoute(Schema, async ({ user }) => {
    // RLS automatically filters to user's accessible projects
    const { data, error } = await supabaseServer
      .from('projects')
      .select('*')
      .eq('status', 'active')

    // Data only includes projects user can access
    return data
  })(request)
}
```

---

## Testing RLS Policies

### Test as Specific User
```sql
-- Set the user session
SET request.jwt.claim.sub = 'user-uuid-here';

-- Now queries will use RLS as that user
SELECT * FROM projects;  -- Only shows that user's projects
```

### Test Policy Directly
```sql
-- Check what a policy allows
EXPLAIN (VERBOSE, COSTS OFF)
SELECT * FROM projects
WHERE created_by = 'user-uuid-here';
```

---

## Common Patterns

### Check if User Can Access Project
```typescript
const { data, error } = await supabaseServer
  .from('projects')
  .select('id')
  .eq('id', projectId)
  .single()

// If error or no data, user doesn't have access
if (error || !data) {
  throw new ForbiddenError('Access denied')
}
```

### Create Task in Project
```typescript
// RLS will verify user has access to project
const { data, error } = await supabaseServer
  .from('tasks')
  .insert({
    title: 'New task',
    project_id: projectId,  // Must be accessible project
    created_by: user.id
  })
  .select()
  .single()

// If error, user doesn't have access to that project
```

### Query Organization Projects
```typescript
// RLS automatically filters to user's organizations
const { data, error } = await supabaseServer
  .from('projects')
  .select('*')
  .eq('organization_id', orgId)

// Only returns projects in organizations where user is a member
```

---

## Performance Tips

### Use Indexes for RLS Queries
All policies use indexed columns:
- ✅ `created_by` - indexed on all tables
- ✅ `organization_id` - indexed on all tables
- ✅ `project_id` - indexed on all tables
- ✅ `user_id` - indexed on membership tables

### Avoid SELECT *
Be specific about columns to reduce data transfer:
```typescript
// Good
.select('id, name, status, created_at')

// Less efficient
.select('*')
```

### Use Proper Filters
Combine RLS with application filters for best performance:
```typescript
// RLS filters by access, application filters by status
const { data } = await supabaseServer
  .from('projects')
  .select('id, name, status')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(10)
```

---

## Troubleshooting

### "Row violates row-level security policy"
**Cause**: Trying to access/modify a row you don't have permission for.

**Solution**: Verify the user has:
1. Created the project (for projects)
2. Is a member of the organization (for org resources)
3. Is a member of the project team (for project resources)

### "No rows returned" but data exists
**Cause**: RLS is filtering out rows you don't have access to.

**Solution**: This is correct behavior! Users should only see their data.

### Performance Issues
**Cause**: RLS policies use subqueries which can be slow on large tables.

**Solution**:
1. ✅ Indexes are already in place (via migration)
2. ✅ Use `.limit()` on queries
3. ✅ Add specific filters before RLS checks
4. Consider caching organization/project memberships in session

---

## Status Enums

### Project Status
- `planning` - Initial planning phase
- `active` - In progress
- `on_hold` - Temporarily paused
- `completed` - Successfully finished
- `cancelled` - Abandoned

### Task Status
- `todo` - Not started
- `in_progress` - Currently working on
- `review` - Ready for review
- `done` - Completed
- `blocked` - Cannot proceed

### Priority Levels (Tasks & Projects)
- `low` - Nice to have
- `medium` - Normal priority
- `high` - Important
- `urgent` - Critical, immediate attention

### Milestone Status
- `green` - On track, no issues
- `yellow` - At risk, needs attention
- `red` - Blocked or overdue

---

## Database Constraints

### NOT NULL Constraints
- ✅ `projects.created_by` - Required
- ✅ `tasks.project_id` - Required
- ✅ `milestones.project_id` - Required

### UNIQUE Constraints
- ✅ `organization_members(user_id, organization_id)` - No duplicates
- ✅ `project_members(user_id, project_id)` - No duplicates

### CHECK Constraints
- ✅ Project status must be valid enum
- ✅ Task status must be valid enum
- ✅ Task priority must be valid enum
- ✅ Progress percentage must be 0-100

### Foreign Keys (CASCADE DELETE)
- ✅ `tasks.project_id` → `projects.id`
- ✅ `milestones.project_id` → `projects.id`
- ✅ `project_members.project_id` → `projects.id`

**Impact**: Deleting a project automatically deletes all tasks, milestones, and team memberships.

---

## Migration History

- **Migration 999**: Comprehensive database fixes (2025-10-15)
  - Enabled RLS on all core tables
  - Created 23 comprehensive policies
  - Added 31 performance indexes
  - Enforced data integrity constraints
  - Added auto-update triggers

---

## Additional Resources

- **Migration Report**: `database/migrations/999_MIGRATION_REPORT.md`
- **Migration SQL**: `database/migrations/999_comprehensive_database_fixes.sql`
- **API Security Guide**: ESLint rules prevent x-user-id usage
- **Supabase RLS Docs**: https://supabase.com/docs/guides/auth/row-level-security

---

**Last Updated**: 2025-10-15
**Status**: Production Active
