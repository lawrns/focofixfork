# CRICO-Projects Integration Feature Specification

## Executive Summary

This document specifies the integration of CRICO (Cognitive Review & Improvement Companion) intelligence into the Projects section of the Foco platform. CRICO will provide AI-powered project health monitoring, alignment checks, proactive suggestions, and predictive insights to help teams maintain project quality and consistency.

---

## 1. Project Health Agent

### 1.1 Overview
The Project Health Agent continuously monitors project metrics and provides health scores across multiple dimensions. It operates as a specialized CRICO agent within the AgentOrchestra.

### 1.2 Tracked Metrics

#### Progress Velocity Metrics
| Metric | Description | Thresholds |
|--------|-------------|------------|
| `task_completion_velocity` | Tasks completed per week vs. planned | Warning: <80%, Critical: <50% |
| `milestone_achievement_rate` | % of milestones completed on time | Warning: <70%, Critical: <50% |
| `progress_stagnation` | Days without progress update | Warning: >7 days, Critical: >14 days |
| `scope_creep_index` | Ratio of new tasks added vs. original scope | Warning: >20%, Critical: >40% |

#### Quality Metrics
| Metric | Description | Thresholds |
|--------|-------------|------------|
| `task_description_quality` | % of tasks with meaningful descriptions | Warning: <60%, Critical: <40% |
| `milestone_clarity_score` | Milestones with clear deliverables | Warning: <70%, Critical: <50% |
| `custom_field_usage` | % of defined custom fields being used | Warning: <30%, Critical: <10% |
| `template_adherence` | Projects following template structure | Warning: <60%, N/A for custom |

#### Team Health Metrics
| Metric | Description | Thresholds |
|--------|-------------|------------|
| `workload_distribution_gini` | Inequality in task assignment (0-1) | Warning: >0.6, Critical: >0.8 |
| `contributor_engagement` | % of team members with active tasks | Warning: <50%, Critical: <30% |
| `blocked_task_ratio` | Tasks blocked / total tasks | Warning: >15%, Critical: >30% |
| `overdue_task_ratio` | Overdue tasks / total active tasks | Warning: >20%, Critical: >40% |

#### Time Management Metrics
| Metric | Description | Thresholds |
|--------|-------------|------------|
| `time_tracking_adoption` | % of tasks with time entries | Info: <50%, Warning: <20% |
| `estimate_accuracy` | Actual time vs. estimated time variance | Warning: >50%, Critical: >100% |
| `deadline_proximity_risk` | Tasks due within 3 days without progress | Alert if >5 tasks |

### 1.3 Health Score Calculation

```typescript
interface ProjectHealthScore {
  overall: number;        // 0-100 weighted composite
  velocity: number;       // 0-100
  quality: number;        // 0-100
  team: number;           // 0-100
  time: number;           // 0-100
  trend: 'improving' | 'stable' | 'declining';
  lastCalculated: Date;
}

// Weight formula
const OVERALL_SCORE = (
  velocity * 0.30 +
  quality * 0.25 +
  team * 0.25 +
  time * 0.20
);
```

### 1.4 Suggestions Generated

| Condition | Suggestion | Priority |
|-----------|------------|----------|
| Progress stagnation >7 days | "Project hasn't seen progress in X days. Consider a status review or breaking tasks into smaller units." | P1 |
| Milestone achievement <50% | "Only X% of milestones on track. Consider extending timeline or reducing scope." | P0 |
| Workload gini >0.7 | "Task distribution is uneven. 3 members have 80% of tasks. Consider rebalancing." | P2 |
| Custom field usage <20% | "Most custom fields are unused. Consider removing or training team on their purpose." | P3 |
| Overdue task ratio >30% | "X tasks are overdue. This may indicate unrealistic planning or blockers." | P0 |

---

## 2. Project Alignment Checks

### 2.1 Alignment Axes for Projects

