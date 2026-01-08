# API Consolidation Roadmap

## Overview

This document outlines the consolidation strategy for the Foco API, reducing route complexity from **82 current routes to 59 consolidated routes (28% reduction)** while improving consistency and maintainability.

## Executive Summary

| Metric | Current | Target | Reduction |
|--------|---------|--------|-----------|
| Total Routes | 82 | 59 | 23 (28%) |
| Route Categories | 16 | 15 | 1 |
| Organization Routes | 16 | 11 | 5 |
| User/Settings Routes | 8 | 4 | 4 |
| Analytics Routes | 7 | 4 | 3 |
| AI Routes | 11 | 5 | 6 |
| Notification Routes | 4 | 2 | 2 |

---

## Detailed Analysis by Category

### 1. Authentication Routes (5 routes)
- `/api/auth/login` - POST: User login
- `/api/auth/register` - POST: User registration
- `/api/auth/logout` - POST: User logout
- `/api/auth/refresh` - POST: Refresh token
- `/api/auth/session` - GET: Session info

**Status:** ✅ Already optimal

---

### 2. Organization Routes (16 → 11 routes) - HIGH PRIORITY

#### Current Problematic Routes:
- `/api/organizations/*` (6 routes) - Primary pattern
- `/api/organization/*` (10 routes) - DUPLICATE/INCONSISTENT pattern

**Consolidation Issues:**
1. **Naming inconsistency:** `/api/organizations` vs `/api/organization`
2. **Member management duplicated:** Routes 10-13 duplicate routes 5-6
3. **Organizational setup pattern:** Route 14 should integrate into POST `/api/organizations`

#### Detailed Routes:
1. `/api/organizations` - GET/POST: List/create organizations
2. `/api/organizations/[id]` - GET/PUT/DELETE: Org CRUD
3. `/api/organizations/[id]/settings` - GET/PUT: Org settings
4. `/api/organizations/[id]/members` - GET/POST: List/add members
5. `/api/organizations/[id]/members/[memberId]` - GET/PUT/DELETE: Member CRUD
6. `/api/organizations/[id]/invitations` - GET/POST: Invitations
7. `/api/organizations/[id]/invitations/[invitationId]` - GET/DELETE: Invitation CRUD
8. `/api/organizations/[id]/invitations/[invitationId]/resend` - POST: Resend invitation
9. `/api/organization/members` - ⚠️ DUPLICATE - GET: List members
10. `/api/organization/members/[userId]` - ⚠️ DUPLICATE - GET/PUT/DELETE: Member CRUD
11. `/api/organization/members/[userId]/role` - ⚠️ DUPLICATE - PUT: Update role
12. `/api/organization/invite` - ⚠️ DUPLICATE - POST: Send invitation
13. `/api/organization-setup` - POST: Initial org setup
14. `/api/invitations/[token]/validate` - GET: Validate invitation token
15. `/api/invitations/[token]/accept` - POST: Accept invitation

**Consolidation Plan:**
- **MERGE:** Routes 9-12 into routes 4-6 (standardize to `/api/organizations/[id]/*` pattern)
- **INTEGRATE:** Route 13 into POST `/api/organizations` with `setup: true` flag
- **KEEP SEPARATE:** Routes 14-15 (public endpoints without org ID requirement)

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

### 4. Core Resource Routes (Tasks, Goals, Milestones, Comments)

#### Task Routes (2 routes) - ✅ Optimal
- `/api/tasks` - GET/POST
- `/api/tasks/[id]` - GET/PUT/DELETE

#### Goal Routes (4 routes) - ✅ Optimal
- `/api/goals` - GET/POST
- `/api/goals/[id]` - GET/PUT/DELETE
- `/api/goals/[id]/milestones` - GET: Related milestones
- `/api/goals/[id]/projects` - GET: Related projects

#### Milestone Routes (2 routes) - ✅ Optimal
- `/api/milestones` - GET/POST
- `/api/milestones/[id]` - GET/PUT/DELETE

#### Comment Routes (2 routes) - ✅ Optimal
- `/api/comments` - GET/POST
- `/api/comments/[id]` - GET/PUT/DELETE

---

### 5. User/Settings Routes (8 → 4 routes) - HIGH PRIORITY

#### Current Problematic Routes:
- `/api/user/settings/*` (2 routes)
- `/api/settings/*` (3 routes) - DUPLICATE paths
- `/api/user/*` (2 routes)
- `/api/send-welcome` (1 route) - Misplaced

