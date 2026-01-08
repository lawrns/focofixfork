# Architecture Guide - Post-Consolidation

**Project:** Foco - Project Management System
**Date:** 2026-01-08
**Status:** Production Architecture

---

## Overview

This document describes the Foco application architecture after the consolidation project that reduced system complexity by ~70%. The architecture follows modern best practices with clear separation of concerns, feature-based organization, and single sources of truth for all core domains.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Directory Structure](#directory-structure)
3. [Database Architecture](#database-architecture)
4. [API Architecture](#api-architecture)
5. [Service Layer](#service-layer)
6. [Component Architecture](#component-architecture)
7. [Data Flow](#data-flow)
8. [Authentication & Authorization](#authentication--authorization)
9. [Feature Modules](#feature-modules)
10. [Deployment Architecture](#deployment-architecture)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Features   │  │  Components  │  │     Pages    │      │
│  │   (10 dirs)  │  │   (56 dirs)  │  │  (App Router)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                           │                                  │
│  ┌────────────────────────┴────────────────────────┐        │
│  │              Service Layer (3 services)          │        │
│  │  • Analytics • Goals • Export                    │        │
│  └──────────────────────────────────────────────────┘        │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  │ API Routes (59 total)
                                  │
┌─────────────────────────────────┴───────────────────────────┐
│                    API Layer (Next.js API Routes)            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Organizations • Projects • Tasks • Goals            │   │
│  │  Analytics • AI • Notifications • Voice Planning     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  │ Supabase Client
                                  │
┌─────────────────────────────────┴───────────────────────────┐
│                  Database (Supabase PostgreSQL)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Core Tables (22 total, consolidated from 69)        │   │
│  │  • Projects • Tasks • Milestones • Goals             │   │
│  │  • Organizations • Users • Voice Planning            │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Radix UI

**Backend:**
- Next.js API Routes
- Supabase (PostgreSQL)
- Supabase Auth
- Supabase Realtime

**Infrastructure:**
- Netlify (Hosting & Serverless Functions)
- Supabase Cloud (Database & Auth)
- GitHub Actions (CI/CD)

---

## Directory Structure

### Complete Structure

```
/Users/lukatenbosch/focofixfork/
│
├── src/
│   │
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API Routes (59 consolidated routes)
│   │   │   ├── auth/                 # Authentication (5 routes)
│   │   │   ├── organizations/        # Organizations (11 routes)
│   │   │   ├── projects/             # Projects (6 routes)
│   │   │   ├── tasks/                # Tasks (2 routes)
│   │   │   ├── goals/                # Goals (4 routes)
│   │   │   ├── milestones/           # Milestones (2 routes)
│   │   │   ├── analytics/            # Analytics (4 routes, query-based)
│   │   │   ├── ai/                   # AI operations (5 routes, action-based)
│   │   │   ├── notifications/        # Notifications (2 routes, action-based)
│   │   │   ├── voice-planning/       # Voice planning (6 routes)
│   │   │   ├── user/                 # User/Settings (4 routes)
│   │   │   ├── export/               # Data export (1 route)
│   │   │   ├── health/               # Health check (1 route, detailed query)
│   │   │   ├── activities/           # Activity feed (1 route)
│   │   │   ├── comments/             # Comments (2 routes)
│   │   │   └── invitations/          # Invitations (3 routes)
│   │   │
│   │   ├── dashboard/                # Dashboard pages
│   │   ├── projects/                 # Project pages
│   │   ├── organizations/            # Organization pages
│   │   ├── calendar/                 # Calendar view
│   │   └── layout.tsx                # Root layout
│   │
│   ├── components/                   # Shared components (56 directories)
│   │   ├── ui/                       # Base UI components (Radix-based)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   │
│   │   ├── projects/                 # Project-specific components
│   │   ├── tasks/                    # Task components
│   │   ├── cards/                    # Card components
│   │   ├── dialogs/                  # Modal dialogs
│   │   ├── forms/                    # Form components
│   │   ├── layout/                   # Layout components
│   │   ├── navigation/               # Navigation components
│   │   └── ...
│   │
│   ├── features/                     # Feature modules (10 features)
│   │   │
│   │   ├── analytics/                # Analytics feature
│   │   │   ├── components/           # Analytics-specific components
│   │   │   │   └── analytics-dashboard.tsx
│   │   │   ├── hooks/                # Analytics hooks
│   │   │   │   └── useAnalytics.ts
│   │   │   ├── types/                # Analytics types
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── dashboard/                # Dashboard feature (moved from components)
│   │   │   └── components/
│   │   │       ├── layout.tsx
│   │   │       ├── header.tsx
│   │   │       ├── sidebar.tsx
│   │   │       └── widgets/
│   │   │
│   │   ├── goals/                    # Goals feature
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types/
│   │   │
│   │   ├── mermaid/                  # Mermaid diagram feature (moved from components)
│   │   │   └── components/
│   │   │       ├── MermaidEditor.tsx
│   │   │       ├── MermaidPreview.tsx
│   │   │       └── ShareDialog.tsx
│   │   │
│   │   ├── projects/                 # Project management feature
│   │   │   ├── components/
│   │   │   │   └── ProjectTable.tsx
│   │   │   └── hooks/
│   │   │
│   │   ├── settings/                 # Settings feature
│   │   │   └── components/
│   │   │
│   │   ├── tasks/                    # Task management feature
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   │
│   │   └── voice/                    # Voice planning feature (moved from components)
│   │       └── components/
│   │           ├── VoicePlanningWorkbench.tsx  # 43KB main component
│   │           ├── DependencyVisualization.tsx
│   │           ├── PlanReviewPanel.tsx
│   │           ├── PlanTimeline.tsx
│   │           ├── VirtualTaskList.tsx
│   │           ├── VoiceCaptureButton.tsx
│   │           └── ...
│   │
│   ├── lib/                          # Core libraries and utilities
│   │   │
│   │   ├── services/                 # Service layer (3 canonical services)
│   │   │   ├── analytics.service.ts  # Analytics (696 lines) ← CANONICAL
│   │   │   ├── goals.service.ts      # Goals (416 lines) ← CANONICAL
│   │   │   └── export.service.ts     # Export (483 lines) ← CANONICAL
│   │   │
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── use-auth.ts
│   │   │   ├── useSearch.ts
│   │   │   └── ...
│   │   │
│   │   ├── middleware/               # Authorization middleware
│   │   │   └── auth.ts
│   │   │
│   │   ├── validation/               # Zod validation schemas
│   │   │   └── schemas/
│   │   │       ├── analytics/
│   │   │       ├── goals/
│   │   │       └── ...
│   │   │
│   │   ├── supabase/                 # Supabase configuration
│   │   │   ├── supabase-client.ts
│   │   │   ├── supabase-server.ts
│   │   │   └── types.ts              # Generated types (consolidated)
│   │   │
│   │   └── utils/                    # Utility functions
│   │
│   └── __tests__/                    # Test files (cleaned)
│       ├── unit/
│       ├── integration/
│       └── e2e/
│
├── database/                         # Database scripts and migrations
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 009_create_goals_tables.sql
│   │   ├── 015_add_voice_planning_tables.sql
│   │   └── 999_consolidate_database_schema.sql  # Consolidation migration
│   │
│   ├── CONSOLIDATION_PLAN.md
│   └── DATABASE_STATUS.md
│
├── public/                           # Static assets
│
├── scripts/                          # Utility scripts
│   ├── testing/
│   ├── database/
│   └── verification/
│
├── .github/                          # GitHub Actions workflows
│   └── workflows/
│
├── FINAL_CONSOLIDATION_REPORT.md     # Complete consolidation report
├── DEPLOYMENT_CHECKLIST.md           # Deployment procedures
├── ARCHITECTURE_GUIDE.md             # This file
├── CONSOLIDATION_SUMMARY.md          # Phase-by-phase summary
├── API_CONSOLIDATION_ROADMAP.md      # API changes details
└── README.md                         # Main documentation
```

### Key Directories Explained

**`/src/app/api/`** - API Routes (59 total)
- RESTful endpoints following Next.js App Router conventions
- Consolidated from 82 routes (28% reduction)
- Consistent naming patterns across all routes

**`/src/components/`** - Shared Components (56 directories)
- Reusable UI components used across features
- Base UI components (Radix UI wrappers)
- Shared business logic components

**`/src/features/`** - Feature Modules (10 features)
- Feature-specific components, hooks, and types
- Collocated code for better maintainability
- Clear feature boundaries

**`/src/lib/services/`** - Service Layer (3 canonical services)
- Single source of truth for business logic
- Static methods for stateless operations
- Consolidated from 8 files (63% reduction)

---

## Database Architecture

### Schema Overview (22 Core Tables)

```
┌─────────────────────────────────────────────────────────────┐
│                      Core Entities (7 tables)                │
├─────────────────────────────────────────────────────────────┤
│  projects              - Project management                  │
│  tasks                 - Task tracking                       │
│  milestones            - Milestone tracking                  │
│  goals                 - Strategic planning                  │
│  goal_milestones       - Goal-milestone relationships        │
│  goal_project_links    - Goal-project relationships          │
│  comments              - Collaboration comments              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│           Organization & User Management (6 tables)          │
├─────────────────────────────────────────────────────────────┤
│  organizations         - Multi-tenant orgs                   │
│  organization_members  - Org membership + roles              │
│  organization_invites  - Org invitations                     │
│  user_profiles         - User profile data                   │
│  profiles              - Auth profiles                       │
│  users                 - Core user auth                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│             Project Collaboration (3 tables)                 │
├─────────────────────────────────────────────────────────────┤
│  project_members           - Project team membership         │
│  project_team_assignments  - Team assignments                │
│  activities                - Activity feed                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Voice Planning (4 tables)                     │
├─────────────────────────────────────────────────────────────┤
│  voice_sessions           - Voice capture sessions           │
│  voice_audio_chunks       - Audio storage                    │
│  voice_plan_dependencies  - Task dependencies                │
│  voice_plan_audit         - Audit trail                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure (3 tables)                   │
├─────────────────────────────────────────────────────────────┤
│  schema_migrations  - Migration tracking                     │
│  migration_audit    - Migration audit                        │
│  down_migrations    - Rollback support                       │
└─────────────────────────────────────────────────────────────┘
```

### Database Consolidation

**Before:** 69 tables
**After:** 22 tables
**Reduction:** 47 tables (-68%)

**Deleted Categories:**
- Gamification (8 tables)
- Legacy Crico System (10 tables)
- Subscription/Billing (7 tables)
- Over-engineered Milestone Features (8 tables)
- Redundant/Duplicate Tables (14 tables)

**Benefits:**
- Faster query planning
- Reduced storage footprint
- Simpler RLS policy management
- Cleaner type generation
- Better performance

### Entity Relationships

```
┌─────────────┐
│organizations│
└──────┬──────┘
       │ 1:N
       ├──────────────────────────────┐
       │                              │
       v                              v
┌─────────────────┐         ┌────────────────┐
│organization     │         │   projects     │
│   _members      │         │                │
└─────────────────┘         └───────┬────────┘
                                    │ 1:N
                            ┌───────┼────────┬─────────┐
                            │       │        │         │
                            v       v        v         v
                      ┌─────┐  ┌──────┐  ┌──────┐  ┌────────┐
                      │tasks│  │goals │  │      │  │project │
                      │     │  │      │  │milestones│_members│
                      └─────┘  └──────┘  └──────┘  └────────┘
                                   │
                                   │ N:M
                                   v
                            ┌──────────────┐
                            │goal_project  │
                            │    _links    │
                            └──────────────┘
```

---

## API Architecture

### Route Organization (59 Total Routes)

#### Authentication Routes (5 routes) - Standard

```
POST   /api/auth/login          - User login
POST   /api/auth/register       - User registration
POST   /api/auth/logout         - User logout
POST   /api/auth/refresh        - Refresh token
GET    /api/auth/session        - Session info
```

#### Organization Routes (11 routes) - Consolidated from 16

```
# Primary pattern (use this)
GET/POST     /api/organizations                              - List/create orgs
GET/PUT/DEL  /api/organizations/[id]                         - Org CRUD
GET/PUT      /api/organizations/[id]/settings                - Org settings
GET/POST     /api/organizations/[id]/members                 - Members
GET/PUT/DEL  /api/organizations/[id]/members/[memberId]      - Member CRUD
GET/POST     /api/organizations/[id]/invitations             - Invitations
GET/DEL      /api/organizations/[id]/invitations/[inviteId]  - Invitation CRUD
POST         /api/organizations/[id]/invitations/[inviteId]/resend - Resend

# Public invitation endpoints (no org ID required)
GET          /api/invitations/[token]/validate               - Validate token
POST         /api/invitations/[token]/accept                 - Accept invitation
```

**Deprecated (still functional with warnings):**
- `/api/organization/*` routes redirect to `/api/organizations/[id]/*`

#### Project Routes (6 routes) - Consolidated from 7

```
GET/POST     /api/projects                   - List/create projects
GET/PUT/DEL  /api/projects/[id]              - Project CRUD (includes settings)
GET/POST     /api/projects/[id]/team         - Team members
GET/PUT/DEL  /api/projects/[id]/team/[userId] - Team member CRUD
POST         /api/projects/bulk              - Bulk operations
GET          /api/goals/[id]/projects        - Projects linked to goal
```

#### Core Resource Routes - Optimal

**Tasks (2 routes):**
```
GET/POST     /api/tasks                      - List/create tasks
GET/PUT/DEL  /api/tasks/[id]                 - Task CRUD
```

**Goals (4 routes):**
```
GET/POST     /api/goals                      - List/create goals
GET/PUT/DEL  /api/goals/[id]                 - Goal CRUD
GET          /api/goals/[id]/milestones      - Goal milestones
GET          /api/goals/[id]/projects        - Goal projects
```

**Milestones (2 routes):**
```
GET/POST     /api/milestones                 - List/create milestones
GET/PUT/DEL  /api/milestones/[id]            - Milestone CRUD
```

**Comments (2 routes):**
```
GET/POST     /api/comments                   - List/create comments
GET/PUT/DEL  /api/comments/[id]              - Comment CRUD
```

#### Analytics Routes (4 routes) - Query-Based, Consolidated from 7

```
GET  /api/analytics?type=dashboard           - Dashboard analytics
GET  /api/analytics?type=projects            - Project analytics
GET  /api/analytics?type=team                - Team analytics
GET  /api/analytics?type=trends              - Trends analysis
```

**Query Parameters:**
- `type`: dashboard | projects | team | trends
- `organizationId`: filter by org
- `startDate`, `endDate`: date range
- `projectId`: filter by project

**Deprecated:**
- `/api/analytics/dashboard` → use `?type=dashboard`
- `/api/analytics/projects` → use `?type=projects`
- `/api/analytics/team` → use `?type=team`

#### AI Routes (5 routes) - Action-Based, Consolidated from 11

```
POST  /api/ai?action=suggest                 - Generate suggestions
POST  /api/ai?action=create                  - Create from AI
POST  /api/ai?action=refine                  - Refine existing
POST  /api/ai?action=analyze                 - Analyze content
POST  /api/ai?action=extract                 - Extract intent
```

**Action Types:**
- `suggest`: Generate AI suggestions
- `create`: Create items from AI
- `refine`: Refine existing content
- `analyze`: Analyze patterns
- `extract`: Extract structured data

#### Notification Routes (2 routes) - Action-Based, Consolidated from 4

```
GET/POST  /api/notifications?action=send     - Send notification
POST      /api/notifications?action=subscribe   - Subscribe to notifications
POST      /api/notifications?action=unsubscribe - Unsubscribe
```

#### User/Settings Routes (4 routes) - Consolidated from 8

```
GET/PUT   /api/user                          - User profile (includes settings)
GET/PUT   /api/user/preferences              - User preferences
POST      /api/user/avatar                   - Upload avatar
DEL       /api/user/account                  - Delete account
```

**Deprecated:**
- `/api/settings/*` routes merged into `/api/user/*`

#### Other Routes

**Voice Planning (6 routes):**
```
POST      /api/voice-planning/capture        - Capture voice
POST      /api/voice-planning/process        - Process audio
GET       /api/voice-planning/sessions       - List sessions
GET       /api/voice-planning/sessions/[id]  - Get session
POST      /api/voice-planning/execute        - Execute plan
GET       /api/voice-planning/dependencies   - Get dependencies
```

**Activities (1 route):**
```
GET       /api/activities                    - Activity feed
```

**Export (1 route):**
```
POST      /api/export                        - Export data (CSV/JSON/PDF)
```

**Health (1 route) - Consolidated from 2:**
```
GET       /api/health?detailed=true          - Health check + monitoring
```

**Deprecated:**
- `/api/monitoring` → use `/api/health?detailed=true`

### API Design Patterns

**1. RESTful Resource Pattern**
```
GET    /api/resource         - List resources
POST   /api/resource         - Create resource
GET    /api/resource/[id]    - Get single resource
PUT    /api/resource/[id]    - Update resource
DELETE /api/resource/[id]    - Delete resource
```

**2. Query-Based Pattern (Analytics)**
```
GET /api/analytics?type=dashboard&organizationId=xxx&startDate=xxx&endDate=xxx
```

**3. Action-Based Pattern (AI, Notifications)**
```
POST /api/ai?action=suggest&context=xxx
POST /api/notifications?action=send
```

**4. Nested Resource Pattern**
```
GET /api/organizations/[id]/members
GET /api/projects/[id]/team
GET /api/goals/[id]/milestones
```

---

## Service Layer

### Canonical Services (3 Total)

#### 1. Analytics Service (`analytics.service.ts`)

**Purpose:** Calculate and aggregate analytics data

**Main Methods:**
```typescript
class AnalyticsService {
  // Dashboard analytics
  static async getDashboardAnalytics(
    userId: string,
    timePeriod: TimePeriod,
    organizationId?: string
  ): Promise<DashboardAnalytics>

  // Project metrics
  static async getProjectMetrics(
    projectIds: string[],
    dateRange: DateRange
  ): Promise<ProjectMetrics[]>

  // Team metrics
  static async getTeamMetrics(
    projectIds: string[],
    dateRange: DateRange
  ): Promise<TeamMetrics[]>

  // Time series data
  static async getTimeSeriesData(
    projectIds: string[],
    dateRange: DateRange
  ): Promise<TimeSeriesDataPoint[]>

  // Export functionality
  static async exportAnalytics(
    analytics: DashboardAnalytics,
    format: 'csv' | 'json' | 'pdf'
  ): Promise<string>
}
```

**Usage:**
```typescript
import { analyticsService } from '@/lib/services/analytics.service'

const analytics = await analyticsService.getDashboardAnalytics(
  userId,
  '30d',
  organizationId
)
```

#### 2. Goals Service (`goals.service.ts`)

**Purpose:** Manage goal-related operations

**Main Methods:**
```typescript
class GoalsService {
  // Goal CRUD
  static async createGoal(goal: CreateGoal): Promise<Goal>
  static async getGoal(id: string, userId: string): Promise<Goal | null>
  static async updateGoal(id: string, updates: UpdateGoal, userId: string): Promise<Goal>
  static async deleteGoal(id: string, userId: string): Promise<void>
  static async listGoals(organizationId: string, userId: string): Promise<Goal[]>

  // Milestone management
  static async addMilestone(goalId: string, milestone: CreateMilestone): Promise<GoalMilestone>
  static async updateMilestone(id: string, updates: UpdateMilestone): Promise<GoalMilestone>
  static async removeMilestone(id: string): Promise<void>

  // Project linking
  static async linkProject(goalId: string, projectId: string, userId: string): Promise<GoalProjectLink>
  static async unlinkProject(linkId: string): Promise<void>
  static async getLinkedProjects(goalId: string): Promise<GoalProjectLink[]>

  // Progress tracking
  static async getGoalProgress(goalId: string): Promise<GoalProgress>
  static async getGoalWithDetails(goalId: string, userId: string): Promise<GoalWithDetails>
}
```

**Usage:**
```typescript
import { goalsService, type Goal } from '@/lib/services/goals.service'

const goal = await goalsService.createGoal({
  title: 'Q1 Goals',
  organizationId: 'xxx',
  ownerId: userId
})
```

#### 3. Export Service (`export.service.ts`)

**Purpose:** Export data in various formats

**Main Methods:**
```typescript
class ExportService {
  // Main export method
  static async exportData(
    options: ExportOptions
  ): Promise<ExportResult>

  // Format-specific exports
  static async exportToCSV(data: any[]): Promise<string>
  static async exportToJSON(data: any): Promise<string>
  static async exportToPDF(data: any): Promise<Blob>

  // Domain exports
  static async exportProjects(organizationId: string): Promise<string>
  static async exportTasks(projectId: string): Promise<string>
  static async exportMilestones(projectId: string): Promise<string>
  static async exportProjectReport(projectId: string): Promise<Blob>

  // Download helper
  static downloadFile(content: string | Blob, filename: string): void
}
```

**Usage:**
```typescript
import { exportService } from '@/lib/services/export.service'

const csv = await exportService.exportProjects(organizationId)
exportService.downloadFile(csv, 'projects.csv')
```

### Service Design Principles

**1. Static Methods**
- All services use static methods (stateless operations)
- Exported as classes, not instances
- No constructor or internal state

**2. Single Source of Truth**
- One canonical service per domain
- All business logic centralized
- No duplicate implementations

**3. Type Safety**
- Full TypeScript type definitions
- Zod schema validation
- Generated database types

**4. Error Handling**
- Consistent error patterns
- Meaningful error messages
- Proper error propagation

**5. Testing**
- Easily mockable
- Pure functions where possible
- Clear interfaces

---

## Component Architecture

### Organization Principles

**Shared Components** (`/src/components/`)
- Reusable across multiple features
- Generic, configurable components
- Base UI components (Radix UI wrappers)

**Feature Components** (`/src/features/*/components/`)
- Feature-specific implementations
- Domain-specific logic
- Collocated with feature code

### Component Patterns

**1. UI Components** (`/src/components/ui/`)
- Radix UI wrappers with custom styling
- Consistent design system
- Accessible by default

Example:
```typescript
// /src/components/ui/button.tsx
import { Button as RadixButton } from '@radix-ui/react-button'

export function Button({ children, variant = 'default', ...props }) {
  return (
    <RadixButton
      className={cn('button', `button--${variant}`)}
      {...props}
    >
      {children}
    </RadixButton>
  )
}
```

**2. Feature Components** (`/src/features/*/components/`)
- Feature-specific UI and logic
- Use shared UI components
- Isolated from other features

Example:
```typescript
// /src/features/analytics/components/analytics-dashboard.tsx
import { Card } from '@/components/ui/card'
import { useAnalytics } from '../hooks/useAnalytics'

export function AnalyticsDashboard({ organizationId }) {
  const { analytics, loading } = useAnalytics({ organizationId })

  return (
    <Card>
      {/* Analytics dashboard content */}
    </Card>
  )
}
```

**3. Container/Presenter Pattern**
- Container components manage state and logic
- Presenter components handle UI rendering
- Clear separation of concerns

### Moved Components (Phase 4)

**Voice Components** (11 files moved)
- From: `/src/components/voice/`
- To: `/src/features/voice/components/`
- Reason: Feature-specific, tightly coupled

**Mermaid Components** (3 files moved)
- From: `/src/components/mermaid/`
- To: `/src/features/mermaid/components/`
- Reason: Feature-specific functionality

**Dashboard Components** (5 files moved)
- From: `/src/components/dashboard/`
- To: `/src/features/dashboard/components/`
- Reason: Dashboard-specific layout logic

---

## Data Flow

### Typical Request Flow

```
┌────────────┐
│   User     │
│  Action    │
└─────┬──────┘
      │
      v
┌─────────────────┐
│   Component     │  1. User interaction
│  (React)        │
└─────┬───────────┘
      │
      v
┌─────────────────┐
│   Hook          │  2. Custom hook (optional)
│  (useXxx)       │
└─────┬───────────┘
      │
      v
┌─────────────────┐
│   Service       │  3. Business logic
│  (.service.ts)  │
└─────┬───────────┘
      │
      v
┌─────────────────┐
│   API Route     │  4. API endpoint
│  (/api/xxx)     │
└─────┬───────────┘
      │
      v
┌─────────────────┐
│   Supabase      │  5. Database query
│  (PostgreSQL)   │
└─────┬───────────┘
      │
      v
┌─────────────────┐
│   Response      │  6. Data returned
│   (JSON)        │
└─────────────────┘
```

### Example: Fetch Analytics Data

```typescript
// 1. Component initiates request
function AnalyticsDashboard() {
  const { analytics, loading, error } = useAnalytics({
    organizationId: 'xxx'
  })

  // Render analytics...
}

// 2. Hook manages state and calls service
function useAnalytics(filters) {
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      const data = await analyticsService.getDashboardAnalytics(
        userId,
        '30d',
        filters.organizationId
      )
      setAnalytics(data)
    }
    fetchData()
  }, [filters])

  return { analytics, loading, error }
}

// 3. Service contains business logic
class AnalyticsService {
  static async getDashboardAnalytics(userId, timePeriod, orgId) {
    // Calculate date range
    const dateRange = this.calculateDateRange(timePeriod)

    // Get accessible projects
    const projectIds = await this.getAccessibleProjectIds(userId, orgId)

    // Fetch metrics
    const [projectMetrics, teamMetrics, timeSeriesData] = await Promise.all([
      this.getProjectMetrics(projectIds, dateRange),
      this.getTeamMetrics(projectIds, dateRange),
      this.getTimeSeriesData(projectIds, dateRange)
    ])

    // Calculate summary
    const summary = this.calculateAnalyticsSummary(projectMetrics, teamMetrics)

    return { projectMetrics, teamMetrics, timeSeriesData, summary }
  }

  // Internal methods query database via Supabase client
  private static async getProjectMetrics(projectIds, dateRange) {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds)

    return this.calculateProjectMetrics(data, dateRange)
  }
}
```

---

## Authentication & Authorization

### Authentication Flow (Supabase Auth)

```
┌────────────┐
│   User     │
│  Login     │
└─────┬──────┘
      │
      v
┌─────────────────┐
│ Supabase Auth   │  1. Email/password or OAuth
│                 │
└─────┬───────────┘
      │
      v
┌─────────────────┐
│  Session        │  2. JWT token generated
│  Created        │
└─────┬───────────┘
      │
      v
┌─────────────────┐
│  Middleware     │  3. Validates session on each request
│  Verification   │
└─────┬───────────┘
      │
      v
┌─────────────────┐
│  Authorized     │  4. User can access protected routes
│  Access         │
└─────────────────┘
```

### Authorization Patterns

**Organization-Level:**
- Owner: Full control
- Admin: Management access
- Member: Standard access
- Guest: Limited read access

**Project-Level:**
- Project members can view/edit
- Non-members cannot access
- Organization admins can override

**Middleware Protection:**
```typescript
// All routes protected by middleware
export async function middleware(request: NextRequest) {
  const session = await getSession(request)

  if (!session) {
    return redirect('/login')
  }

  // Verify organization access
  const hasAccess = await checkOrganizationAccess(
    session.user.id,
    request.params.organizationId
  )

  if (!hasAccess) {
    return new Response('Forbidden', { status: 403 })
  }

  return NextResponse.next()
}
```

---

## Feature Modules

### Feature Structure

Each feature follows this pattern:

```
/src/features/[feature-name]/
├── components/        # Feature-specific components
├── hooks/            # Feature-specific hooks
├── types/            # Feature-specific types
├── utils/            # Feature-specific utilities
└── index.ts          # Public API exports
```

### Feature List

1. **analytics** - Analytics dashboard and reporting
2. **dashboard** - Main dashboard layout
3. **goals** - Goal management
4. **mermaid** - Diagram creation
5. **projects** - Project management
6. **settings** - User/org settings
7. **tasks** - Task management
8. **voice** - Voice planning workbench

---

## Deployment Architecture

### Netlify Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                         Netlify Edge                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     CDN      │  │  Serverless  │  │  Functions   │      │
│  │  (Static)    │  │   (SSR)      │  │  (API)       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────┬───────────────────────────┘
                                  │
┌─────────────────────────────────┴───────────────────────────┐
│                      Supabase Cloud                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │  Auth        │  │  Realtime    │      │
│  │  (Database)  │  │  (Sessions)  │  │  (WebSocket) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

### Environment Configuration

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Application
NEXT_PUBLIC_APP_URL=https://app.example.com

# Testing
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=xxx
E2E_BASE_URL=http://localhost:3004
```

---

## Performance Considerations

### Optimizations

**1. Database**
- 68% fewer tables to query
- Simpler query planning
- Reduced storage footprint

**2. Code Splitting**
- Feature-based code organization
- Lazy loading of feature modules
- Smaller initial bundle

**3. Caching**
- Edge caching via Netlify CDN
- Client-side caching with React Query
- Database query caching

**4. Build Optimization**
- Tree shaking of unused code
- Minification and compression
- Image optimization

---

## Maintenance & Best Practices

### Code Organization Rules

1. **One service per domain** - No duplicates
2. **Feature-based components** - Collocate related code
3. **Shared components** - Only truly reusable components
4. **Clear import paths** - Use absolute imports with @/ prefix
5. **Type safety** - Full TypeScript coverage

### Development Workflow

1. **Plan before coding** - Design data flow first
2. **Test as you go** - Write tests alongside code
3. **Document decisions** - Update architecture docs
4. **Review database** - Quarterly check for unused tables
5. **Refactor regularly** - Delete old code immediately

### When to Create New Tables

Only create new database tables when:
- ✅ Feature is fully designed and approved
- ✅ UI mockups exist
- ✅ API routes are planned
- ✅ No existing table can be extended
- ✅ Relationships are clear

Avoid:
- ❌ Speculative tables for future features
- ❌ Over-engineered metadata tables
- ❌ Duplicate tables for same purpose
- ❌ Tables without corresponding API routes

---

## Troubleshooting

### Common Issues

**Build Errors:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

**Type Errors:**
```bash
# Regenerate Supabase types
npx supabase gen types typescript > src/lib/supabase/types.ts

# Run type check
npm run type-check
```

**Import Errors:**
- Check import paths use @/ prefix
- Verify file exports are correct
- Ensure circular dependencies don't exist

---

## Additional Resources

- [FINAL_CONSOLIDATION_REPORT.md](./FINAL_CONSOLIDATION_REPORT.md) - Complete project details
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Deployment procedures
- [API_CONSOLIDATION_ROADMAP.md](./API_CONSOLIDATION_ROADMAP.md) - API changes
- [database/CONSOLIDATION_PLAN.md](./database/CONSOLIDATION_PLAN.md) - Database details
- [README.md](./README.md) - Getting started guide

---

**Architecture Version:** 1.0 Post-Consolidation
**Last Updated:** 2026-01-08
**Status:** Production Architecture