```
┌─────────────────────────────────────────────────────────────────┐
│              PROJECT ALIGNMENT AXES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AXIS 1: TEMPLATE ↔ PROJECT STRUCTURE                          │
│  ─────────────────────────────────────                          │
│  Template defaults vs. actual project tasks/fields              │
│                                                                 │
│  AXIS 2: PROJECT SETTINGS ↔ ACTUAL USAGE                       │
│  ──────────────────────────────────────                         │
│  Configured workflows, statuses vs. actual usage patterns       │
│                                                                 │
│  AXIS 3: MILESTONE PLAN ↔ TASK EXECUTION                       │
│  ──────────────────────────────────────                         │
│  Milestone deadlines vs. task timelines and dependencies        │
│                                                                 │
│  AXIS 4: CUSTOM FIELDS ↔ DATA POPULATION                       │
│  ─────────────────────────────────────                          │
│  Defined fields vs. actual data entry and validation            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Specific Alignment Checks

#### Template Consistency Check
```typescript
interface TemplateAlignmentCheck {
  projectId: string;
  templateId?: string;
  
  // Check: Are default tasks from template present?
  missingDefaultTasks: string[];
  
  // Check: Are custom fields from template being used?
  unusedTemplateFields: string[];
  
  // Check: Have task types drifted from template?
  taskTypeDrift: {
    templateExpected: string;
    actualUsage: string;
    variance: number;
  }[];
  
  alignmentScore: number; // 0-100
  driftSeverity: 'none' | 'low' | 'medium' | 'high';
}
```

#### Settings vs Usage Check
| Setting | Usage Check | Drift Detection |
|---------|-------------|-----------------|
| Task statuses configured | % of tasks using each status | Unused statuses flagged |
| Priority levels enabled | Distribution of priorities | All "high" = inflation |
| Custom workflows defined | Status transition patterns | Bypassing workflow steps |
| Required fields set | Field completion rates | Required but often empty |
| Time tracking enabled | % of tasks with time logged | Feature abandonment |

#### Milestone-Task Alignment
```typescript
interface MilestoneTaskAlignment {
  milestoneId: string;
  
  // Check: Do milestone deadlines match task timelines?
  deadlineConsistency: {
    milestoneDeadline: Date;
    latestTaskDueDate: Date;
    gap: number; // days
    aligned: boolean;
  };
  
  // Check: Are all milestone tasks linked?
  orphanedTasks: number;
  
  // Check: Is progress calculation consistent?
  reportedProgress: number;
  calculatedProgress: number; // from tasks
  variance: number;
  
  // Check: Dependencies aligned with milestone order?
  dependencyViolations: string[];
}
```

### 2.3 Alignment Drift Alerts

| Drift Type | Severity | Alert Message |
|------------|----------|---------------|
| Template task types not used | Low | "Project uses 'bugfix' task type but template expects 'feature', 'task', 'bug'" |
| Custom field always empty | Medium | "Field 'Budget' is empty for 95% of tasks. Remove or make optional." |
| Milestone deadline before tasks | High | "Milestone due 2024-03-01 but 3 tasks due after this date" |
| Workflow steps bypassed | Medium | "Tasks moving directly from 'todo' to 'done', skipping 'in_progress'" |
| Status inflation | Low | "80% of tasks marked 'high' priority. Consider using priority levels more selectively." |

---

## 3. Project Suggestions Engine

### 3.1 Dead Code Detection in Templates

```typescript
interface TemplateDeadCodeDetection {
  // Scan project templates for unused elements
  
  unusedTaskTypes: {
    type: string;
    definedIn: string[];
    lastUsed: Date | null;
    suggestion: 'remove' | 'deprecate' | 'investigate';
  }[];
  
  unusedCustomFields: {
    fieldId: string;
    fieldName: string;
    projectsWithField: number;
    projectsUsingField: number;
    usageRate: number;
  }[];
  
  unusedDefaultTasks: {
    taskTemplateId: string;
    title: string;
    projectsCreated: number;
    tasksActuallyCreated: number;
    conversionRate: number;
  }[];
}
```

**Suggestion Examples:**
- "Template 'Marketing Campaign' has 5 default tasks but projects using it only create 1.2 on average. Consider reducing defaults."
- "Custom field 'JIRA Ticket ID' is defined but never populated in 47 projects. Consider removing."
- "Task type 'spike' hasn't been used in 6 months across any project. Consider deprecating."

### 3.2 Naming Drift Detection

```typescript
interface NamingDriftAnalysis {
  // Detect inconsistent naming across projects
  
