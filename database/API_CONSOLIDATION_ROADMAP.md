# API Consolidation Roadmap - Phase 3.2-3.3

**Status:** Planning Phase
**Total Routes:** 82 routes identified
**Target Routes:** 15 core consolidated routes
**Potential Reduction:** 67 routes (82%)

---

## Executive Summary

This document maps the current 82 API routes to 15 core consolidated endpoints. The consolidation will:

- **Eliminate duplicates** (e.g., `/api/organization/*` vs `/api/organizations/*`)
- **Standardize response formats** across similar resources
- **Unify authentication/authorization** patterns
- **Simplify frontend API consumption**
- **Reduce maintenance overhead**

---

## Current Route Inventory (82 Routes)

### 1. Authentication Routes (5 routes)
- `/api/auth/login` - POST: User login
- `/api/auth/logout` - POST: User logout
- `/api/auth/refresh` - POST: Refresh JWT token
- `/api/auth/register` - POST: User registration
- `/api/auth/session` - GET: Get current session

**Consolidation Status:** ✅ Already well-structured

---

### 2. Organization Routes (16 routes)

#### Duplicate Path Prefixes
- `/api/organizations/*` (10 routes) - PREFERRED
- `/api/organization/*` (4 routes) - DEPRECATED

#### Routes:
1. `/api/organizations` - GET: List orgs, POST: Create org
2. `/api/organizations/[id]` - GET: Get org, PUT: Update, DELETE: Delete
3. `/api/organizations/[id]/settings` - GET/PUT: Org settings
4. `/api/organizations/[id]/audit-log` - GET: Org audit log
5. `/api/organizations/[id]/members` - GET: List members, POST: Add member
6. `/api/organizations/[id]/members/[memberId]` - GET/PUT/DELETE: Member management
7. `/api/organizations/[id]/invitations` - GET: List invitations, POST: Create invitation
8. `/api/organizations/[id]/invitations/[invitationId]` - GET/DELETE: Invitation CRUD
9. `/api/organizations/[id]/invitations/[invitationId]/resend` - POST: Resend invitation
10. `/api/organization/members` - ⚠️ DUPLICATE - GET: List members
11. `/api/organization/members/[userId]` - ⚠️ DUPLICATE - GET/PUT/DELETE: Member CRUD
12. `/api/organization/members/[userId]/role` - ⚠️ DUPLICATE - PUT: Update role
13. `/api/organization/invite` - ⚠️ DUPLICATE - POST: Send invitation
14. `/api/organization-setup` - POST: Initial org setup
15. `/api/invitations/[token]/validate` - GET: Validate invitation token
16. `/api/invitations/[token]/accept` - POST: Accept invitation

**Consolidation Plan:**
- **MERGE:** Routes 10-13 into routes 5-6 (use `/api/organizations/[id]/*` pattern)
- **INTEGRATE:** Route 14 into `/api/organizations` POST (add `setup` flag)
- **KEEP SEPARATE:** Routes 15-16 (public endpoints without org ID)

**Result:** 16 routes → 11 routes

---

### 3. Project Routes (7 routes)

1. `/api/projects` - GET: List projects, POST: Create project
2. `/api/projects/[id]` - GET: Get project, PUT: Update, DELETE: Delete
3. `/api/projects/[id]/settings` - GET/PUT: Project settings
4. `/api/projects/[id]/team` - GET: List team members, POST: Add member
5. `/api/projects/[id]/team/[userId]` - GET/PUT/DELETE: Team member CRUD
6. `/api/projects/bulk` - POST: Bulk operations (create/update/delete multiple)
7. `/api/goals/[id]/projects` - GET: Projects linked to goal

**Consolidation Plan:**
- **MERGE:** Route 3 into Route 2 (handle settings as query param or nested resource)
- **KEEP:** Routes 4-7 (well-structured sub-resources)

**Result:** 7 routes → 6 routes

---

### 4. Task Routes (2 routes)

1. `/api/tasks` - GET: List tasks, POST: Create task
2. `/api/tasks/[id]` - GET: Get task, PUT: Update, DELETE: Delete

**Consolidation Status:** ✅ Already optimal

---

