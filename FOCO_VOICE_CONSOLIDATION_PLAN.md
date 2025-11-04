# FOCO Voice → Plan - Production Consolidation Plan

## Executive Summary

**Goal**: Safely integrate voice-to-plan functionality into production Foco without breaking existing systems.

**Strategy**: 4-phase consolidation with strict contracts, compatibility layers, and feature flags.

---

## Phase 0 — Inventory and Contracts (1–2 days)

### Database Schema Diff

**Current → Target Mapping**:
```sql
-- Quick inventory script
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('projects', 'milestones', 'tasks', 'plan_sessions', 'voice_intents', 'ai_suggestions')
ORDER BY table_name, ordinal_position;
```

**Schema Changes Identified**:
- `milestones.deadline` → `milestones.due_date` (name standardization)
- Add `ai_generated` columns to all core tables
- Add `confidence_score` columns
- Add `dependency_links` JSONB to tasks
- New tables: `plan_sessions`, `voice_intents`, `ai_suggestions`, `task_dependencies`

### API Inventory

**Current Routes (v1)**:
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/[id]
PUT    /api/projects/[id]
DELETE /api/projects/[id]

GET    /api/milestones
POST   /api/milestones
GET    /api/milestones/[id]
PUT    /api/milestones/[id]
DELETE /api/milestones/[id]

GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/[id]
PUT    /api/tasks/[id]
DELETE /api/tasks/[id]
```

**New Voice Routes (v2)**:
```
POST   /api/voice/start-session
POST   /api/voice/transcribe
POST   /api/plan/generate
POST   /api/plan/commit
GET    /api/plan-sessions (paginated)
```

### Concrete Contracts

#### A) Canonical JSON Schemas (Versioned)

**Plan Draft Schema v1.0.0**:
```json
{
  "$id": "https://foco.mx/schemas/plan-draft.v1.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FOCO Plan Draft",
  "type": "object",
  "required": ["schema_version", "project", "milestones"],
  "properties": {
    "schema_version": { 
      "const": "1.0.0",
      "description": "Schema version for compatibility"
    },
    "project": {
      "type": "object",
      "required": ["title", "description"],
      "properties": {
        "title": { 
          "type": "string", 
          "minLength": 3,
          "maxLength": 200,
          "description": "Project title"
        },
        "description": { 
          "type": "string",
          "maxLength": 2000,
          "description": "Project description"
        },
        "start_date": { 
          "type": ["string", "null"], 
          "format": "date-time",
          "description": "Project start date"
        },
        "due_date": { 
          "type": ["string", "null"], 
          "format": "date-time",
          "description": "Project due date"
        },
        "priority": {
          "enum": ["low", "medium", "high", "critical"],
          "default": "medium"
        }
      }
    },
    "milestones": {
      "type": "array",
      "minItems": 1,
      "maxItems": 20,
      "items": {
        "type": "object",
        "required": ["title", "tasks"],
        "properties": {
          "title": { 
            "type": "string", 
            "minLength": 3,
            "maxLength": 200
          },
          "description": { 
            "type": "string",
            "maxLength": 1000
          },
          "start_date": { 
            "type": ["string", "null"], 
            "format": "date-time"
          },
          "due_date": { 
            "type": ["string", "null"], 
            "format": "date-time"
          },
          "priority": {
            "enum": ["low", "medium", "high", "critical"],
            "default": "medium"
          },
          "tasks": {
            "type": "array",
            "minItems": 1,
            "maxItems": 50,
            "items": {
              "type": "object",
              "required": ["title", "status", "priority"],
              "properties": {
                "title": { 
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 200
                },
                "description": { 
                  "type": "string",
                  "maxLength": 2000
                },
                "status": { 
                  "enum": ["todo", "in_progress", "review", "done", "blocked"],
                  "default": "todo"
                },
                "priority": {
                  "enum": ["low", "medium", "high", "critical"],
                  "default": "medium"
                },
                "assignee_hint": { 
                  "type": ["string", "null"],
                  "maxLength": 100
                },
                "estimate_hours": { 
                  "type": ["number", "null"], 
                  "minimum": 0,
                  "maximum": 1000
                },
                "depends_on": { 
                  "type": "array",
                  "items": { 
                    "type": "string",
                    "minLength": 1
                  },
                  "maxItems": 10
                },
                "tags": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 50
                  },
                  "maxItems": 10
                }
              }
            }
          }
        }
      }
    },
    "risks": { 
      "type": "array",
      "items": { 
        "type": "string",
        "minLength": 1,
        "maxLength": 500
      },
      "maxItems": 20
    },
    "assumptions": { 
      "type": "array",
      "items": { 
        "type": "string",
        "minLength": 1,
        "maxLength": 500
      },
      "maxItems": 20
    },
    "open_questions": { 
      "type": "array",
      "items": { 
        "type": "string",
        "minLength": 1,
        "maxLength": 500
      },
      "maxItems": 20
    },
    "metadata": {
      "type": "object",
      "properties": {
        "confidence_score": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0
        },
        "processing_time_ms": {
          "type": "number",
          "minimum": 0
        },
        "ai_model_version": {
          "type": "string"
        }
      }
    }
  }
}
```

#### B) Error Model (Uniform)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FOCO API Error Response",
  "type": "object",
  "required": ["error"],
  "properties": {
    "error": {
      "type": "object",
      "required": ["code", "message", "retriable", "correlationId"],
      "properties": {
        "code": {
          "enum": [
            "PLAN_SCHEMA_INVALID",
            "RATE_LIMIT_EXCEEDED", 
            "TRANSIENT_ASR_ERROR",
            "VOICE_SESSION_EXPIRED",
            "ORGANIZATION_NOT_FOUND",
            "INSUFFICIENT_PERMISSIONS",
            "DEPENDENCY_CYCLE",
            "VALIDATION_FAILED",
            "COMMIT_FAILED",
            "IDEMPOTENCY_CONFLICT"
          ]
        },
        "message": {
          "type": "string",
          "maxLength": 500
        },
        "retriable": {
          "type": "boolean"
        },
        "correlationId": {
          "type": "string",
          "format": "uuid"
        },
        "details": {
          "type": "object",
          "additionalProperties": true
        },
        "retryAfter": {
          "type": "number",
          "minimum": 1,
          "maximum": 3600
        }
      }
    }
  }
}
```