  taskTitlePatterns: {
    detectedPatterns: string[];
    inconsistencies: {
      location: string;
      example: string;
      suggestedStandard: string;
    }[];
  };
  
  milestoneNamingConvention: {
    conventions: string[]; // e.g., "Phase X - Name", "vX.Y - Name"
    mixedConventions: boolean;
    suggestion: string;
  };
  
  customFieldKeyDrift: {
    field: string;
    variants: string[]; // e.g., ["due_date", "dueDate", "duedate"]
    recommendation: string;
  }[];
}
```

**Suggestion Examples:**
- "Milestone naming is inconsistent: 'Phase 1', 'v2.0', 'Launch Sprint'. Consider standardizing on one pattern."
- "Task titles mix verb tenses: 'Implement auth' vs 'Authentication implemented'. Standardize on imperative mood."
- "Similar custom fields detected: 'client_name', 'customerName', 'clientName'. Consider consolidating."

### 3.3 Test Coverage for Project Workflows

```typescript
interface WorkflowTestCoverage {
  // Analyze if project workflows are "tested" via usage
  
  statusTransitions: {
    from: string;
    to: string;
    count: number;
    tested: boolean; // count > 0
  }[];
  
  criticalPaths: {
    path: string[]; // sequence of statuses
    used: boolean;
    lastUsed: Date;
    suggestion?: string;
  }[];
  
  edgeCases: {
    scenario: string;
    observed: boolean;
    risk: 'low' | 'medium' | 'high';
  }[];
}
```

**Suggestion Examples:**
- "Status transition 'blocked' → 'completed' has never been used. Is 'blocked' status necessary?"
- "No tasks have ever been moved to 'cancelled' status. Verify this status is needed."
- "Critical path 'planning → in_progress → review → completed' only used in 20% of tasks. Most skip 'review'."

---

## 4. AI-Powered Project Insights

### 4.1 Risk Scoring Based on Deadline Proximity

```typescript
interface DeadlineRiskAnalysis {
  projectId: string;
  
  overallRiskScore: number; // 0-100, higher = more risk
  
  milestoneRisks: {
    milestoneId: string;
    name: string;
    deadline: Date;
    daysUntil: number;
    completionPercent: number;
    requiredVelocity: number; // tasks/day needed
    historicalVelocity: number; // actual tasks/day
    riskScore: number;
    riskFactors: string[];
  }[];
  
  criticalPathRisk: {
    path: string[];
    totalDuration: number;
    floatTime: number;
    bottleneckTaskId?: string;
  };
}
```

**Risk Calculation Formula:**
```
RISK_SCORE = (
  (deadline_proximity * 0.3) +
  (progress_gap * 0.4) +
  (velocity_variance * 0.2) +
  (blocker_impact * 0.1)
)

Where:
- deadline_proximity = max(0, 1 - days_until / 30) // 0-1, higher = closer
- progress_gap = 1 - (actual_progress / expected_progress)
- velocity_variance = max(0, required_velocity - historical_velocity) / required_velocity
- blocker_impact = blocked_tasks / total_active_tasks
```

**Insight Examples:**
- "Milestone 'Beta Launch' is at high risk: 14 days remaining, 60% incomplete, requires 4.2 tasks/day vs historical 2.1"
- "Project will miss deadline with 85% confidence based on current velocity. Suggest: extend 2 weeks or reduce 3 tasks."
- "3 tasks on critical path have no assignee. Project delay risk: HIGH"

### 4.2 Workload Distribution Analysis

```typescript
interface WorkloadDistributionAnalysis {
  projectId: string;
  
  // Overall distribution metrics
  giniCoefficient: number; // 0 = perfect equality, 1 = max inequality
  distributionQuality: 'balanced' | 'slight_imbalance' | 'imbalanced' | 'critical';
  