### 5. Goal Routes (4 routes)

1. `/api/goals` - GET: List goals, POST: Create goal
2. `/api/goals/[id]` - GET: Get goal, PUT: Update, DELETE: Delete
3. `/api/goals/[id]/milestones` - GET: List milestones for goal
4. `/api/goals/[id]/projects` - GET: List projects for goal

**Consolidation Status:** ✅ Well-structured (nested resources)

---

### 6. Milestone Routes (2 routes)

1. `/api/milestones` - GET: List milestones, POST: Create milestone
2. `/api/milestones/[id]` - GET: Get milestone, PUT: Update, DELETE: Delete

**Consolidation Status:** ✅ Already optimal

---

### 7. Comment Routes (2 routes)

1. `/api/comments` - GET: List comments, POST: Create comment
2. `/api/comments/[id]` - GET: Get comment, PUT: Update, DELETE: Delete

**Consolidation Status:** ✅ Already optimal

---

### 8. Activity Routes (1 route)

1. `/api/activities` - GET: Activity feed

**Consolidation Plan:**
- **CONSIDER:** Merge with audit logs into unified activity stream

**Result:** 1 route → 1 route (or merge into `/api/analytics/events`)

---

### 9. Analytics Routes (7 routes)

1. `/api/analytics/dashboard` - GET: Dashboard analytics
2. `/api/analytics/trends` - GET: Trend analysis
3. `/api/analytics/team` - GET: Team analytics
4. `/api/analytics/projects` - GET: Project analytics (all)
5. `/api/analytics/projects/[id]` - GET: Project analytics (specific)
6. `/api/analytics/events` - POST: Track analytics event
7. `/api/analytics/export` - GET: Export analytics data

**Consolidation Plan:**
- **MERGE:** Routes 1-5 into `/api/analytics` with query params (`type=dashboard|trends|team|projects`)
- **KEEP:** Routes 6-7 (distinct operations)

**Result:** 7 routes → 4 routes

---

### 10. User/Settings Routes (8 routes - MAJOR DUPLICATION)

#### Duplicate Patterns:
- `/api/user/settings/*` (2 routes)
- `/api/settings/*` (3 routes)

#### Routes:
1. `/api/user/settings` - GET/PATCH: User settings
2. `/api/user/settings/notifications` - GET/PUT: Notification settings
3. `/api/user/export` - GET: Export user data
4. `/api/user/audit-log` - GET: User audit log
5. `/api/settings/profile` - ⚠️ DUPLICATE - GET/PUT: User profile
6. `/api/settings/notifications` - ⚠️ DUPLICATE - GET/PUT: Notification settings
7. `/api/settings/organization` - GET/PUT: Organization settings
8. `/api/send-welcome` - POST: Send welcome email

**Consolidation Plan:**
- **MERGE:** Route 5 into `/api/user` (profile as sub-resource)
- **MERGE:** Route 6 into Route 2 (use `/api/user/settings/notifications`)
- **MERGE:** Route 7 into `/api/organizations/[id]/settings`
- **MERGE:** Route 8 into `/api/auth/register` (send welcome email automatically)

**Result:** 8 routes → 4 routes (under `/api/user/*`)

---

### 11. Notification Routes (4 routes)

1. `/api/notifications` - GET: List notifications, POST: Create notification
2. `/api/notifications/send` - POST: Send notification
3. `/api/notifications/subscribe` - POST: Subscribe to topic
4. `/api/notifications/unsubscribe` - POST: Unsubscribe from topic

**Consolidation Plan:**
- **MERGE:** Routes 2-4 as actions on `/api/notifications` (use POST with `action` field)

**Result:** 4 routes → 2 routes

---

### 12. AI Routes (11 routes)

1. `/api/ai/chat` - POST: AI chat
2. `/api/ai/analyze` - POST: Analyze data
3. `/api/ai/generate-content` - POST: Generate content
4. `/api/ai/suggest-task` - POST: Suggest task
5. `/api/ai/suggest-milestone` - POST: Suggest milestone
6. `/api/ai/create-task` - POST: Create task via AI
7. `/api/ai/create-milestone` - POST: Create milestone via AI
8. `/api/ai/create-project` - POST: Create project via AI
9. `/api/ai/test-connection` - GET: Test AI connection
10. `/api/ai/health` - GET: AI service health

