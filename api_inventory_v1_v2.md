# API Inventory - Current Routes (v1) and Voice Planning Extensions (v2)

## Current API Routes (v1) - Frozen for Compatibility

### Projects API
```
GET    /api/projects
POST   /api/projects  
GET    /api/projects/[id]
PUT    /api/projects/[id]
DELETE /api/projects/[id]
```

**Current Schema Characteristics**:
- **Priority enum**: `['low', 'medium', 'high', 'urgent']` → ⚠️ Voice target uses 'critical'
- **Status enum**: `['planning', 'active', 'on_hold', 'completed', 'cancelled']` → ✅ Compatible
- **Date fields**: ISO string format → ✅ Compatible  
- **Validation**: Zod schemas with strict validation → ✅ Maintain compatibility

### Milestones API
```
GET    /api/milestones
POST   /api/milestones
GET    /api/milestones/[id] 
PUT    /api/milestones/[id]
DELETE /api/milestones/[id]
```

**Current Schema Characteristics**:
- **Field name**: `name` → ⚠️ Voice target uses `title`
- **Status enum**: `['green', 'yellow', 'red']` → ⚠️ Voice target uses task-style statuses
- **Date fields**: `deadline` → ⚠️ Voice target uses `due_date`
- **Optional field**: `due_date` already exists → ✅ Good for compatibility

### Tasks API  
```
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/[id]
PUT    /api/tasks/[id]
PATCH  /api/tasks/[id]
DELETE /api/tasks/[id]
```

**Current Schema Characteristics**:
- **Status enum**: `['todo', 'in_progress', 'review', 'done', 'blocked']` → ✅ Perfect match
- **Priority enum**: `['low', 'medium', 'high', 'urgent']` → ⚠️ Voice target uses 'critical'
- **Dependencies**: No dependency model → ⚠️ Voice target adds dependency_links JSONB
- **Field names**: All compatible → ✅ Perfect match

## Voice Planning API Extensions (v2)

### Voice Session Management
```
POST   /api/voice/start-session     - Initialize voice capture session
POST   /api/voice/transcribe        - Stream audio for transcription
POST   /api/voice/end-session       - Finalize session and trigger planning
GET    /api/voice/sessions          - List user's voice sessions
GET    /api/voice/sessions/[id]     - Get specific session details
DELETE /api/voice/sessions/[id]     - Delete session and associated data
```

### Plan Generation and Management
```
POST   /api/plan/generate           - Generate plan from transcript
POST   /api/plan/refine             - Refine existing plan with feedback
POST   /api/plan/commit             - Commit plan to production tables
GET    /api/plan/drafts             - List plan drafts (paginated)
GET    /api/plan/drafts/[id]        - Get specific plan draft
PUT    /api/plan/drafts/[id]        - Update plan draft
DELETE /api/plan/drafts/[id]        - Delete plan draft
```

### AI Suggestions and Intents
```
GET    /api/ai/suggestions          - Get contextual suggestions
POST   /api/ai/suggestions/[id]/apply - Apply AI suggestion
GET    /api/voice/intents           - Get extracted intents from session
POST   /api/voice/intents/correct   - Correct intent extraction
```

## Schema Compatibility Analysis

### Enum Alignment Strategy

#### Priority Enums
| Current | Target | Migration Strategy |
|---------|--------|-------------------|
| low | low | ✅ No change needed |
| medium | medium | ✅ No change needed |
| high | high | ✅ No change needed |
| urgent | critical | ⚠️ Add compatibility layer |

**Implementation**: 
- Keep `urgent` in v1 for backward compatibility
- Add `critical` as new option in v2
- Map `urgent` → `critical` in voice-generated plans
- Gradual migration of existing `urgent` items

#### Status Enums
| Entity | Current | Target | Strategy |
|--------|---------|--------|----------|
| projects | planning, active, on_hold, completed, cancelled | Same | ✅ No change |
| milestones | green, yellow, red | todo, in_progress, review, done, blocked | ⚠️ Add compatibility |
| tasks | todo, in_progress, review, done, blocked | Same | ✅ No change |