  memberWorkloads: {
    userId: string;
    displayName: string;
    assignedTasks: number;
    estimatedHours: number;
    capacityPercent: number; // estimatedHours / capacity
    riskLevel: 'normal' | 'high' | 'overload' | 'underutilized';
    skills: string[];
    taskTypes: Record<string, number>;
  }[];
  
  // Optimization suggestions
  rebalancingSuggestions: {
    fromUserId: string;
    toUserId: string;
    taskCount: number;
    reasoning: string;
    skillMatch: number; // 0-1
  }[];
  
  // Bottleneck detection
  bottlenecks: {
    userId: string;
    reason: 'too_many_tasks' | 'skill_mismatch' | 'availability' | 'blocking_others';
    impact: number;
    suggestedAction: string;
  }[];
}
```

**Insight Examples:**
- "Workload distribution: Uneven (Gini: 0.72). Alice has 15 tasks, Bob has 2. Consider rebalancing."
- "Alice is at 140% capacity with 8 high-priority tasks. Risk of burnout and missed deadlines."
- "Bob has capacity and matching skills for 3 of Alice's tasks. Suggest reassigning: API-123, API-124, API-125"

### 4.3 Bottleneck Detection

```typescript
interface BottleneckDetection {
  projectId: string;
  
  bottlenecks: {
    type: 'resource' | 'dependency' | 'approval' | 'external' | 'process';
    severity: 'low' | 'medium' | 'high' | 'critical';
    
    // Resource bottleneck
    assignee?: {
      userId: string;
      taskCount: number;
      blockedTasks: number;
    };
    
    // Dependency bottleneck
    dependencyChain?: {
      rootTaskId: string;
      downstreamCount: number;
      cumulativeDelay: number;
    };
    
    // Approval bottleneck
    approval?: {
      approverRole: string;
      pendingApprovals: number;
      avgWaitTime: number;
    };
    
    description: string;
    impact: string;
    resolution: string;
  }[];
  
  // Predictive bottlenecks (based on trends)
  predictedBottlenecks: {
    predictedAt: Date;
    type: string;
    confidence: number;
    preventiveAction: string;
  }[];
}
```

**Bottleneck Detection Rules:**

| Bottleneck Type | Detection Rule | Severity |
|-----------------|----------------|----------|
| Resource | Single assignee has >30% of active tasks | Medium |
| Resource | Assignee has 5+ tasks in "blocked" status | High |
| Dependency | Task blocks >5 downstream tasks | High |
| Dependency | Circular dependency detected | Critical |
| Approval | >3 tasks waiting approval >3 days | Medium |
| External | External dependency with no owner | Medium |
| Process | Same status for >10 days across multiple tasks | Medium |

**Insight Examples:**
- "BOTTLENECK DETECTED: Task 'API Design' blocks 8 other tasks. Has been 'in_progress' for 12 days."
- "Approval bottleneck: 5 tasks awaiting 'tech-lead' review for avg 4.2 days. Consider adding reviewer."
- "PREDICTED BOTTLENECK: Alice will be overloaded next week (12 tasks due). Reassign 3 tasks now to prevent."

---

## 5. UI Integration Points

### 5.1 CRICO Suggestions Panel

```typescript
interface CricoProjectSuggestionsPanel {
  // Embedded in project detail page
  
  position: 'sidebar' | 'floating' | 'dedicated_tab';
  
  sections: {
    critical: Suggestion[];      // P0 items
    health_alerts: HealthAlert[];
    improvements: Suggestion[];  // P1/P2 items
    insights: ProjectInsight[];  // AI-generated observations
  };
  