**Consolidation Plan:**
- **MERGE:** Routes 4-8 into `/api/ai` with `action` parameter
- **MERGE:** Routes 9-10 into single `/api/ai/health`
- **KEEP:** Routes 1-3 (distinct operations)

**Result:** 11 routes → 5 routes

---

### 13. Mermaid Routes (6 routes)

1. `/api/mermaid/diagrams` - GET: List diagrams, POST: Create diagram
2. `/api/mermaid/diagrams/[id]` - GET: Get diagram, PUT: Update, DELETE: Delete
3. `/api/mermaid/diagrams/[id]/export` - GET: Export diagram
4. `/api/mermaid/diagrams/[id]/share` - POST: Share diagram
5. `/api/mermaid/diagrams/[id]/versions` - GET: List versions
6. `/api/mermaid/share/[token]` - GET: Public share link

**Consolidation Status:** ✅ Well-structured

---

### 14. Import/Export Routes (2 routes)

1. `/api/import-export/import` - POST: Import data
2. `/api/import-export/export` - GET: Export data

**Consolidation Plan:**
- **CONSIDER:** Merge with `/api/user/export` and `/api/analytics/export`

**Result:** 2 routes → 2 routes (or merge into unified export endpoint)

---

### 15. Miscellaneous Routes (7 routes)

1. `/api/health` - GET: System health check
2. `/api/monitoring` - GET: System monitoring metrics
3. `/api/telemetry` - POST: Send telemetry data
4. `/api/backup` - POST: Create backup
5. `/api/backup/restore` - POST: Restore backup
6. `/api/reports/export` - GET: Export reports
7. `/api/instructions` - GET/POST: System instructions

**Consolidation Plan:**
- **MERGE:** Routes 1-2 into `/api/health` (monitoring as query param)
- **MERGE:** Route 3 into `/api/analytics/events`
- **KEEP:** Routes 4-5 (admin operations)
- **MERGE:** Route 6 into `/api/import-export/export`
- **EVALUATE:** Route 7 (determine if needed)

**Result:** 7 routes → 4 routes

---

## Consolidated API Structure (15 Core Routes)

### 1. `/api/auth` - Authentication (5 endpoints)
**Methods:** POST (login, register, logout, refresh), GET (session)

**Merges:**
- Existing auth routes (already consolidated)
- `/api/send-welcome` → handled automatically on register

---

### 2. `/api/user` - User Profile & Settings (4 endpoints)
**Methods:** GET (profile), PUT (profile), GET/PATCH (settings)

**Merges:**
- `/api/settings/profile` → `/api/user/profile`
- `/api/user/settings` (keep)
- `/api/user/settings/notifications` (keep)
- `/api/user/export` → `/api/user/data/export`
- `/api/user/audit-log` (keep)

**Sub-resources:**
- `/api/user/profile` - User profile
- `/api/user/settings` - User settings
- `/api/user/settings/notifications` - Notification preferences
- `/api/user/data/export` - Export user data
- `/api/user/audit-log` - User activity audit

---

### 3. `/api/organizations` - Organization CRUD & Management (11 endpoints)
**Methods:** GET (list), POST (create), GET/PUT/DELETE (by ID)

**Merges:**
- `/api/organization/members` → `/api/organizations/[id]/members`
- `/api/organization/members/[userId]` → `/api/organizations/[id]/members/[userId]`
- `/api/organization/members/[userId]/role` → `/api/organizations/[id]/members/[userId]` (use PUT with role field)
- `/api/organization/invite` → `/api/organizations/[id]/invitations` POST
- `/api/settings/organization` → `/api/organizations/[id]/settings`
- `/api/organization-setup` → `/api/organizations` POST with `setup: true`

