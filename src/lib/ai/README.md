# AI Tool Executor

The tool executor enforces admin policies and executes Foco API tools with comprehensive audit logging.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Tool Executor                       │
│                                                         │
│  1. Tool Lookup                                         │
│  2. Policy Enforcement ← WorkspaceAIPolicy              │
│  3. Argument Validation                                 │
│  4. Tool Handler Execution (delegated access)           │
│  5. Audit Logging → activity_log table                  │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. Types (`types.ts`)

Core type definitions:

- **WorkspaceAIPolicy**: Controls which tools and actions are allowed
- **ToolCallContext**: Authentication and policy context
- **ToolCallResult**: Standardized response format
- **ToolDefinition**: Tool metadata and handler
- **AuditLogEntry**: Compliance and debugging record

### 2. Tool Executor (`tool-executor.ts`)

Main execution engine with:

- Policy enforcement (allowed_tools, constraints)
- Argument validation against schemas
- Delegated access (uses user's Supabase client with RLS)
- Comprehensive audit logging
- Error handling with user-friendly messages

### 3. Phase 1 Tools (Read-Only)

#### `query_tasks`
Query tasks with filters and pagination.

```typescript
await executeToolCall('query_tasks', {
  filters: {
    status: ['in_progress', 'review'],
    assignee_id: 'user-123',
  },
  limit: 50,
  offset: 0,
}, context)
```

#### `get_task_details`
Get detailed information about a specific task.

```typescript
await executeToolCall('get_task_details', {
  task_id: 'task-123',
  include_comments: true,
  include_dependencies: true,
}, context)
```

#### `get_project_overview`
Get project overview with task counts and team info.

```typescript
await executeToolCall('get_project_overview', {
  project_id: 'project-456',
  include_task_breakdown: true,
  include_team_members: true,
}, context)
```

#### `get_team_workload`
Aggregate team workload by assignee.

```typescript
await executeToolCall('get_team_workload', {
  workspace_id: 'workspace-789',
  time_period: 'current_week',
}, context)
```

#### `analyze_blockers`
Find blocked tasks and analyze dependencies.

```typescript
await executeToolCall('analyze_blockers', {
  workspace_id: 'workspace-789',
  include_dependencies: true,
}, context)
```

## Usage

### Basic Usage

```typescript
import { executeToolCall } from '@/lib/ai/tool-executor'
import type { ToolCallContext, WorkspaceAIPolicy } from '@/lib/ai/types'

// 1. Fetch workspace AI policy
const workspace = await workspaceRepo.findById(workspaceId)
const aiPolicy: WorkspaceAIPolicy = workspace.ai_policy

// 2. Create context
const context: ToolCallContext = {
  userId: currentUser.id,
  workspaceId: workspace.id,
  aiPolicy: aiPolicy,
  correlationId: crypto.randomUUID(),
  supabase: userSupabaseClient, // User's client (not service role)
}

// 3. Execute tool
const result = await executeToolCall('query_tasks', {
  filters: { status: ['in_progress'] },
  limit: 10,
}, context)

// 4. Handle result
if (result.success) {
  console.log('Tasks:', result.data)
  console.log('Evidence:', result.evidence) // Task IDs
} else {
  console.error('Error:', result.error)
  console.error('Explanation:', result.explanation)
}
```

### Policy Configuration

Workspace AI policies are stored in the `workspaces.ai_policy` JSONB column:

```json
{
  "allowed_tools": ["query_tasks", "get_task_details", "get_project_overview"],
  "allowed_actions": ["suggest"],
  "auto_apply": false,
  "confidence_threshold": 0.8,
  "data_sources": ["tasks", "comments", "docs"],
  "audit_visible": true,
  "constraints": {
    "allow_task_creation": false,
    "allow_task_updates": false,
    "allow_task_deletion": false,
    "allow_project_access": true,
    "allow_team_access": true,
    "require_approval_for_writes": false,
    "max_tasks_per_operation": 50
  }
}
```

### Policy Enforcement

The executor enforces policies in this order:

1. **Tool Allowlist**: Tool must be in `allowed_tools` (or use `["*"]` wildcard)
2. **Write Constraints**: For write tools, check specific constraints
3. **Operation Limits**: Enforce `max_tasks_per_operation`
4. **Approval Requirements**: Check `require_approval_for_writes`

Example policy violations:

```typescript
// Tool not allowed
context.aiPolicy.allowed_tools = ['get_task_details']
const result = await executeToolCall('query_tasks', {}, context)
// Returns: { success: false, error: "Tool 'query_tasks' is not allowed..." }

// Task creation disabled
context.aiPolicy.constraints.allow_task_creation = false
const result = await executeToolCall('create_task', {...}, context)
// Returns: { success: false, error: "Task creation is disabled..." }
```

## Audit Logging

Every tool execution is logged to the `activity_log` table:

```sql
SELECT
  id,
  workspace_id,
  user_id,
  action,
  changes->>'tool_name' as tool_name,
  changes->>'result_success' as success,
  changes->>'execution_time_ms' as latency,
  created_at
FROM activity_log
WHERE entity_type = 'ai_tool_execution'
ORDER BY created_at DESC;
```

Audit entries include:

- `correlation_id`: Links related operations
- `tool_name`: Which tool was called
- `arguments`: Redacted input arguments
- `result_success`: Success/failure
- `result_summary`: Brief outcome description
- `execution_time_ms`: Performance metric

Sensitive fields (password, token, secret, apiKey) are automatically redacted.

## Security

### Delegated Access

The tool executor uses the **user's Supabase client**, not a service account:

```typescript
// ✅ Correct: User's client with RLS
const context = {
  supabase: userSupabaseClient, // Inherits user's permissions
  ...
}

// ❌ Wrong: Service role bypasses RLS
const context = {
  supabase: createClient(url, SERVICE_ROLE_KEY),
  ...
}
```

This ensures:
- Users can only access data they have permission to see
- Row Level Security (RLS) policies are enforced
- No privilege escalation

### Policy Violations

Policy violations throw `PolicyViolationError` with user-friendly messages:

```typescript
try {
  await executeToolCall('forbidden_tool', {}, context)
} catch (error) {
  if (error instanceof PolicyViolationError) {
    console.log(error.message) // User-friendly
    console.log(error.policy)   // Which policy was violated
  }
}
```

## Testing

See `__tests__/tool-executor.test.ts` for comprehensive examples:

```bash
npm test src/lib/ai/__tests__/tool-executor.test.ts
```

Test coverage includes:
- Policy enforcement
- Argument validation
- Tool handlers
- Audit logging
- Error handling
- Constraint enforcement

## Future Enhancements (Phase 2+)

### Write Tools

```typescript
// Phase 2: Task mutations
'create_task', 'update_task', 'delete_task'

// Phase 3: Project operations
'update_project', 'assign_task', 'set_due_date'

// Phase 4: AI-driven suggestions
'auto_prioritize', 'suggest_assignments', 'detect_blockers'
```

### Advanced Policy Features

```typescript
{
  "constraints": {
    // Time-based restrictions
    "allowed_hours": { "start": 9, "end": 17 },
    "allowed_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],

    // Rate limiting
    "max_operations_per_hour": 100,
    "max_operations_per_day": 500,

    // Data scope limits
    "max_query_results": 1000,
    "allowed_projects": ["project-1", "project-2"],
  }
}
```

### Approval Workflows

For operations requiring approval:

```typescript
{
  "require_approval_for_writes": true,
  "approval_settings": {
    "required_approvers": 1,
    "eligible_approvers": ["role:admin", "role:owner"],
    "auto_approve_threshold": 0.95
  }
}
```

## Migration Path

To enable AI tools in a workspace:

1. Update workspace AI policy:
```sql
UPDATE workspaces
SET ai_policy = jsonb_set(
  ai_policy,
  '{allowed_tools}',
  '["query_tasks", "get_task_details", "get_project_overview"]'::jsonb
)
WHERE id = 'workspace-id';
```

2. Monitor audit log:
```sql
SELECT
  COUNT(*) as executions,
  changes->>'tool_name' as tool,
  AVG((changes->>'execution_time_ms')::numeric) as avg_latency_ms
FROM activity_log
WHERE entity_type = 'ai_tool_execution'
  AND workspace_id = 'workspace-id'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY changes->>'tool_name';
```

## Related Documentation

- Database Schema: `/database/migrations/100_foco_2_core_schema.sql`
- Repository Pattern: `/src/lib/repositories/base-repository.ts`
- AI Policy Types: `/src/types/foco.ts`