  // Interactive elements
  actions: {
    dismiss: (suggestionId: string) => void;
    apply: (suggestionId: string) => void;
    schedule: (suggestionId: string, date: Date) => void;
    explain: (suggestionId: string) => void;
  };
}
```

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  🤖 CRICO INSIGHTS                              [⚙️] [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔴 CRITICAL (2)                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Milestone at risk: Beta Launch                       │   │
│  │ 14 days left, 60% incomplete                         │   │
│  │ [View Details] [Extend Deadline] [Reduce Scope]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🟡 HEALTH ALERTS                                           │
│  • Progress stagnation: 8 days without update               │
│  • Workload imbalance: Gini coefficient 0.72              │
│                                                             │
│  💡 SUGGESTIONS (4)                                         │
│  ├─ Rebalance 3 tasks from Alice to Bob                   │
│  │   [Apply] [Dismiss] [Why?]                              │
│  ├─ Remove unused custom field 'JIRA Ticket ID'           │
│  ├─ Standardize milestone naming convention               │
│  └─ [Show all 4...]                                        │
│                                                             │
│  📊 AI INSIGHTS                                             │
│  Based on similar projects, completion estimated:         │
│  March 15 (10 days after current deadline)                │
│  Confidence: 78%                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Health Score Display

```typescript
interface HealthScoreDisplay {
  // Display in project header/card
  
  displayModes: {
    compact: 'gauge' | 'badge' | 'indicator';
    expanded: 'radar_chart' | 'bar_chart' | 'breakdown';
  };
  
  colorCoding: {
    excellent: { min: 90, color: '#10b981' }; // green
    good: { min: 75, color: '#3b82f6' };      // blue
    fair: { min: 60, color: '#f59e0b' };      // amber
    poor: { min: 40, color: '#f97316' };      // orange
    critical: { min: 0, color: '#ef4444' };   // red
  };
  
  // Real-time updates
  refreshInterval: number; // seconds
  animateOnChange: boolean;
}
```

**Compact Display (Project Card):**
```
┌────────────────────────────────────┐
│ Project Name                [●●●○] │  ← 75% health (blue)
│ Status: Active                     │
│ Progress: 45%                      │
└────────────────────────────────────┘
```

**Expanded Display (Project Detail):**
```
┌────────────────────────────────────────────────────────┐
│ PROJECT HEALTH                              [Refresh]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│     ┌─────────┐                                       │
│    /    72    \     Overall: FAIR                     │
│   /   ┌───┐    \    Trend: ↓ Declining                │
│  │    │███│    │                                       │
│   \   └───┘   /                                       │
│    \─────────/                                        │
│                                                        │
│  Velocity  ████████░░  78%  ↑                          │
│  Quality   ██████░░░░  62%  ↓                          │
│  Team      █████░░░░░  55%  ↓                          │
│  Time      ████████░░  80%  →                          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 5.3 Inline Suggestions

```typescript
interface InlineSuggestion {
  // Context-aware suggestions within project UI
  
  triggerLocations: {
    'milestone_deadline': 'near deadline input';
    'task_assignment': 'during assignee selection';
    'status_change': 'on status transition';
    'project_settings': 'in configuration page';
    'task_creation': 'when creating from template';
  };
  
  display: {
    type: 'tooltip' | 'popover' | 'banner' | 'inline';
    delay: number; // ms before showing
    dismissible: boolean;
  };
}
```

**Examples:**

1. **Milestone Deadline Input:**
   ```
   Deadline: [2024-03-15] ⚠️
   
   Tooltip: "Based on 12 open tasks, this deadline may be 
            tight. Historical velocity suggests March 22."
   ```

2. **Task Assignment:**
   ```
   Assignee: [Alice Smith ▼] 💡
   
   Popover: "Alice currently has 12 active tasks. 
             Bob has capacity and relevant skills."
   ```

3. **Status Change:**
   ```
   ┌─────────────────────────────────────────┐
   │ ⚠️ Bypassing 'in_review' status?        │
   │                                         │
   │ Your project workflow recommends:       │
   │ todo → in_progress → in_review → done   │
   │                                         │
   │ [Continue Anyway] [Follow Workflow]    │
   └─────────────────────────────────────────┘
   ```

### 5.4 Notifications & Alerts