**Sub-resources:**
- `/api/organizations` - List/Create
- `/api/organizations/[id]` - Get/Update/Delete
- `/api/organizations/[id]/settings` - Settings
- `/api/organizations/[id]/members` - Members list/add
- `/api/organizations/[id]/members/[memberId]` - Member CRUD
- `/api/organizations/[id]/invitations` - Invitations list/create
- `/api/organizations/[id]/invitations/[invitationId]` - Invitation CRUD
- `/api/organizations/[id]/invitations/[invitationId]/resend` - Resend
- `/api/organizations/[id]/audit-log` - Audit log
- `/api/invitations/[token]/validate` - Public validation
- `/api/invitations/[token]/accept` - Public acceptance

---

### 4. `/api/projects` - Project CRUD & Team (6 endpoints)
**Methods:** GET (list), POST (create), GET/PUT/DELETE (by ID)

**Merges:**
- `/api/projects/[id]/settings` → `/api/projects/[id]` (handle settings as nested fields)
- Keep team routes (well-structured)
- Keep bulk operations

**Sub-resources:**
- `/api/projects` - List/Create
- `/api/projects/[id]` - Get/Update/Delete (includes settings)
- `/api/projects/[id]/team` - Team list/add
- `/api/projects/[id]/team/[userId]` - Team member CRUD
- `/api/projects/bulk` - Bulk operations
- `/api/goals/[id]/projects` - Projects linked to goal

---

### 5. `/api/tasks` - Task CRUD & Bulk Operations (2 endpoints)
**Methods:** GET (list), POST (create), GET/PUT/DELETE (by ID)

**Status:** ✅ Already optimal

**Sub-resources:**
- `/api/tasks` - List/Create
- `/api/tasks/[id]` - Get/Update/Delete

---

### 6. `/api/goals` - Goal CRUD & Relationships (4 endpoints)
**Methods:** GET (list), POST (create), GET/PUT/DELETE (by ID)

**Status:** ✅ Already well-structured

**Sub-resources:**
- `/api/goals` - List/Create
- `/api/goals/[id]` - Get/Update/Delete
- `/api/goals/[id]/milestones` - Related milestones
- `/api/goals/[id]/projects` - Related projects

---

### 7. `/api/milestones` - Milestone CRUD (2 endpoints)
**Methods:** GET (list), POST (create), GET/PUT/DELETE (by ID)

**Status:** ✅ Already optimal

**Sub-resources:**
- `/api/milestones` - List/Create
- `/api/milestones/[id]` - Get/Update/Delete

---

### 8. `/api/comments` - Comment CRUD (2 endpoints)
**Methods:** GET (list), POST (create), GET/PUT/DELETE (by ID)

**Status:** ✅ Already optimal

**Sub-resources:**
- `/api/comments` - List/Create
- `/api/comments/[id]` - Get/Update/Delete

---

### 9. `/api/activities` - Activity Feed & Audit (1 endpoint)
**Methods:** GET (list activities)

**Status:** ✅ Minimal (consider merging with analytics)

**Sub-resources:**
- `/api/activities` - Activity feed

---

### 10. `/api/analytics` - Analytics & Reporting (4 endpoints)
**Methods:** GET (query analytics), POST (track events)

**Merges:**
- `/api/analytics/dashboard` → `/api/analytics?type=dashboard`
- `/api/analytics/trends` → `/api/analytics?type=trends`
- `/api/analytics/team` → `/api/analytics?type=team`
- `/api/analytics/projects` → `/api/analytics?type=projects`
- `/api/analytics/projects/[id]` → `/api/analytics/projects/[id]` (keep)
- `/api/telemetry` → `/api/analytics/events`

**Sub-resources:**
- `/api/analytics` - Query analytics (query params: type, timePeriod, organizationId)
- `/api/analytics/projects/[id]` - Project-specific analytics
- `/api/analytics/events` - Track events (merges telemetry)
- `/api/analytics/export` - Export data

---

### 11. `/api/notifications` - Notification Management (2 endpoints)
**Methods:** GET (list), POST (create/send/subscribe)

**Merges:**
- `/api/notifications/send` → `/api/notifications` POST with `action: "send"`
- `/api/notifications/subscribe` → `/api/notifications` POST with `action: "subscribe"`
- `/api/notifications/unsubscribe` → `/api/notifications` POST with `action: "unsubscribe"`