**Consolidation Issues:**
1. **Path inconsistency:** Some use `/api/user/*` and others `/api/settings/*`
2. **Settings duplication:** Routes 2 and 6 both handle notifications
3. **Organizational settings:** Route 7 in user namespace but belongs with organization
4. **Welcome email:** Route 8 should be handled by registration

#### Detailed Routes:
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

### 6. Analytics Routes (7 → 4 routes) - MEDIUM PRIORITY

1. `/api/analytics/dashboard` - GET: Dashboard analytics
2. `/api/analytics/trends` - GET: Trend analysis
3. `/api/analytics/team` - GET: Team analytics
4. `/api/analytics/projects` - GET: Project analytics (all)
5. `/api/analytics/projects/[id]` - GET: Project analytics (specific)
6. `/api/analytics/events` - POST: Track analytics event
7. `/api/analytics/export` - GET: Export analytics data

**Consolidation Plan:**
- **MERGE:** Routes 1-4 into `/api/analytics` with query params (`type=dashboard|trends|team|projects`)
- **KEEP:** Routes 6-7 (distinct operations - event tracking and export)

**Result:** 7 routes → 4 routes

**Example Migration:**
```typescript
// Before:
GET /api/analytics/dashboard
GET /api/analytics/trends
GET /api/analytics/team

// After:
GET /api/analytics?type=dashboard&timePeriod=30d
GET /api/analytics?type=trends&timePeriod=30d
GET /api/analytics?type=team&timePeriod=30d
```

---

### 7. Notification Routes (4 → 2 routes) - MEDIUM PRIORITY

1. `/api/notifications` - GET: List notifications, POST: Create notification
2. `/api/notifications/send` - POST: Send notification
3. `/api/notifications/subscribe` - POST: Subscribe to topic
4. `/api/notifications/unsubscribe` - POST: Unsubscribe from topic

**Consolidation Plan:**
- **MERGE:** Routes 2-4 as actions on `/api/notifications` (use POST with `action` field)

**Result:** 4 routes → 2 routes

**Example Migration:**
```typescript
// Before:
POST /api/notifications/send { message: "..." }
POST /api/notifications/subscribe { topicId: "..." }

// After:
POST /api/notifications { action: "send", message: "..." }
POST /api/notifications { action: "subscribe", topicId: "..." }
```

---

### 8. AI Routes (11 → 5 routes) - HIGH PRIORITY

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
- **MERGE:** Routes 4-8 into `/api/ai` with `action` and `resource` parameters
- **MERGE:** Routes 9-10 into single `/api/ai/health`
- **KEEP:** Routes 1-3 (primary operations)

**Result:** 11 routes → 5 routes

**Example Migration:**
```typescript
// Before:
POST /api/ai/suggest-task { context: "..." }
POST /api/ai/create-task { data: {...} }

// After:
POST /api/ai { action: "suggest", resource: "task", context: "..." }
POST /api/ai { action: "create", resource: "task", data: {...} }
```

---

### 9. Mermaid Routes (6 routes)

1. `/api/mermaid/diagrams` - GET/POST: List/create diagrams
2. `/api/mermaid/diagrams/[id]` - GET/PUT/DELETE: Diagram CRUD
3. `/api/mermaid/diagrams/[id]/export` - GET: Export diagram
4. `/api/mermaid/diagrams/[id]/share` - POST: Share diagram
5. `/api/mermaid/diagrams/[id]/versions` - GET: List versions
6. `/api/mermaid/share/[token]` - GET: Public share link

**Status:** ✅ Already well-structured

---

### 10. Import/Export Routes (2 routes)

1. `/api/import-export/import` - POST: Import data
2. `/api/import-export/export` - GET: Export data

**Consolidation Plan:**
- **CONSIDER:** Merge with `/api/user/export` and `/api/analytics/export` into unified export endpoint

**Status:** Currently optimal (2 routes)

---

### 11. Health & Monitoring Routes (2 → 1 route)

1. `/api/health` - GET: System health check
2. `/api/monitoring` - GET: System monitoring metrics

**Consolidation Plan:**
- **MERGE:** Route 2 into Route 1 with `detailed=true` query param

**Result:** 2 routes → 1 route

---

### 12. Activity & Miscellaneous Routes

- `/api/activities` (1 route) - Activity feed
- `/api/telemetry` (1 route) - Should merge into `/api/analytics/events`
- `/api/backup/*` (2 routes) - Admin operations (keep separate)
- `/api/instructions` (1 route) - Evaluate if needed
- `/api/reports/export` (1 route) - Merge into `/api/import-export/export`

---

## Consolidated API Structure (15 Core Route Groups)