```typescript
interface CricoNotificationConfig {
  // Notification channels
  channels: {
    in_app: boolean;
    email: boolean;
    slack?: boolean;
    webhook?: boolean;
  };
  
  // Notification types
  types: {
    critical_health_drop: {
      enabled: boolean;
      threshold: number; // health score drop
      immediate: boolean;
    };
    milestone_at_risk: {
      enabled: boolean;
      daysBefore: number; // alert X days before
      confidenceThreshold: number;
    };
    workload_imbalance: {
      enabled: boolean;
      giniThreshold: number;
    };
    alignment_drift: {
      enabled: boolean;
      severity: ('low' | 'medium' | 'high')[];
    };
    weekly_digest: {
      enabled: boolean;
      dayOfWeek: number;
      includes: string[];
    };
  };
}
```

**Notification Templates:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🚨 CRITICAL: Project Health Dropped                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Project: Mobile App v2.0                                    │
│ Health Score: 78 → 52 (-26 points)                          │
│                                                             │
│ Contributing factors:                                       │
│ • 5 tasks became overdue                                    │
│ • Milestone 'API Integration' at risk                       │
│ • No progress in 5 days                                     │
│                                                             │
│ [View Project] [See Suggestions] [Dismiss]                  │
└─────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Weekly Project Digest - Workspace: Engineering           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ PROJECT HEALTH SUMMARY                                      │
│ ├─ Excellent: 2 projects                                    │
│ ├─ Good: 3 projects                                         │
│ ├─ Needs Attention: 2 projects                              │
│ └─ At Risk: 1 project                                       │
│                                                             │
│ THIS WEEK'S INSIGHTS                                        │
│ • Mobile App completion pushed back 5 days                  │
│ • Team velocity increased 15% on API project                │
│ • 3 templates had low adoption rates                        │
│                                                             │
│ ACTION ITEMS                                                │
│ • Review workload for Alice (8 high-priority tasks)         │
│ • 2 milestones approaching deadline                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Dashboard Integration

```typescript
interface CricoDashboardWidgets {
  // Widgets for main project dashboard
  
  widgets: {
    health_overview: {
      type: 'summary';
      shows: 'workspace_health' | 'project_health_trend';
      chartType: 'gauge_grid' | 'heatmap';
    };
    
    at_risk_projects: {
      type: 'list';
      maxItems: number;
      sortBy: 'risk_score' | 'deadline_proximity';
    };
    
    crico_suggestions_feed: {
      type: 'feed';
      filters: string[];
      groupBy: 'project' | 'priority' | 'category';
    };
    
    team_workload_map: {
      type: 'visualization';
      view: 'heatmap' | 'chart' | 'list';
      showSkills: boolean;
    };
    
    upcoming_deadlines: {
      type: 'timeline';
      daysAhead: number;
      includeRisk: boolean;
    };
  };
}
```

---

## 6. Technical Implementation

### 6.1 New CRICO Agents

```typescript
// src/lib/crico/agents/project-health-agent.ts
export class ProjectHealthAgent extends BaseAgent {
  constructor() {
    super('project_health', 'Project Health Agent', 
          'Monitors project metrics and calculates health scores', '1.0.0');
  }
  
  async analyze(context: AnalysisContext): Promise<AgentOutput> {
    const projectId = context.inputData?.projectId as string;
    
    // Gather metrics
    const metrics = await this.gatherProjectMetrics(projectId);
    
    // Calculate health scores
    const healthScore = this.calculateHealthScore(metrics);
    
    // Generate suggestions
    const suggestions = this.generateHealthSuggestions(metrics, healthScore);
    
    return {
      agentType: this.type,
      claims: [/* health claims */],
      suggestions,
      confidence: 0.85,
      methodology: 'Project metric analysis and health scoring',
      duration: Date.now() - startTime,
      metadata: { healthScore, metrics },
    };
  }
}

// src/lib/crico/agents/project-alignment-agent.ts
export class ProjectAlignmentAgent extends BaseAgent {
  constructor() {
    super('project_alignment', 'Project Alignment Agent',
          'Checks project consistency across templates, settings, and usage', '1.0.0');
  }
  
  async analyze(context: AnalysisContext): Promise<AgentOutput> {
    // Check template alignment
    // Check settings vs usage
    // Check milestone-task alignment
    // Generate drift warnings
  }
}

// src/lib/crico/agents/project-insights-agent.ts
export class ProjectInsightsAgent extends BaseAgent {
  constructor() {
    super('project_insights', 'Project Insights Agent',
          'Provides AI-powered predictions and risk analysis', '1.0.0');
  }
  
  async analyze(context: AnalysisContext): Promise<AgentOutput> {
    // Analyze deadline risks
    // Predict bottlenecks
    // Suggest workload rebalancing
  }
}
```