**Sub-resources:**
- `/api/notifications` - List/Create/Actions (supports action parameter)
- `/api/notifications/[id]` - Notification CRUD (if needed)

---

### 12. `/api/ai` - AI Features (5 endpoints)
**Methods:** POST (AI operations)

**Merges:**
- `/api/ai/suggest-task` → `/api/ai` POST with `action: "suggest"`, `resource: "task"`
- `/api/ai/suggest-milestone` → `/api/ai` POST with `action: "suggest"`, `resource: "milestone"`
- `/api/ai/create-task` → `/api/ai` POST with `action: "create"`, `resource: "task"`
- `/api/ai/create-milestone` → `/api/ai` POST with `action: "create"`, `resource: "milestone"`
- `/api/ai/create-project` → `/api/ai` POST with `action: "create"`, `resource: "project"`
- `/api/ai/test-connection` → `/api/ai/health`

**Sub-resources:**
- `/api/ai` - AI operations (action-based: suggest, create)
- `/api/ai/chat` - Chat interface
- `/api/ai/analyze` - Data analysis
- `/api/ai/generate-content` - Content generation
- `/api/ai/health` - Health check (merges test-connection)

---

### 13. `/api/mermaid` - Diagram Management (6 endpoints)
**Methods:** GET (list), POST (create), GET/PUT/DELETE (by ID)

**Status:** ✅ Already well-structured

**Sub-resources:**
- `/api/mermaid/diagrams` - List/Create
- `/api/mermaid/diagrams/[id]` - Get/Update/Delete
- `/api/mermaid/diagrams/[id]/export` - Export
- `/api/mermaid/diagrams/[id]/share` - Share
- `/api/mermaid/diagrams/[id]/versions` - Versions
- `/api/mermaid/share/[token]` - Public share

---

### 14. `/api/import-export` - Data Import/Export (2 endpoints)
**Methods:** POST (import), GET (export)

**Merges:**
- `/api/reports/export` → `/api/import-export/export?type=reports`
- Consider merging with `/api/user/export` and `/api/analytics/export`

**Sub-resources:**
- `/api/import-export/import` - Import data
- `/api/import-export/export` - Export data (query params: type, format)

---

### 15. `/api/health` - System Health & Monitoring (1 endpoint)
**Methods:** GET (health check)

**Merges:**
- `/api/monitoring` → `/api/health?detailed=true`

**Sub-resources:**
- `/api/health` - System health (query params: detailed)

---

### 16. `/api/backup` (Administrative - 2 endpoints)
**Methods:** POST (create backup, restore)

**Status:** Keep separate (admin operations)

**Sub-resources:**
- `/api/backup` - Create backup
- `/api/backup/restore` - Restore backup

---

## Consolidation Summary

| Category | Current Routes | Consolidated Routes | Reduction |
|----------|----------------|---------------------|-----------|
| Auth | 5 | 5 | 0 |
| Organizations | 16 | 11 | 5 |
| Projects | 7 | 6 | 1 |
| Tasks | 2 | 2 | 0 |
| Goals | 4 | 4 | 0 |
| Milestones | 2 | 2 | 0 |
| Comments | 2 | 2 | 0 |
| Activities | 1 | 1 | 0 |
| Analytics | 7 | 4 | 3 |
| User/Settings | 8 | 4 | 4 |
| Notifications | 4 | 2 | 2 |
| AI | 11 | 5 | 6 |
| Mermaid | 6 | 6 | 0 |
| Import/Export | 2 | 2 | 0 |
| Health/Monitoring | 2 | 1 | 1 |
| Backup | 2 | 2 | 0 |
| Misc (instructions) | 1 | 0 | 1 |
| **TOTAL** | **82** | **59** | **23** |

**Note:** Further consolidation possible by merging action-based routes into unified endpoints with parameters.

---

## Response Format Standardization

### Current Issues:
1. **Inconsistent error responses** - Some use `error`, others use `message`
2. **Mixed success responses** - Some return `{ data }`, others return raw data
3. **Pagination inconsistency** - Different pagination parameter names
4. **Authentication patterns** - Mix of `wrapRoute` vs manual auth

### Standardized Response Format:

#### Success Response:
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "hasMore": true
  },
  "meta": {
    "timestamp": "2024-01-08T10:30:00Z",
    "requestId": "uuid"
  }
}
```

#### Error Response:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [ ... ],
    "statusCode": 400
  },
  "meta": {
    "timestamp": "2024-01-08T10:30:00Z",
    "requestId": "uuid"
  }
}
```

---

## Authentication/Authorization Standardization

### Current Issues:
- `/api/user/settings` uses manual auth
- `/api/settings/profile` uses `wrapRoute`
- Inconsistent permission checking

### Standardization:
1. **Use `wrapRoute` everywhere** for consistent auth
2. **Centralized permission middleware** for role-based access
3. **Unified rate limiting** across all endpoints

---

## Migration Strategy (Frontend Impact)

### Phase 1: Add Consolidated Routes (Non-Breaking)
- Create new unified endpoints alongside old ones
- Add deprecation warnings to old endpoints
- Update API documentation

### Phase 2: Frontend Migration (2-4 weeks)
- Update frontend clients to use new endpoints
- Monitor usage of old endpoints
- Add metrics to track migration progress

### Phase 3: Deprecation (2-4 weeks)
- Return deprecation headers on old endpoints
- Log warnings when old endpoints are used
- Prepare migration guides

### Phase 4: Removal (1 week)
- Remove old endpoints once usage drops to 0%
- Update all tests
- Final documentation update

---

## Frontend Changes Required

### 1. Organizations (`/api/organization/*` → `/api/organizations/[id]/*`)

**Before:**
```typescript
// Get members
fetch('/api/organization/members')

// Update member role
fetch('/api/organization/members/123/role', { method: 'PUT' })

// Invite user
fetch('/api/organization/invite', { method: 'POST' })
```

**After:**
```typescript
// Get members
fetch('/api/organizations/[orgId]/members')

// Update member (role in body)
fetch('/api/organizations/[orgId]/members/123', {
  method: 'PUT',
  body: JSON.stringify({ role: 'admin' })
})

// Invite user
fetch('/api/organizations/[orgId]/invitations', { method: 'POST' })
```

---

### 2. User Settings (`/api/settings/*` → `/api/user/*`)

**Before:**
```typescript
// Get profile
fetch('/api/settings/profile')

// Get org settings
fetch('/api/settings/organization')

// Get notification settings
fetch('/api/settings/notifications')
```

**After:**
```typescript
// Get profile
fetch('/api/user/profile')

// Get org settings (moved)
fetch('/api/organizations/[orgId]/settings')

// Get notification settings
fetch('/api/user/settings/notifications')
```

---

### 3. Analytics (`/api/analytics/*` → `/api/analytics?type=*`)

**Before:**
```typescript
fetch('/api/analytics/dashboard')
fetch('/api/analytics/trends')
fetch('/api/analytics/team')
```

**After:**
```typescript
fetch('/api/analytics?type=dashboard&timePeriod=30d')
fetch('/api/analytics?type=trends&timePeriod=30d')
fetch('/api/analytics?type=team&timePeriod=30d')
```

---

### 4. AI Operations (`/api/ai/*-*` → `/api/ai` with action)

**Before:**
```typescript
fetch('/api/ai/suggest-task', { method: 'POST', body: { context } })
fetch('/api/ai/create-task', { method: 'POST', body: { data } })
```

**After:**
```typescript
fetch('/api/ai', {
  method: 'POST',
  body: JSON.stringify({ action: 'suggest', resource: 'task', context })
})
fetch('/api/ai', {
  method: 'POST',
  body: JSON.stringify({ action: 'create', resource: 'task', data })
})
```

---

### 5. Notifications (`/api/notifications/*` → `/api/notifications` with action)

**Before:**
```typescript
fetch('/api/notifications/send', { method: 'POST', body: { message } })
fetch('/api/notifications/subscribe', { method: 'POST', body: { topicId } })
```

**After:**
```typescript
fetch('/api/notifications', {
  method: 'POST',
  body: JSON.stringify({ action: 'send', message })
})
fetch('/api/notifications', {
  method: 'POST',
  body: JSON.stringify({ action: 'subscribe', topicId })
})
```

---

