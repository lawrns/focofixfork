# CRICO-Projects Capabilities Mapping

## Document Overview

This document maps CRICO (Cognitive Operating System) capabilities to the Projects feature, identifying integration points, AI features, and monitoring strategies for intelligent project management.

**Version:** 1.0  
**Status:** Design Document  
**Last Updated:** 2026-03-02

---

## Table of Contents

1. [CRICO Capabilities Inventory](#1-crico-capabilities-inventory)
2. [Projects Feature Context](#2-projects-feature-context)
3. [Capability-to-Feature Mapping](#3-capability-to-feature-mapping)
4. [AI Features for Projects](#4-ai-features-for-projects)
5. [Agent Monitoring Strategy](#5-agent-monitoring-strategy)
6. [CRICO Suggestions for Projects](#6-crico-suggestions-for-projects)
7. [Alignment Engine Integration](#7-alignment-engine-integration)
8. [Event-Driven Analysis](#8-event-driven-analysis)
9. [Implementation Roadmap](#9-implementation-roadmap)

---

## 1. CRICO Capabilities Inventory

### 1.1 AgentOrchestra - Multi-Agent System

The AgentOrchestra coordinates specialized AI agents for different analysis tasks:

| Agent | Purpose | Triggers | Trust Level |
|-------|---------|----------|-------------|
| **Planner Agent** | Breaks complex tasks into verifiable steps | New feature request, refactor request, ambiguous command | High |
| **Code Auditor Agent** | Continuous code quality and pattern enforcement | On save, on commit, on PR | High |
| **Test Architect Agent** | Ensures test coverage matches risk | After code changes, before merges | Medium |
| **Schema Integrity Agent** | Maintains database-code alignment | Schema changes, type errors, deploy prep | High |
| **UX Coherence Agent** | Detects UI-backend misalignment | Frontend changes, API changes | Medium |
| **Risk & Regression Agent** | Predicts potential failures | Every commit, pre-deploy | Medium |
| **Documentation Agent** | Maintains institutional knowledge | Code changes, periodic sweeps | Low/High |
| **Memory Agent** | Long-term context and learning | Session end, project milestone | N/A |

### 1.2 AlignmentEngine - Drift Detection

Detects misalignment across four axes:

```
┌─────────────────────────────────────────────────────────────┐
│                  CRICO ALIGNMENT AXES                       │
├─────────────────────────────────────────────────────────────┤
│  AXIS 1: UI ↔ API ↔ DB                                     │
│  AXIS 2: SPEC ↔ IMPLEMENTATION                              │
│  AXIS 3: TEST ↔ BEHAVIOR                                    │
│  AXIS 4: DOCS ↔ REALITY                                     │
└─────────────────────────────────────────────────────────────┘
```

**Detection Capabilities:**
- Schema drift (DB columns vs TypeScript types)
- Contract mismatches (API response vs frontend expectations)
- Orphaned logic (unreachable code)
- UI illusions vs backend truth

### 1.3 SuggestionEngine - Improvement Hunter

Continuously hunts for improvements across categories:

| Category | Detection Signal | Confidence |
|----------|------------------|------------|
| Architectural Simplification | Complex abstraction with single implementation | High |
| Test Gap | Critical path without coverage | High |
| Performance Risk | N+1 queries, unbounded loops | Medium-High |
| UX Inconsistency | Similar components, different behaviors | Medium |
| Over-Engineering | Unused flexibility, config options | Medium |
| Under-Engineering | Copy-paste code, missing abstractions | High |
| Dead Code | Unreachable code, unused exports | High |
| Naming Drift | Same concept, different names | High |
| Concept Duplication | Same logic, multiple implementations | Medium |

### 1.4 TrustCalibration - User Trust Scoring

Per-user confidence thresholds and learning:

```typescript
interface UserTrust {
  trustLevel: 'new' | 'learning' | 'calibrated';
  minConfidenceAuto: number;     // Default: 0.90
  minConfidenceSuggest: number;  // Default: 0.70
  minConfidenceShow: number;     // Default: 0.40
  categoryAdjustments: Record<Category, number>;
  acceptanceRate: number;
  autoApplyEnabled: boolean;
}
```

### 1.5 Pipeline System - Plan/Execute/Review Workflow

The action execution pipeline with authority gates:

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  PLAN   │───▶│ VALIDATE│───▶│ EXECUTE │───▶│ REVIEW  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
Intent Parse   Authority Gates  Step-by-Step   Audit Trail
Breakdown      Risk Assessment  Execution      Feedback Loop
```

### 1.6 Event System - OpenClaw Events

Real-time event ingestion and routing:

| Event Type | Description | Handler |
|------------|-------------|---------|
| `project.created` | New project created | Trigger analysis |
| `project.updated` | Project metadata changed | Check alignment |
| `milestone.completed` | Milestone reached | Progress analysis |
| `task.status_changed` | Task moved | Health check |
| `ai.suggestion_generated` | CRICO created suggestion | Route to user |

### 1.7 Task Action Service - AI Suggestions

AI-powered task suggestions with confidence scoring:
- Priority recommendations
- Assignment suggestions
- Deadline optimization
- Dependency identification

---

## 2. Projects Feature Context

### 2.1 Current Projects Data Model

```typescript
interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  due_date?: string;
  progress_percentage: number;
  owner_id: string;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  // Enriched fields
  total_tasks?: number;
  tasks_completed?: number;
  delegation_counts?: Record<string, number>;
  active_run_count?: number;
}
```

### 2.2 Projects-Related Entities

- **work_items**: Tasks belonging to projects
- **milestones**: Project milestones
- **foco_project_members**: Project team assignments
- **runs**: Active automation runs per project
- **workspaces**: Project containers

### 2.3 Current API Endpoints

- `GET/POST /api/projects` - List/create projects
- `GET/PUT/DELETE /api/projects/[id]` - Project CRUD
- `POST /api/projects/[id]/pin` - Pin/unpin project
- `GET/POST /api/projects/[id]/team` - Team management
- `POST /api/projects/bulk` - Bulk operations
- `POST /api/projects/check-slug` - Slug validation
- `POST /api/projects/from-template/[templateId]` - Template creation

---

## 3. Capability-to-Feature Mapping

### 3.1 AgentOrchestra → Projects Integration

| Agent | Projects Integration | Value Delivered |
|-------|---------------------|-----------------|
| **Planner Agent** | Break down project creation into phases, milestones, and tasks | Structured project initialization |
| **Code Auditor Agent** | Validate project API implementations, check for anti-patterns | Code quality assurance |
| **Test Architect Agent** | Identify untested project flows, suggest test coverage | Quality assurance |
| **Schema Integrity Agent** | Verify project table schema alignment with types | Data integrity |
| **UX Coherence Agent** | Check project UI forms match API contracts | UI/UX consistency |
| **Risk & Regression Agent** | Predict project risks based on complexity, deadlines | Risk management |
| **Documentation Agent** | Keep project docs in sync with implementation | Knowledge management |

### 3.2 AlignmentEngine → Projects Integration

| Alignment Axis | Projects Application | Check Trigger |
|----------------|---------------------|---------------|
| **UI ↔ API ↔ DB** | Project forms ↔ Project API ↔ `foco_projects` table | On project schema change |
| **SPEC ↔ IMPLEMENTATION** | Project requirements ↔ Actual features built | On milestone completion |
| **TEST ↔ BEHAVIOR** | Project test coverage ↔ Actual project usage | Daily/Weekly scan |
| **DOCS ↔ REALITY** | Project documentation ↔ Current project state | On project update |

### 3.3 SuggestionEngine → Projects Integration

| Suggestion Category | Projects Application | Detection Method |
|--------------------|---------------------|------------------|
| **Test Gap** | Projects with many tasks but few tests | Task-to-test ratio analysis |
| **Performance Risk** | Projects with unoptimized queries | Query pattern analysis |
| **UX Inconsistency** | Inconsistent project status UI | Component analysis |
| **Over-Engineering** | Overly complex project templates | Template usage analysis |
| **Dead Code** | Unused project-related API endpoints | Import graph analysis |

---

## 4. AI Features for Projects

### 4.1 Smart Project Initialization

**Feature:** AI-Powered Project Templates  
**Capability:** Planner Agent + SuggestionEngine  
**Description:**
```
User: "Create a marketing campaign project"
CRICO: Analyzes past similar projects...
       → Suggests: Campaign Phases, Content Calendar, Review Milestones
       → Auto-creates: 5 phases, 12 tasks, 3 milestones
       → Assigns: Based on team skills and availability
```

### 4.2 Intelligent Progress Tracking

**Feature:** Predictive Progress Analysis  
**Capability:** Risk & Regression Agent + AlignmentEngine  
**Description:**
- Compares actual vs. planned velocity
- Predicts completion dates based on historical data
- Identifies at-risk projects before delays occur

### 4.3 Smart Task Suggestions

**Feature:** Context-Aware Task Recommendations  
**Capability:** SuggestionEngine + TrustCalibration  
**Description:**
```typescript
// Example suggestions
{
  category: 'task_optimization',
  title: 'Consider breaking down large task',
  description: 'Task "Implement Auth" has 40hrs estimate. Consider splitting into smaller tasks.',
  confidence: 0.85,
  projectId: 'proj_123'
}
```

### 4.4 Project Health Dashboard

**Feature:** Real-Time Project Health Score  
**Capability:** All agents + AlignmentEngine  
**Metrics:**
```typescript
interface ProjectHealthScore {
  overall: number;           // 0-100
  alignment: number;         // UI/API/DB alignment
  testCoverage: number;      // Test reality score
  documentation: number;     // Doc freshness
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestions: Suggestion[];
  lastChecked: Date;
}
```

### 4.5 Automated Project Insights

**Feature:** Weekly Project Digest  
**Capability:** Documentation Agent + SuggestionEngine  
**Content:**
- Projects completed this week
- At-risk projects requiring attention
- Suggestions for improving project workflows
- Team velocity trends

---

## 5. Agent Monitoring Strategy

### 5.1 Continuous Project Health Monitoring

```typescript
interface ProjectMonitoringConfig {
  projectId: string;
  checkInterval: number;     // e.g., 300000ms (5 min)
  metrics: {
    alignment: boolean;
    testCoverage: boolean;
    documentation: boolean;
    performance: boolean;
  };
  thresholds: {
    minAlignmentScore: number;    // 0.8
    minTestCoverage: number;      // 0.7
    maxRiskScore: number;         // 0.5
  };
}
```

### 5.2 Agent Monitoring Responsibilities

| Agent | Project Health Checks | Frequency |
|-------|----------------------|-----------|
| **Code Auditor** | Project API quality, anti-patterns | On project API change |
| **Schema Integrity** | Project table alignment | On schema migration |
| **Test Architect** | Project test coverage | Daily |
| **Risk & Regression** | Project risk assessment | On each project update |
| **Documentation** | Project doc freshness | Weekly |

### 5.3 Health Check Triggers

```typescript
// Automatic triggers for project analysis
type ProjectHealthTrigger =
  | 'project_created'        // New project
  | 'project_updated'        // Metadata change
  | 'milestone_completed'    // Progress milestone
  | 'task_bulk_completed'    // Multiple tasks done
  | 'schedule_daily'         // Daily health check
  | 'schedule_weekly'        // Weekly comprehensive check
  | 'user_requested'         // Manual trigger
  | 'deployment_pre'         // Before project deployment
  | 'integration_webhook';   // External trigger
```

---

## 6. CRICO Suggestions for Projects

### 6.1 Project-Specific Suggestion Categories

```typescript
type ProjectSuggestionCategory =
  // Existing CRICO categories
  | 'test_gap'
  | 'performance_risk'
  | 'ux_inconsistency'
  | 'dead_code'
  | 'doc_stale'
  // Project-specific categories
  | 'project_structure'
  | 'milestone_optimization'
  | 'task_decomposition'
  | 'resource_allocation'
  | 'timeline_risk'
  | 'dependency_management';
```

### 6.2 Suggestion Examples

#### Project Structure Suggestions
```typescript
{
  id: 'sugg_001',
  category: 'project_structure',
  priority: 'p2',
  title: 'Consider adding a planning phase',
  description: 'Project starts in 2 days but has no planning tasks. Consider adding requirements gathering.',
  projectId: 'proj_123',
  confidence: 0.82,
  impactScore: 0.7,
  effortScore: 0.3,
  tags: ['planning', 'structure']
}
```

#### Timeline Risk Suggestions
```typescript
{
  id: 'sugg_002',
  category: 'timeline_risk',
  priority: 'p1',
  title: 'Project at risk of missing deadline',
  description: 'Based on current velocity (3 tasks/week), project will complete 5 days after due date.',
  projectId: 'proj_456',
  confidence: 0.78,
  impactScore: 0.9,
  effortScore: 0.5,
  tags: ['timeline', 'risk', 'deadline']
}
```

#### Resource Allocation Suggestions
```typescript
{
  id: 'sugg_003',
  category: 'resource_allocation',
  priority: 'p2',
  title: 'Team member overloaded',
  description: 'User has 12 tasks assigned across 3 projects. Consider redistributing workload.',
  projectId: 'proj_789',
  confidence: 0.91,
  impactScore: 0.6,
  effortScore: 0.4,
  tags: ['resources', 'workload', 'team']
}
```

### 6.3 Suggestion Priority Matrix

| Urgency | Confidence | Presentation |
|---------|-----------|--------------|
| Critical (p0) | High | Modal notification |
| Critical (p0) | Medium | Banner + email |
| High (p1) | High | Project dashboard badge |
| High (p1) | Medium | Suggestions panel |
| Medium (p2) | Any | Inline indicator |
| Low (p3) | Any | Weekly digest only |

---

## 7. Alignment Engine Integration

### 7.1 Project Consistency Checks

| Check Type | Description | Severity |
|------------|-------------|----------|
| **Project Schema** | Project form fields match DB columns | Critical |
| **Project API** | API responses match frontend types | High |
| **Project Status** | Status values consistent across UI/API/DB | High |
| **Project Relations** | Related entities (tasks, milestones) exist | Medium |
| **Project Permissions** | Permission checks match UI visibility | Medium |

### 7.2 Alignment Check Implementation

```typescript
// Project-specific alignment check
async function checkProjectAlignment(projectId: string): Promise<AlignmentResult> {
  const checks = await Promise.all([
    // UI/API/DB alignment
    checkUIAPIDBAlignment('project', 'foco_projects', '/api/projects', [
      'name', 'description', 'status', 'priority', 
      'start_date', 'due_date', 'progress_percentage'
    ]),
    
    // Spec/Implementation alignment
    checkSpecImplementationAlignment(projectId),
    
    // Test/Behavior alignment
    checkProjectTestCoverage(projectId),
    
    // Docs/Reality alignment
    checkProjectDocFreshness(projectId)
  ]);
  
  return aggregateAlignmentResults(checks);
}
```

### 7.3 Drift Detection for Projects

```typescript
interface ProjectDriftWarning {
  type: 'schema_drift' | 'api_mismatch' | 'status_inconsistency';
  projectId: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  expected: unknown;
  actual: unknown;
  suggestion: string;
  autoFixable: boolean;
}
```

---

## 8. Event-Driven Analysis

### 8.1 Event Triggers for CRICO Analysis

| Event | CRICO Action | Agents Involved |
|-------|-------------|-----------------|
| `project.created` | Run initial health check, suggest template improvements | Planner, Risk |
| `project.updated` | Check alignment, verify consistency | Schema, UX |
| `project.deleted` | Archive learnings, update recommendations | Memory |
| `milestone.completed` | Analyze progress, predict completion | Risk, Planner |
| `task.status_changed` | Check project health, update risk scores | Risk |
| `task.completed` | Update velocity metrics, check milestone progress | Risk |
| `dependency.cycle_detected` | Alert on circular dependencies | Risk |
| `user.joined_organization` | Suggest relevant projects, update assignments | Planner |

### 8.2 Event Handler Implementation

```typescript
// Event router configuration for Projects
const projectEventRouter = new EventRouter();

projectEventRouter.on('project.created', async (event) => {
  const { project_id, user_id } = event.payload;
  
  // Submit task to AgentOrchestra
  const orchestra = new AgentOrchestra();
  await orchestra.submitTask({
    id: crypto.randomUUID(),
    type: 'analysis',
    description: `Analyze new project ${project_id}`,
    context: { projectId: project_id, userId: user_id },
    priority: 'medium',
    requiredAgents: ['planner', 'risk_regression']
  });
});

projectEventRouter.on('task.status_changed', async (event) => {
  const { task_id, project_id, new_status } = event.payload;
  
  // Trigger project health check on significant changes
  if (new_status === 'done' || new_status === 'blocked') {
    await triggerProjectHealthCheck(project_id);
  }
});
```

### 8.3 Real-Time Analysis Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Project Event  │────▶│  Event Router   │────▶│  AgentOrchestra │
│   Generated     │     │   (OpenClaw)    │     │   Task Queue    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Suggestion     │◀────│  Results        │◀────│  Agent Analysis │
│  Generated      │     │  Aggregated     │     │   (Parallel)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐
│  User Notified  │
│  (if warranted) │
└─────────────────┘
```

---

## 9. Implementation Roadmap

### 9.1 Phase 1: Foundation (Weeks 1-2)

- [ ] Extend CRICO types with project-specific categories
- [ ] Create project analysis database tables
- [ ] Implement basic project health check endpoint
- [ ] Set up event routing for project events

### 9.2 Phase 2: Agent Integration (Weeks 3-4)

- [ ] Integrate Planner Agent with project creation
- [ ] Enable Risk & Regression Agent for project monitoring
- [ ] Implement project-specific suggestion hunters
- [ ] Add project health dashboard widget

### 9.3 Phase 3: Alignment Engine (Weeks 5-6)

- [ ] Implement project schema alignment checks
- [ ] Add UI/API/DB drift detection for projects
- [ ] Create automated fix suggestions
- [ ] Build alignment visualization

### 9.4 Phase 4: Intelligence Layer (Weeks 7-8)

- [ ] Deploy predictive completion analysis
- [ ] Implement smart task decomposition
- [ ] Add resource allocation optimization
- [ ] Create project recommendation engine

### 9.5 Phase 5: Trust & Calibration (Weeks 9-10)

- [ ] Integrate TrustCalibration with project suggestions
- [ ] Implement user feedback loops
- [ ] Add per-user project preference learning
- [ ] Deploy confidence threshold tuning

---

## Appendix A: Database Schema Extensions

```sql
-- Project analysis results table
CREATE TABLE crico_project_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  alignment_score DECIMAL(5,4),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  findings JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent_invocation_id UUID REFERENCES crico_agent_invocations(id)
);

-- Project-event to CRICO action mapping
CREATE TABLE crico_project_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  payload JSONB,
  crico_action_id UUID REFERENCES crico_actions(id),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_crico_project_analysis_project ON crico_project_analysis(project_id);
CREATE INDEX idx_crico_project_analysis_type ON crico_project_analysis(analysis_type);
CREATE INDEX idx_crico_project_events_project ON crico_project_events(project_id);
CREATE INDEX idx_crico_project_events_type ON crico_project_events(event_type);
```

---

## Appendix B: API Extensions

```typescript
// New API routes for CRICO-Projects integration

// GET /api/projects/[id]/health
interface ProjectHealthResponse {
  health: ProjectHealthScore;
  suggestions: Suggestion[];
  lastAnalyzed: Date;
}

// POST /api/projects/[id]/analyze
interface AnalyzeProjectRequest {
  analysisTypes: ('alignment' | 'risk' | 'test_coverage' | 'docs')[];
  trigger: 'manual' | 'scheduled' | 'event';
}

// GET /api/projects/[id]/suggestions
interface ProjectSuggestionsResponse {
  suggestions: Suggestion[];
  stats: {
    total: number;
    pending: number;
    accepted: number;
    dismissed: number;
  };
}

// POST /api/projects/[id]/suggestions/[suggestionId]/action
interface SuggestionActionRequest {
  action: 'accept' | 'dismiss' | 'dismiss_type' | 'disagree';
  feedback?: string;
}
```

---

## Summary

This mapping document establishes a comprehensive integration strategy between CRICO capabilities and the Projects feature. Key integration points include:

1. **Multi-Agent Monitoring**: All CRICO agents contribute to project health monitoring
2. **Alignment Verification**: Four-axis alignment checking ensures project consistency
3. **Intelligent Suggestions**: AI-powered recommendations for project optimization
4. **Event-Driven Analysis**: Real-time response to project lifecycle events
5. **Trust-Based Delivery**: Personalized suggestion delivery based on user trust levels

The implementation follows CRICO's core philosophy: **continuous alignment verification** rather than reactive fixes, making project management proactive and intelligent.