### 6.2 Database Schema Extensions

```sql
-- Project health scores table
CREATE TABLE crico_project_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  
  overall_score INT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  velocity_score INT NOT NULL CHECK (velocity_score BETWEEN 0 AND 100),
  quality_score INT NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
  team_score INT NOT NULL CHECK (team_score BETWEEN 0 AND 100),
  time_score INT NOT NULL CHECK (time_score BETWEEN 0 AND 100),
  
  trend VARCHAR(20) NOT NULL CHECK (trend IN ('improving', 'stable', 'declining')),
  
  metrics JSONB NOT NULL DEFAULT '{}',
  
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '1 hour',
  
  UNIQUE(project_id, calculated_at)
);

-- Project alignment checks
CREATE TABLE crico_project_alignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  
  axis VARCHAR(50) NOT NULL, -- 'template', 'settings', 'milestone_task', 'custom_fields'
  aligned BOOLEAN NOT NULL,
  drift_severity VARCHAR(20) CHECK (drift_severity IN ('none', 'low', 'medium', 'high')),
  
  mismatches JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_id, axis, checked_at)
);

-- Extend existing crico_suggestions table for project-specific suggestions
ALTER TABLE crico_suggestions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES foco_projects(id) ON DELETE CASCADE;
ALTER TABLE crico_suggestions ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES foco_milestones(id) ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX idx_crico_health_project ON crico_project_health(project_id, calculated_at DESC);
CREATE INDEX idx_crico_alignment_project ON crico_project_alignment(project_id, axis);
CREATE INDEX idx_crico_suggestions_project ON crico_suggestions(project_id, status, priority);
```

### 6.3 API Endpoints

```typescript
// src/app/api/crico/projects/[id]/health/route.ts
GET /api/crico/projects/[id]/health
→ Returns current health score with breakdown

POST /api/crico/projects/[id]/health/refresh
→ Triggers recalculation of health score

// src/app/api/crico/projects/[id]/alignment/route.ts
GET /api/crico/projects/[id]/alignment
→ Returns all alignment checks for project

POST /api/crico/projects/[id]/alignment/check
→ Runs alignment checks and returns results

// src/app/api/crico/projects/[id]/insights/route.ts
GET /api/crico/projects/[id]/insights
→ Returns AI-generated insights (risks, predictions)

GET /api/crico/projects/[id]/workload-analysis
→ Returns workload distribution analysis

// src/app/api/crico/projects/[id]/suggestions/route.ts
GET /api/crico/projects/[id]/suggestions
→ Returns project-specific CRICO suggestions

// src/app/api/crico/workspace/[id]/health/route.ts
GET /api/crico/workspace/[id]/health
→ Aggregated health across all workspace projects
```

### 6.4 Frontend Components

```typescript
// src/components/crico/ProjectHealthScore.tsx
export function ProjectHealthScore({ 
  projectId, 
  display = 'compact',
  showTrend = true 
}: ProjectHealthScoreProps) {
  // Fetches and displays health score
}

// src/components/crico/ProjectSuggestionsPanel.tsx
export function ProjectSuggestionsPanel({
  projectId,
  position = 'sidebar',
  maxSuggestions = 10
}: ProjectSuggestionsPanelProps) {
  // Displays CRICO suggestions for project
}

// src/components/crico/WorkloadDistributionChart.tsx
export function WorkloadDistributionChart({
  projectId,
  showRebalancingSuggestions = true
}: WorkloadDistributionChartProps) {
  // Visualizes workload and suggests rebalancing
}

// src/components/crico/MilestoneRiskIndicator.tsx
export function MilestoneRiskIndicator({
  milestoneId,
  showPrediction = true
}: MilestoneRiskIndicatorProps) {
  // Shows risk level with AI prediction
}

// src/components/crico/InlineCricoSuggestion.tsx
export function InlineCricoSuggestion({
  context,
  suggestion,
  onApply,
  onDismiss
}: InlineCricoSuggestionProps) {
  // Context-aware inline suggestion
}
```