## Next Steps (Execution Phase)

### Step 1: Mark Deprecated Routes (This Phase)
1. Add `// CONSOLIDATE: merge into /api/...` comments to all deprecated routes
2. Document which routes map to which consolidated endpoints
3. No deletion yet - just planning

### Step 2: Create Unified Endpoints (Future Phase 3.3)
1. Create new consolidated routes
2. Implement action-based routing for AI/notifications
3. Add deprecation warnings to old routes
4. Comprehensive testing

### Step 3: Update Frontend (Future Phase 3.4)
1. Create migration PRs for frontend
2. Update API client libraries
3. Add feature flags for gradual rollout
4. Monitor error rates

### Step 4: Remove Deprecated Routes (Future Phase 3.5)
1. Confirm zero usage of old endpoints
2. Delete deprecated route files
3. Update tests
4. Final documentation

---

## Risk Assessment

### Low Risk:
- Routes already well-structured (tasks, milestones, comments, goals)
- Mermaid routes (isolated feature)

### Medium Risk:
- Analytics consolidation (query param based routing)
- Notification action-based routing
- AI action-based routing

### High Risk:
- Organization route consolidation (16 → 11 routes)
- User/Settings consolidation (scattered across codebase)
- Frontend has hardcoded paths in many places

### Mitigation:
1. **Gradual rollout** with feature flags
2. **Parallel routes** during migration (old + new)
3. **Comprehensive testing** before deprecation
4. **Monitoring & alerts** for API errors
5. **Rollback plan** if errors spike

---

## Success Metrics

1. **Route count reduction:** 82 → 59 routes (28% reduction)
2. **Response format consistency:** 100% standardized
3. **Frontend migration:** 0% usage of deprecated endpoints
4. **Error rate:** No increase during migration
5. **API latency:** No degradation
6. **Test coverage:** Maintain 80%+ coverage

---

## Appendix: Full Route Mapping

### Organizations
| Current Route | Consolidated Route | Method | Action |
|---------------|-------------------|--------|--------|
| `/api/organizations` | `/api/organizations` | GET/POST | Keep |
| `/api/organizations/[id]` | `/api/organizations/[id]` | GET/PUT/DELETE | Keep |
| `/api/organizations/[id]/settings` | `/api/organizations/[id]/settings` | GET/PUT | Keep |
| `/api/organizations/[id]/members` | `/api/organizations/[id]/members` | GET/POST | Keep |
| `/api/organizations/[id]/members/[memberId]` | `/api/organizations/[id]/members/[memberId]` | GET/PUT/DELETE | Keep |
| `/api/organizations/[id]/invitations` | `/api/organizations/[id]/invitations` | GET/POST | Keep |
| `/api/organizations/[id]/invitations/[invitationId]` | `/api/organizations/[id]/invitations/[invitationId]` | GET/DELETE | Keep |
| `/api/organizations/[id]/invitations/[invitationId]/resend` | `/api/organizations/[id]/invitations/[invitationId]/resend` | POST | Keep |
| `/api/organizations/[id]/audit-log` | `/api/organizations/[id]/audit-log` | GET | Keep |
| `/api/organization/members` | `/api/organizations/[id]/members` | GET | **MERGE** |
| `/api/organization/members/[userId]` | `/api/organizations/[id]/members/[userId]` | GET/PUT/DELETE | **MERGE** |
| `/api/organization/members/[userId]/role` | `/api/organizations/[id]/members/[userId]` | PUT | **MERGE** (role in body) |
| `/api/organization/invite` | `/api/organizations/[id]/invitations` | POST | **MERGE** |
| `/api/organization-setup` | `/api/organizations` | POST | **MERGE** (setup flag) |
| `/api/invitations/[token]/validate` | `/api/invitations/[token]/validate` | GET | Keep (public) |
| `/api/invitations/[token]/accept` | `/api/invitations/[token]/accept` | POST | Keep (public) |