```
1. /api/auth          - 5 endpoints (login, register, logout, refresh, session)
2. /api/user          - 4 endpoints (profile, settings, notifications, data export)
3. /api/organizations - 11 endpoints (CRUD, members, invitations, settings)
4. /api/projects      - 6 endpoints (CRUD, team management, bulk operations)
5. /api/tasks         - 2 endpoints (list/create, CRUD)
6. /api/goals         - 4 endpoints (CRUD, relationships)
7. /api/milestones    - 2 endpoints (list/create, CRUD)
8. /api/comments      - 2 endpoints (list/create, CRUD)
9. /api/activities    - 1 endpoint (activity feed)
10. /api/analytics    - 4 endpoints (dashboard, trends, team, projects, events, export)
11. /api/notifications - 2 endpoints (list/actions)
12. /api/ai           - 5 endpoints (chat, analyze, generate, suggest, create, health)
13. /api/mermaid      - 6 endpoints (diagrams, export, share, versions)
14. /api/import-export - 2 endpoints (import, export)
15. /api/backup       - 2 endpoints (create, restore)
```

---

## Response Format Standardization

### Current Issues
1. **Inconsistent error responses** - Some use `error`, others use `message`
2. **Mixed success responses** - Some return `{ data }`, others return raw data
3. **Pagination inconsistency** - Different parameter names
4. **Authentication patterns** - Mix of `wrapRoute` vs manual auth

### Standardized Response Format

**Success Response:**
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

**Error Response:**
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

## Migration Strategy

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

### Organizations Migration
```typescript
// Before:
fetch('/api/organization/members')
fetch('/api/organization/members/123/role', { method: 'PUT' })

// After:
fetch('/api/organizations/[orgId]/members')
fetch('/api/organizations/[orgId]/members/123', {
  method: 'PUT',
  body: JSON.stringify({ role: 'admin' })
})
```

### User Settings Migration
```typescript
// Before:
fetch('/api/settings/profile')
fetch('/api/settings/organization')

// After:
fetch('/api/user/profile')
fetch('/api/organizations/[orgId]/settings')
```

### Analytics Migration
```typescript
// Before:
fetch('/api/analytics/dashboard')
fetch('/api/analytics/trends')

// After:
fetch('/api/analytics?type=dashboard&timePeriod=30d')
fetch('/api/analytics?type=trends&timePeriod=30d')
```

### AI Operations Migration
```typescript
// Before:
fetch('/api/ai/suggest-task', { method: 'POST', body: { context } })
fetch('/api/ai/create-task', { method: 'POST', body: { data } })

// After:
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

## Risk Assessment

### Low Risk
- Routes already well-structured (tasks, milestones, comments, goals)
- Mermaid routes (isolated feature)
- Health check consolidation

### Medium Risk
- Analytics consolidation (query param based routing)
- Notification action-based routing
- AI action-based routing

### High Risk
- Organization route consolidation (16 → 11 routes with duplicates)
- User/Settings consolidation (scattered across codebase)
- Frontend has hardcoded paths in many places

### Mitigation Strategy
1. **Gradual rollout** with feature flags
2. **Parallel routes** during migration (old + new)
3. **Comprehensive testing** before deprecation
4. **Monitoring & alerts** for API errors
5. **Rollback plan** if errors spike

---

## Implementation Roadmap

### Step 1: Mark Deprecated Routes (Phase 3.3a)
1. Add `// CONSOLIDATE: merge into /api/...` comments to all deprecated routes
2. Document which routes map to which consolidated endpoints
3. No deletion yet - just planning

### Step 2: Create Unified Endpoints (Phase 3.3b)
1. Create new consolidated routes
2. Implement action-based routing for AI/notifications
3. Add deprecation warnings to old routes
4. Comprehensive testing

### Step 3: Update Frontend (Phase 3.4)
1. Create migration PRs for frontend
2. Update API client libraries
3. Add feature flags for gradual rollout
4. Monitor error rates

### Step 4: Remove Deprecated Routes (Phase 3.5)
1. Confirm zero usage of old endpoints
2. Delete deprecated route files
3. Update tests
4. Final documentation

---

## Success Metrics

1. **Route count reduction:** 82 → 59 routes (28%)
2. **Response format consistency:** 100% standardized
3. **Frontend migration:** 0% usage of deprecated endpoints
4. **Error rate:** No increase during migration
5. **API latency:** No degradation
6. **Test coverage:** Maintain 80%+ coverage

---

## Document Status

- **Status:** DRAFT - Ready for Review
- **Version:** 1.0
- **Last Updated:** 2026-01-08
- **Author:** Consolidation Analysis Agent
- **Next Action:** Review consolidation plan and approve Phase 3.3 execution

