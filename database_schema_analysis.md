# Database Schema Diff - Current vs Target State

## Current Database Structure

### Core Tables Analysis

#### Projects Table
```sql
-- Current Structure
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(500) NOT NULL,                    -- ✅ Maps to plan_draft.project.title
  description TEXT,                              -- ✅ Maps to plan_draft.project.description
  organization_id UUID,                         -- ✅ From session context
  status VARCHAR(50) DEFAULT 'planning'         -- ✅ Compatible, may need enum alignment
    CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'medium'         -- ⚠️ Uses 'urgent', target uses 'critical'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  start_date TIMESTAMP WITH TIME ZONE,          -- ✅ Compatible
  due_date TIMESTAMP WITH TIME ZONE,            -- ✅ Compatible
  progress_percentage INTEGER DEFAULT 0         -- ✅ Compatible
    CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_by UUID NOT NULL,                     -- ✅ From session user_id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Changes Needed**:
- Add `voice_session_id UUID REFERENCES plan_sessions(id)`
- Add `ai_generated BOOLEAN DEFAULT FALSE`
- Add `confidence_score DECIMAL(3,2) DEFAULT 0.0`
- Consider enum alignment: `urgent` → `critical`

#### Milestones Table
```sql
-- Current Structure
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(500) NOT NULL,                   -- ⚠️ AI uses 'title', need mapping
  description TEXT,                             -- ✅ Compatible
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'green'            -- ⚠️ Different enum values
    CHECK (status IN ('green', 'yellow', 'red')),
  priority VARCHAR(20) DEFAULT 'medium'         -- ⚠️ Uses 'urgent', target uses 'critical'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  deadline DATE,                                -- ⚠️ AI uses 'due_date', need mapping
  progress_percentage INTEGER DEFAULT 0         -- ✅ Compatible
    CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Changes Needed**:
- Add `ai_generated BOOLEAN DEFAULT FALSE`
- Add `confidence_score DECIMAL(3,2) DEFAULT 0.0`
- Add `due_date TIMESTAMP WITH TIME ZONE` (keep `deadline` for compatibility)
- Consider enum alignment for status and priority

#### Tasks Table
```sql
-- Current Structure
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,                  -- ✅ Perfect match
  description TEXT,                             -- ✅ Compatible
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'todo'             -- ✅ Compatible enum
    CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority VARCHAR(20) DEFAULT 'medium'         -- ⚠️ Uses 'urgent', target uses 'critical'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id UUID,                             -- ✅ Compatible
  estimated_hours INTEGER CHECK (estimated_hours >= 0 AND estimated_hours <= 1000),
  actual_hours INTEGER CHECK (actual_hours >= 0 AND actual_hours <= 1000),
  due_date DATE,                                -- ✅ Compatible
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Changes Needed**:
- Add `ai_generated BOOLEAN DEFAULT FALSE`
- Add `confidence_score DECIMAL(3,2) DEFAULT 0.0`
- Add `dependency_links JSONB DEFAULT '[]'::jsonb`
- Consider enum alignment: `urgent` → `critical`

## Target Voice Planning Tables

### New Tables Required

#### Plan Sessions Table
```sql
CREATE TABLE plan_sessions (
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
```

#### Voice Intents Table
```sql
CREATE TABLE voice_intents (
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
```

#### AI Suggestions Table
```sql
CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    suggestion_type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    context TEXT,
    applied BOOLEAN DEFAULT FALSE,
    applied_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Task Dependencies Table (Normalized)
```sql
CREATE TABLE task_dependencies (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id)
);
```

## Schema Mapping Strategy

### Field Name Standardization
| Current Field | Target Field | Migration Strategy |
|---------------|--------------|-------------------|
| milestones.name | milestones.title | Add title field, keep name for compatibility |
| milestones.deadline | milestones.due_date | Add due_date field, keep deadline for compatibility |
| priority enum 'urgent' | 'critical' | Add compatibility layer, migrate gradually |

### Enum Alignment
| Entity | Current Values | Target Values | Strategy |
|--------|----------------|---------------|----------|
| projects.priority | low, medium, high, urgent | low, medium, high, critical | Add compatibility, migrate |
| milestones.priority | low, medium, high, urgent | low, medium, high, critical | Add compatibility, migrate |
| tasks.priority | low, medium, high, urgent | low, medium, high, critical | Add compatibility, migrate |
| milestones.status | green, yellow, red | todo, in_progress, review, done, blocked | Add compatibility, migrate |

### Compatibility Views
```sql
-- Backward compatibility view for milestones
CREATE OR REPLACE VIEW milestones_compat AS
SELECT 
    id, 
    name AS title, 
    description, 
    project_id,
    COALESCE(due_date, deadline) AS due_date,
    deadline AS deadline_legacy,
    status, 
    priority, 
    progress_percentage,
    created_by,
    created_at,
    updated_at
FROM milestones;
```

## Migration Safety Checklist

### Pre-Migration Validation
- [ ] Backup current database state
- [ ] Test migration on staging environment
- [ ] Verify no active voice sessions in progress
- [ ] Check application compatibility

### Migration Steps
1. **Additive Changes Only** - No destructive operations
2. **Compatibility Views** - Maintain old API contracts
3. **Feature Flags** - Control rollout of new features
4. **Backfill Strategy** - Safely populate new columns
5. **Rollback Plan** - Quick revert if issues arise

### Post-Migration Validation
- [ ] All existing functionality works
- [ ] New voice features operational
- [ ] Performance within acceptable ranges
- [ ] Data integrity verified

## Risk Assessment

### High Risk Items
- Enum value changes may break existing UI
- Field name changes require application updates
- Dependency model changes affect task relationships

### Medium Risk Items
- New table creation is low risk
- Index additions may impact write performance
- Feature flag implementation complexity

### Low Risk Items
- Additive column changes
- Compatibility view creation
- Backfill operations

## Implementation Order

1. **Phase 0**: Schema documentation and API freeze
2. **Phase 1**: Additive migrations with compatibility
3. **Phase 2**: Shadow mode implementation
4. **Phase 3**: Dual write and gradual migration
5. **Phase 4**: Cleanup and optimization

This analysis provides a clear path from current to target state while maintaining production safety.