### User/Settings
| Current Route | Consolidated Route | Method | Action |
|---------------|-------------------|--------|--------|
| `/api/user/settings` | `/api/user/settings` | GET/PATCH | Keep |
| `/api/user/settings/notifications` | `/api/user/settings/notifications` | GET/PUT | Keep |
| `/api/user/export` | `/api/user/data/export` | GET | Rename |
| `/api/user/audit-log` | `/api/user/audit-log` | GET | Keep |
| `/api/settings/profile` | `/api/user/profile` | GET/PUT | **MERGE** |
| `/api/settings/notifications` | `/api/user/settings/notifications` | GET/PUT | **MERGE** |
| `/api/settings/organization` | `/api/organizations/[id]/settings` | GET/PUT | **MERGE** |
| `/api/send-welcome` | (handled automatically on register) | POST | **MERGE** |

### Analytics
| Current Route | Consolidated Route | Method | Action |
|---------------|-------------------|--------|--------|
| `/api/analytics/dashboard` | `/api/analytics?type=dashboard` | GET | **MERGE** (query param) |
| `/api/analytics/trends` | `/api/analytics?type=trends` | GET | **MERGE** (query param) |
| `/api/analytics/team` | `/api/analytics?type=team` | GET | **MERGE** (query param) |
| `/api/analytics/projects` | `/api/analytics?type=projects` | GET | **MERGE** (query param) |
| `/api/analytics/projects/[id]` | `/api/analytics/projects/[id]` | GET | Keep |
| `/api/analytics/events` | `/api/analytics/events` | POST | Keep |
| `/api/analytics/export` | `/api/analytics/export` | GET | Keep |
| `/api/telemetry` | `/api/analytics/events` | POST | **MERGE** |

### AI
| Current Route | Consolidated Route | Method | Action |
|---------------|-------------------|--------|--------|
| `/api/ai/chat` | `/api/ai/chat` | POST | Keep |
| `/api/ai/analyze` | `/api/ai/analyze` | POST | Keep |
| `/api/ai/generate-content` | `/api/ai/generate-content` | POST | Keep |
| `/api/ai/suggest-task` | `/api/ai` (action: suggest, resource: task) | POST | **MERGE** |
| `/api/ai/suggest-milestone` | `/api/ai` (action: suggest, resource: milestone) | POST | **MERGE** |
| `/api/ai/create-task` | `/api/ai` (action: create, resource: task) | POST | **MERGE** |
| `/api/ai/create-milestone` | `/api/ai` (action: create, resource: milestone) | POST | **MERGE** |
| `/api/ai/create-project` | `/api/ai` (action: create, resource: project) | POST | **MERGE** |
| `/api/ai/test-connection` | `/api/ai/health` | GET | **MERGE** |
| `/api/ai/health` | `/api/ai/health` | GET | Keep |

### Notifications
| Current Route | Consolidated Route | Method | Action |
|---------------|-------------------|--------|--------|
| `/api/notifications` | `/api/notifications` | GET/POST | Keep |
| `/api/notifications/send` | `/api/notifications` (action: send) | POST | **MERGE** |
| `/api/notifications/subscribe` | `/api/notifications` (action: subscribe) | POST | **MERGE** |
| `/api/notifications/unsubscribe` | `/api/notifications` (action: unsubscribe) | POST | **MERGE** |

### Health/Monitoring
| Current Route | Consolidated Route | Method | Action |
|---------------|-------------------|--------|--------|
| `/api/health` | `/api/health` | GET | Keep |
| `/api/monitoring` | `/api/health?detailed=true` | GET | **MERGE** |

### Miscellaneous
| Current Route | Consolidated Route | Method | Action |
|---------------|-------------------|--------|--------|
| `/api/reports/export` | `/api/import-export/export?type=reports` | GET | **MERGE** |
| `/api/instructions` | (evaluate if needed) | GET/POST | **EVALUATE** |

---

## Conclusion

This consolidation roadmap provides a clear path from 82 routes to a more maintainable API structure. The phased approach minimizes risk while improving developer experience and reducing maintenance overhead.

**Recommended Next Steps:**
1. Review and approve this consolidation plan
2. Mark deprecated routes with consolidation comments
3. Plan frontend migration timeline
4. Begin Phase 3.3 implementation

**Document Status:** DRAFT - Awaiting Review
**Last Updated:** 2026-01-08
**Version:** 1.0