**Implementation**:
- Add new status fields to milestones: `task_status`
- Keep existing `status` field for v1 compatibility
- Voice plans use `task_status`, v1 UI uses `status`
- Gradual migration of milestone status values

### Field Name Standardization

#### Milestones Field Mapping
| Current Field | Target Field | Compatibility Strategy |
|---------------|--------------|------------------------|
| name | title | Add `title` field, keep `name` for v1 |
| deadline | due_date | Add `due_date` field, keep `deadline` for v1 |
| status | task_status | Add `task_status` field, keep `status` for v1 |

## API Versioning Strategy

### Version Headers
```typescript
// v1 - Current frozen API
GET /api/projects
Headers: { "API-Version": "1.0" }

// v2 - Voice planning extensions  
POST /api/voice/start-session
Headers: { "API-Version": "2.0" }

// Compatibility mode - Both versions supported
GET /api/projects
Headers: { "API-Version": "1.0" } // Returns v1 schema
Headers: { "API-Version": "2.0" } // Returns v2 schema with new fields
```

### Response Transformation
```typescript
// Response adapter for backward compatibility
class ApiResponseAdapter {
  adaptProject(project: ProjectV2, version: string): ProjectV1 | ProjectV2 {
    if (version === "1.0") {
      return {
        ...project,
        // Map v2 fields back to v1 format
        priority: project.priority === 'critical' ? 'urgent' : project.priority,
        // Hide v2-specific fields
        ai_generated: undefined,
        confidence_score: undefined
      };
    }
    return project; // Return v2 format
  }
}
```

## Feature Flag Integration

### API-Level Feature Flags
```typescript
const VOICE_API_FLAGS = {
  VOICE_CAPTURE_ENABLED: 'voice_capture_enabled',
  PLAN_GENERATION_ENABLED: 'plan_generation_enabled', 
  AI_SUGGESTIONS_ENABLED: 'ai_suggestions_enabled',
  DEPENDENCY_MANAGEMENT_ENABLED: 'dependency_management_enabled'
};

// Middleware to check feature flags
app.use('/api/voice/*', checkFeatureFlag(VOICE_API_FLAGS.VOICE_CAPTURE_ENABLED));
app.use('/api/plan/*', checkFeatureFlag(VOICE_API_FLAGS.PLAN_GENERATION_ENABLED));
```

## Migration Safety Measures

### API Contract Preservation
1. **No Breaking Changes**: All v1 endpoints maintain exact same contracts
2. **Additive Only**: v2 adds new endpoints and optional fields only
3. **Compatibility Layer**: Response adapters handle schema differences
4. **Gradual Rollout**: Feature flags control v2 feature availability

### Backward Compatibility Guarantees
```typescript
// Guaranteed v1 response format
interface V1ProjectResponse {
  id: string;
  name: string;           // Never changes to "title"
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent'; // Never adds "critical"
  // ... exact same fields as current v1
}

// v2 extends with additional fields
interface V2ProjectResponse extends V1ProjectResponse {
  title?: string;         // New optional field
  ai_generated: boolean;  // New field
  confidence_score: number; // New field
  voice_session_id?: string; // New field
}
```

## Implementation Timeline

### Phase 0: API Freeze (Current)
- [x] Document current API contracts
- [x] Identify compatibility issues  
- [ ] Create API versioning framework
- [ ] Set up feature flag infrastructure

### Phase 1: Additive Extensions (Week 1)
- [ ] Implement v2 endpoints alongside v1
- [ ] Add compatibility layer for enum differences
- [ ] Create response transformation middleware
- [ ] Add new optional fields to existing schemas

### Phase 2: Voice Feature Rollout (Week 2-3)  
- [ ] Enable voice capture behind feature flag
- [ ] Implement plan generation endpoints
- [ ] Add AI suggestion endpoints
- [ ] Test v1/v2 compatibility thoroughly

### Phase 3: Gradual Migration (Week 4)
- [ ] Begin migrating clients to v2 endpoints
- [ ] Monitor v1 usage and deprecation timeline
- [ ] Plan v1 sunset strategy (6-12 months)

This inventory ensures we can safely add voice planning features without breaking existing functionality.