### 6.5 Background Jobs

```typescript
// src/lib/crico/jobs/health-calculation-job.ts
export class HealthCalculationJob {
  // Run every hour for active projects
  async run(): Promise<void> {
    const activeProjects = await this.getActiveProjects();
    
    for (const project of activeProjects) {
      await this.agentOrchestra.submitTask({
        id: crypto.randomUUID(),
        type: 'analysis',
        description: `Calculate health for project ${project.id}`,
        context: { projectId: project.id },
        priority: 'medium',
        requiredAgents: ['project_health'],
      });
    }
  }
}

// src/lib/crico/jobs/alignment-check-job.ts
export class AlignmentCheckJob {
  // Run daily
  async run(): Promise<void> {
    // Check alignment for all projects
  }
}

// src/lib/crico/jobs/insight-generation-job.ts
export class InsightGenerationJob {
  // Run twice daily
  async run(): Promise<void> {
    // Generate predictive insights
  }
}
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create database schema extensions
- [ ] Implement Project Health Agent
- [ ] Build health score calculation
- [ ] Create basic health score UI component
- [ ] Add health API endpoints

### Phase 2: Alignment Engine (Week 3-4)
- [ ] Implement Project Alignment Agent
- [ ] Build template consistency checks
- [ ] Build settings vs usage checks
- [ ] Create alignment UI components
- [ ] Add alignment API endpoints

### Phase 3: Insights & Predictions (Week 5-6)
- [ ] Implement Project Insights Agent
- [ ] Build risk scoring algorithm
- [ ] Build workload analysis
- [ ] Build bottleneck detection
- [ ] Create insights UI components
- [ ] Add insights API endpoints

### Phase 4: Suggestions Engine (Week 7-8)
- [ ] Implement dead code detection for templates
- [ ] Build naming drift detection
- [ ] Build workflow test coverage analysis
- [ ] Integrate with existing SuggestionEngine
- [ ] Create suggestions panel UI

### Phase 5: UI Integration & Polish (Week 9-10)
- [ ] Inline suggestions system
- [ ] Notification system integration
- [ ] Dashboard widgets
- [ ] Settings/configuration UI
- [ ] Documentation and testing

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Health Score Accuracy | >80% correlation with actual outcomes | Compare predictions to results |
| Suggestion Acceptance Rate | >60% | Track user actions on suggestions |
| Time to Discovery | <24h for critical issues | Measure detection speed |
| User Engagement | >40% weekly active users view insights | Analytics tracking |
| False Positive Rate | <15% | User dismissal feedback |
| Performance | <2s for health calculation | API response time |

---

## 9. Security & Privacy Considerations

1. **Data Access**: CRICO agents only access data the user has permission to view
2. **Suggestion Confidence**: Low-confidence insights are marked and not auto-applied
3. **Audit Trail**: All CRICO actions logged for accountability
4. **User Control**: Users can disable specific suggestion types or entire CRICO features
5. **Workspace Isolation**: CRICO insights never cross workspace boundaries

---

## 10. Future Enhancements

- **Cross-Project Learning**: Identify patterns across projects (opt-in)
- **Voice Integration**: "Crico, analyze this project's health"
- **Custom Agent SDK**: Allow teams to create project-specific agents
- **Integration with External Tools**: JIRA, GitHub, Slack insights
- **Historical Trending**: Long-term project health evolution charts
- **Benchmarking**: Compare project health to similar projects (anonymized)

---

*Document Version: 1.0*  
*Last Updated: 2026-03-02*  
*Status: Implementation Ready*