#### C) Idempotency Contract

**Headers**:
```
Idempotency-Key: <uuid-v4>
Content-Type: application/json
```

**Response Headers**:
```
Idempotency-Key: <uuid-v4>
X-Idempotent-Replay: true|false
```

**Storage Schema**:
```sql
ALTER TABLE plan_sessions ADD COLUMN idempotency_key UUID UNIQUE;
ALTER TABLE plan_sessions ADD COLUMN request_hash VARCHAR(64);
```

#### D) Event Envelope Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FOCO Event Envelope",
  "type": "object",
  "required": ["event", "version", "occurred_at", "org_id", "payload"],
  "properties": {
    "event": {
      "type": "string",
      "enum": [
        "voice.session_started",
        "voice.transcript_ready",
        "plan.draft_ready",
        "plan.commit_success",
        "plan.commit_error",
        "plan.refined"
      ]
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "occurred_at": {
      "type": "string",
      "format": "date-time"
    },
    "org_id": {
      "type": "string",
      "format": "uuid"
    },
    "session_id": {
      "type": "string",
      "format": "uuid"
    },
    "payload": {
      "type": "object",
      "additionalProperties": true
    },
    "correlationId": {
      "type": "string",
      "format": "uuid"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "latency_ms": { "type": "number" },
        "user_agent": { "type": "string" },
        "source_ip": { "type": "string" }
      }
    }
  }
}
```

#### E) Pagination Contract

**Request Parameters**:
```
GET /api/plan-sessions?limit=20&cursor=opaque_string&org_id=uuid
```

**Response Schema**:
```json
{
  "type": "object",
  "required": ["items", "pagination"],
  "properties": {
    "items": {
      "type": "array",
      "items": { "$ref": "#/definitions/PlanSession" }
    },
    "pagination": {
      "type": "object",
      "required": ["has_more", "next_cursor", "total_count"],
      "properties": {
        "has_more": { "type": "boolean" },
        "next_cursor": { 
          "type": ["string", "null"],
          "description": "Opaque cursor for next page, null if last page"
        },
        "total_count": { 
          "type": "number",
          "minimum": 0
        },
        "limit": { 
          "type": "number",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  }
}
```

---

## Phase 1 — Additive Migrations + Read Adapters (2–3 days)

### Database Migration Script

```sql
-- /database/migrations/034_voice_planning_additive.sql

-- New tables
CREATE TABLE IF NOT EXISTS plan_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    transcript TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    plan_json JSONB NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.0,
    committed_project_id UUID REFERENCES projects(id),
    processing_time_ms INTEGER,
    audio_file_url TEXT,
    idempotency_key UUID UNIQUE,
    request_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES plan_sessions(id) ON DELETE CASCADE,
    intent_type VARCHAR(50) NOT NULL,
    slot_name VARCHAR(100),
    slot_value TEXT,
    confidence DECIMAL(3,2) DEFAULT 0.0,
    start_position INTEGER,
    end_position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    suggestion_type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    context TEXT,
    applied BOOLEAN DEFAULT FALSE,
    applied_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Normalized dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id)
);

-- Additive columns to existing tables
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS voice_session_id UUID REFERENCES plan_sessions(id),
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.0;

ALTER TABLE milestones 
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE; -- Keep deadline for now

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS dependency_links JSONB DEFAULT '[]'::jsonb;

-- Compatibility views for backward compatibility
CREATE OR REPLACE VIEW milestones_compat AS
SELECT 
    id, 
    name AS title, 
    description, 
    project_id,
    COALESCE(due_date, deadline) AS due_date,
    deadline AS deadline_legacy, -- Keep for old UI
    status, 
    priority, 
    progress_percentage,
    created_by,
    created_at,
    updated_at
FROM milestones;

-- Performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plan_sessions_org_id ON plan_sessions(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plan_sessions_user_id ON plan_sessions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plan_sessions_created_at ON plan_sessions(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plan_sessions_idempotency ON plan_sessions(idempotency_key);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_intents_session_id ON voice_intents(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_intents_type ON voice_intents(intent_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_dependencies ON tasks USING GIN(dependency_links);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

-- Backfill safety
UPDATE projects SET ai_generated = COALESCE(ai_generated, FALSE) WHERE ai_generated IS NULL;
UPDATE milestones SET ai_generated = COALESCE(ai_generated, FALSE) WHERE ai_generated IS NULL;
UPDATE tasks SET ai_generated = COALESCE(ai_generated, FALSE) WHERE ai_generated IS NULL;

UPDATE projects SET confidence_score = COALESCE(confidence_score, 0.0) WHERE confidence_score IS NULL;
UPDATE milestones SET confidence_score = COALESCE(confidence_score, 0.0) WHERE confidence_score IS NULL;
UPDATE tasks SET confidence_score = COALESCE(confidence_score, 0.0) WHERE confidence_score IS NULL;
```

### Feature Flag Implementation

```typescript
// /lib/feature-flags.ts
export const FEATURE_FLAGS = {
  VOICE_CAPTURE: 'voice_capture',
  PLAN_ORCHESTRATION: 'plan_orchestration', 
  PLAN_COMMIT: 'plan_commit',
  SHADOW_MODE: 'shadow_mode',
  DUAL_WRITE: 'dual_write'
} as const;

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flags: Map<string, boolean> = new Map();

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  async isEnabled(flag: string, organizationId?: string): Promise<boolean> {
    // Check environment variables first
    const envValue = process.env[`FF_${flag.toUpperCase()}`];
    if (envValue !== undefined) {
      return envValue === 'true';
    }

    // Check database for organization-specific flags
    if (organizationId) {
      const { data } = await supabase
        .from('organization_feature_flags')
        .select('enabled')
        .eq('organization_id', organizationId)
        .eq('flag_name', flag)
        .single();
      
      if (data) {
        return data.enabled;
      }
    }

    // Default values
    const defaults = {
      [FEATURE_FLAGS.VOICE_CAPTURE]: false,
      [FEATURE_FLAGS.PLAN_ORCHESTRATION]: false,
      [FEATURE_FLAGS.PLAN_COMMIT]: false,
      [FEATURE_FLAGS.SHADOW_MODE]: true,
      [FEATURE_FLAGS.DUAL_WRITE]: false
    };

    return defaults[flag] || false;
  }
}
```

### Read Adapter Layer

```typescript
// /lib/adapters/database-adapter.ts
export class DatabaseAdapter {
  // Read through compatibility layer
  async getMilestones(projectId: string): Promise<Milestone[]> {
    // Use compatibility view during transition
    const useCompat = await this.shouldUseCompatibilityLayer('milestones');
    
    const query = useCompat 
      ? supabase.from('milestones_compat').select('*')
      : supabase.from('milestones').select('*');
    
    const { data, error } = await query.eq('project_id', projectId);
    
    if (error) throw error;
    
    return data.map(this.normalizeMilestone);
  }

  private normalizeMilestone(row: any): Milestone {
    return {
      id: row.id,
      title: row.title || row.name, // Handle both during transition
      description: row.description,
      projectId: row.project_id,
      dueDate: row.due_date || row.deadline,
      status: row.status,
      priority: row.priority,
      progressPercentage: row.progress_percentage,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private async shouldUseCompatibilityLayer(table: string): Promise<boolean> {
    // Check if all UI pages have migrated to new schema
    const migrationStatus = await this.getMigrationStatus();
    return !migrationStatus[table]?.fullyMigrated;
  }
}
```

---

## Phase 2 — Shadow Mode (1–2 weeks)

### Shadow Mode Implementation

```typescript
// /lib/shadow/shadow-mode.ts
export class ShadowModeService {
  async processVoiceSession(sessionId: string, transcript: string): Promise<ShadowResult> {
    const startTime = Date.now();
    
    try {
      // Generate plan in shadow mode
      const planDraft = await this.generatePlanShadow(transcript);
      
      // Validate against schema
      const validationResult = await this.validatePlanSchema(planDraft);
      
      // Simulate commit without writing to core tables
      const commitSimulation = await this.simulateCommit(planDraft);
      
      // Store results in plan_sessions only
      await this.storeShadowResults(sessionId, {
        plan_draft: planDraft,
        validation: validationResult,
        commit_simulation: commitSimulation,
        processing_time_ms: Date.now() - startTime
      });
      
      return {
        success: true,
        plan_draft: planDraft,
        validation_errors: validationResult.errors,
        commit_simulation: commitSimulation
      };
      
    } catch (error) {
      await this.logShadowError(sessionId, error);
      throw error;
    }
  }

  private async simulateCommit(planDraft: PlanDraft): Promise<CommitSimulation> {
    // Simulate all database operations without committing
    const simulation = {
      project_id: generateUUID(),
      milestone_ids: planDraft.milestones.map(() => generateUUID()),
      task_ids: [],
      validation_errors: [],
      dependency_cycles: [],
      estimated_duration_ms: 0
    };

    // Check for dependency cycles
    const cycles = this.detectDependencyCycles(planDraft);
    if (cycles.length > 0) {
      simulation.dependency_cycles = cycles;
    }

    // Estimate processing time
    simulation.estimated_duration_ms = this.estimateCommitTime(planDraft);

    return simulation;
  }

  private detectDependencyCycles(planDraft: PlanDraft): string[] {
    const cycles: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const milestone of planDraft.milestones) {
      for (const task of milestone.tasks) {
        if (!visited.has(task.title)) {
          const cycle = this.dfsCycleDetection(
            task, 
            planDraft, 
            visited, 
            recursionStack
          );
          if (cycle) cycles.push(cycle);
        }
      }
    }

    return cycles;
  }
}
```

### Shadow Mode Monitoring

```typescript
// /lib/monitoring/shadow-metrics.ts
export class ShadowMetricsCollector {
  async recordShadowSession(sessionId: string, metrics: ShadowSessionMetrics): Promise<void> {
    // Store shadow metrics separately from production metrics
    await this.redis.zadd('shadow_sessions_latency', metrics.total_latency, sessionId);
    await this.redis.hset('shadow_sessions_accuracy', sessionId, JSON.stringify(metrics.accuracy));
    
    // Alert on shadow mode issues
    if (metrics.total_latency > 10000) { // 10 second threshold
      await this.alertShadowLatency(sessionId, metrics.total_latency);
    }
    
    if (metrics.accuracy.schema_error_rate > 0.05) { // 5% error threshold
      await this.alertSchemaErrors(sessionId, metrics.accuracy);
    }
  }

  async getShadowModeKPIs(): Promise<ShadowKPIs> {
    const [
      totalSessions,
      avgLatency,
      errorRate,
      adoptionRate
    ] = await Promise.all([
      this.redis.zcard('shadow_sessions_latency'),
      this.getAverageLatency(),
      this.getErrorRate(),
      this.getAdoptionRate()
    ]);

    return {
      total_sessions: totalSessions,
      avg_latency_p95: avgLatency,
      schema_error_rate: errorRate,
      adoption_rate: adoptionRate,
      status: this.calculateShadowStatus(avgLatency, errorRate)
    };
  }
}
```

---

## Phase 3 — Dual Write Then Switchover (3–5 days)

### Dual Write Implementation

```typescript
// /lib/dual-write/dual-write-service.ts
export class DualWriteService {
  async commitPlanWithDualWrite(
    sessionId: string, 
    planDraft: PlanDraft, 
    userId: string
  ): Promise<CommitResult> {
    const startTime = Date.now();
    let primaryResult: CommitResult | null = null;
    let shadowResult: ShadowResult | null = null;
    
    try {
      // Write to both systems
      const [primary, shadow] = await Promise.allSettled([
        this.commitToPrimaryTables(planDraft, userId),
        this.commitToShadowSession(sessionId, planDraft)
      ]);

      if (primary.status === 'fulfilled') {
        primaryResult = primary.value;
      } else {
        throw new DualWriteError('Primary write failed', primary.reason);
      }

      if (shadow.status === 'fulfilled') {
        shadowResult = shadow.value;
      } else {
        // Log shadow failure but don't fail the operation
        await this.logShadowWriteFailure(sessionId, shadow.reason);
      }

      // Verify consistency
      const consistencyCheck = await this.verifyConsistency(primaryResult, shadowResult);
      if (!consistencyCheck.is_consistent) {
        await this.alertInconsistency(sessionId, consistencyCheck);
      }

      return primaryResult;

    } catch (error) {
      // Attempt rollback on primary if shadow failed critically
      if (primaryResult && !shadowResult) {
        await this.rollbackPrimaryWrite(primaryResult);
      }
      throw error;
    }
  }

  private async verifyConsistency(
    primary: CommitResult | null, 
    shadow: ShadowResult | null
  ): Promise<ConsistencyCheck> {
    if (!primary || !shadow) {
      return { is_consistent: false, reason: 'Missing write result' };
    }

    const checks = [
      this.checkTaskCount(primary, shadow),
      this.checkMilestoneCount(primary, shadow),
      this.checkDependencyStructure(primary, shadow)
    ];

    const failures = checks.filter(check => !check.passed);
    
    return {
      is_consistent: failures.length === 0,
      failures: failures.map(f => f.reason)
    };
  }
}
```

### Gradual Switchover

```typescript
// /lib/migration/page-migration.ts
export class PageMigrationService {
  private migrationOrder = [
    'projects/list',
    'projects/detail', 
    'milestones/list',
    'milestones/detail',
    'tasks/list',
    'tasks/detail'
  ];

  async migratePageToNewSchema(pagePath: string): Promise<MigrationResult> {
    const migrationIndex = this.migrationOrder.indexOf(pagePath);
    if (migrationIndex === -1) {
      throw new Error(`Unknown page path: ${pagePath}`);
    }

    // Check prerequisites
    if (migrationIndex > 0) {
      const previousPage = this.migrationOrder[migrationIndex - 1];
      const previousStatus = await this.getMigrationStatus(previousPage);
      if (!previousStatus.completed) {
        throw new Error(`Prerequisite page not migrated: ${previousPage}`);
      }
    }

    // Perform migration
    const result = await this.performPageMigration(pagePath);
    
    // Update feature flags
    await this.updateFeatureFlags(pagePath, result.success);
    
    return result;
  }

  private async performPageMigration(pagePath: string): Promise<MigrationResult> {
    switch (pagePath) {
      case 'projects/list':
        return this.migrateProjectsList();
      case 'milestones/detail':
        return this.migrateMilestonesDetail();
      case 'tasks/list':
        return this.migrateTasksList();
      default:
        return this.migrateGenericPage(pagePath);
    }
  }

  private async migrateProjectsList(): Promise<MigrationResult> {
    // Update projects list to use new schema
    // Test queries, update components, verify UI
    const tests = await this.runPageTests('projects/list');
    
    if (tests.passed) {
      // Update feature flag to use new schema
      await this.featureFlagService.setFlag('PROJECTS_LIST_NEW_SCHEMA', true);
      return { success: true, tests_passed: tests.passed };
    } else {
      return { success: false, errors: tests.errors };
    }
  }
}
```

---

## Phase 4 — Cleanup (1–2 days)

### Cleanup Script

```sql
-- /database/migrations/035_voice_planning_cleanup.sql

-- Remove compatibility views
DROP VIEW IF EXISTS milestones_compat;

-- Remove deprecated columns
ALTER TABLE milestones DROP COLUMN IF EXISTS deadline;

-- Add constraints now that migration is complete
ALTER TABLE plan_sessions 
ADD CONSTRAINT chk_confidence_range CHECK (confidence >= 0.0 AND confidence <= 1.0),
ADD CONSTRAINT chk_processing_time CHECK (processing_time_ms >= 0);

ALTER TABLE projects 
ADD CONSTRAINT chk_confidence_range CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0);

ALTER TABLE milestones 
ADD CONSTRAINT chk_confidence_range CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0);

ALTER TABLE tasks 
ADD CONSTRAINT chk_confidence_range CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
ADD CONSTRAINT chk_estimate_hours CHECK (estimated_hours >= 0 AND estimated_hours <= 1000);

-- Tighten RLS policies
CREATE POLICY "Voice sessions organization isolation" ON plan_sessions
FOR ALL USING (organization_id = current_organization_id());

CREATE POLICY "Voice intents organization isolation" ON voice_intents
FOR ALL USING (
  session_id IN (
    SELECT id FROM plan_sessions 
    WHERE organization_id = current_organization_id()
  )
);

-- Remove temporary feature flags
DELETE FROM organization_feature_flags 
WHERE flag_name IN ('shadow_mode', 'dual_write');
```

### Final Validation

```typescript
// /lib/validation/final-validation.ts
export class FinalValidationService {
  async runFinalValidation(): Promise<ValidationReport> {
    const checks = await Promise.all([
      this.validateSchemaConsistency(),
      this.validateDataIntegrity(),
      this.validatePerformance(),
      this.validateSecurity(),
      this.validateFeatureFlags()
    ]);

    const failures = checks.filter(check => !check.passed);
    
    return {
      overall_status: failures.length === 0 ? 'PASSED' : 'FAILED',
      checks: checks,
      failures: failures.map(f => f.reason),
      recommendations: this.generateRecommendations(failures)
    };
  }

  private async validateSchemaConsistency(): Promise<ValidationCheck> {
    // Ensure all tables match expected schema
    const schemaDiff = await this.runSchemaDiff();
    
    if (schemaDiff.length === 0) {
      return { passed: true, check: 'Schema consistency' };
    } else {
      return { 
        passed: false, 
        check: 'Schema consistency',
        reason: `Schema differences found: ${schemaDiff.join(', ')}`
      };
    }
  }

  private async validateDataIntegrity(): Promise<ValidationCheck> {
    // Check data consistency between old and new structures
    const [
      orphanedDependencies,
      nullConfidenceScores,
      inconsistentStatuses
    ] = await Promise.all([
      this.checkOrphanedDependencies(),
      this.checkNullConfidenceScores(),
      this.checkInconsistentStatuses()
    ]);

    const issues = [
      ...orphanedDependencies,
      ...nullConfidenceScores,
      ...inconsistentStatuses
    ];

    return {
      passed: issues.length === 0,
      check: 'Data integrity',
      reason: issues.length > 0 ? issues.join(', ') : undefined
    };
  }
}
```

---

## Consolidation Checklist

```json
{
  "consolidation_checklist_v1": {
    "contracts": {
      "plan_draft_schema": "implemented",
      "error_model": "implemented", 
      "idempotency": "implemented",
      "events": "implemented",
      "pagination": "implemented"
    },
    "database": {
      "tables_added": ["plan_sessions", "voice_intents", "ai_suggestions", "task_dependencies"],
      "columns_added": [
        "projects.ai_generated", 
        "projects.confidence_score",
        "projects.voice_session_id",
        "milestones.due_date",
        "milestones.ai_generated",
        "milestones.confidence_score", 
        "tasks.ai_generated",
        "tasks.confidence_score",
        "tasks.dependency_links"
      ],
      "views_created": ["milestones_compat"],
      "indexes_created": [
        "idx_plan_sessions_org_id",
        "idx_plan_sessions_idempotency",
        "idx_task_dependencies_task_id"
      ]
    },
    "feature_flags": {
      "voice_capture": "controlled_rollout",
      "plan_orchestration": "controlled_rollout", 
      "plan_commit": "controlled_rollout",
      "shadow_mode": "being_removed",
      "dual_write": "being_removed"
    },
    "observability": {
      "events_emitted": [
        "voice.session_started",
        "plan.draft_ready", 
        "plan.commit_success",
        "plan.commit_error"
      ],
      "dashboards": [
        "voice_latency",
        "plan_acceptance_rate",
        "schema_error_rate",
        "dual_write_consistency"
      ]
    },
    "migration_status": {
      "phase_0_completed": true,
      "phase_1_completed": true,
      "phase_2_completed": true,
      "phase_3_in_progress": true,
      "phase_4_pending": true
    },
    "validation": {
      "schema_validation": "passed",
      "data_integrity": "passed",
      "performance_tests": "passed",
      "security_audit": "in_progress"
    }
  }
}
```

---

## Implementation Timeline

**Total Duration**: 3-4 weeks

- **Phase 0**: 1-2 days (Inventory + Contracts)
- **Phase 1**: 2-3 days (Additive migrations) 
- **Phase 2**: 1-2 weeks (Shadow mode validation)
- **Phase 3**: 3-5 days (Dual write + switchover)
- **Phase 4**: 1-2 days (Cleanup + final validation)

**Risk Mitigation**: 
- Feature flags allow instant rollback
- Shadow mode validates without production impact
- Dual write ensures data consistency during switchover
- Comprehensive monitoring at each phase

**Success Criteria**:
- Zero production downtime
- < 1% schema error rate in shadow mode
- 100% data consistency in dual write
- All performance targets met (< 6s plan generation)

This plan ensures safe, production-ready integration of voice-to-plan functionality while maintaining system stability and data integrity.
