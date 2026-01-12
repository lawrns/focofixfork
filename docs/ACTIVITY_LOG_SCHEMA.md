# Activity Log Schema Documentation

## Overview

The activity log system tracks all significant actions within the application, providing a comprehensive audit trail and timeline view of project activities. This document describes the required database schema and implementation details.

## Database Table: `activity_log`

### Schema Definition

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  project_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_activity_log_project_id ON activity_log(project_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_project_created ON activity_log(project_id, created_at DESC);
```

### Column Definitions

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID | Yes | Unique identifier for the activity log entry |
| user_id | UUID | Yes | References the user who performed the action |
| entity_type | TEXT | Yes | Type of entity (e.g., 'task', 'project', 'comment', 'subtask') |
| entity_id | UUID | Yes | ID of the entity that was modified |
| action_type | TEXT | Yes | Type of action (created, updated, completed, deleted, commented, assigned) |
| project_id | UUID | No | Associated project ID for filtering and organization |
| metadata | JSONB | No | Additional context about the change (e.g., field changes, old/new values) |
| created_at | TIMESTAMP | Yes | Timestamp when the activity was logged |
| updated_at | TIMESTAMP | No | Timestamp of last update |

### Supported Entity Types

- `task` - Task work items
- `project` - Project containers
- `comment` - Comments on tasks
- `subtask` - Subtasks of tasks

### Supported Action Types

- `created` - Entity was created
- `updated` - Entity was modified (fields changed)
- `completed` - Task was marked complete
- `deleted` - Entity was deleted
- `commented` - Comment was added to a task
- `assigned` - Task was assigned to a user

### Metadata Structure Examples

#### Task Created
```json
{
  "title": "Build feature",
  "description": "Implement new authentication flow",
  "priority": "high"
}
```

#### Task Updated
```json
{
  "field": "status",
  "old_value": "todo",
  "new_value": "in_progress",
  "changed_at": "2024-01-12T10:30:00Z"
}
```

#### Task Completed
```json
{
  "completion_time": 3600,
  "completed_by": "user-id"
}
```

#### Comment Added
```json
{
  "comment_text": "Great work on this!",
  "comment_id": "comment-id"
}
```

#### Task Assigned
```json
{
  "assigned_to": "user-id",
  "assigned_by": "user-id",
  "assigned_at": "2024-01-12T10:30:00Z"
}
```

#### Task Deleted
```json
{
  "title": "Build feature",
  "reason": "Duplicate"
}
```

## Row Level Security (RLS) Policies

### Read Access
Users can view activity logs for projects they have access to:

```sql
CREATE POLICY "Users can view activity for their projects"
ON activity_log FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid()
  )
);
```

### Write Access
Only system processes and authorized services can insert:

```sql
CREATE POLICY "Only service role can insert activities"
ON activity_log FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

## API Integration Points

### Endpoints

#### GET /api/activity
Fetch activity feed with pagination and filtering.

**Query Parameters:**
- `project_id` (optional): Filter by project
- `entity_id` (optional): Filter by entity
- `entity_type` (optional): Filter by entity type
- `limit` (default: 50): Number of records to fetch
- `offset` (default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "activity-id",
        "user_id": "user-id",
        "entity_type": "task",
        "entity_id": "task-id",
        "action_type": "created",
        "metadata": {...},
        "created_at": "2024-01-12T10:30:00Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 100
    }
  }
}
```

## Usage in Components

### ActivityFeed Component
Displays activities in a formatted timeline view with:
- User avatars
- Activity type icons
- Relative timestamps (e.g., "2 hours ago")
- Metadata expansion for detailed changes
- Grouping of similar activities by user and type
- Dark mode support

### useActivityFeed Hook
Custom React hook for managing activity feed state:
```typescript
const { activities, loading, error, hasMore, loadMore, refetch } = useActivityFeed({
  projectId: 'project-id',
  limit: 50,
  autoFetch: true
})
```

## Integration Guide

### Logging Activities

#### In Task Creation
```typescript
import { logTaskCreated } from '@/lib/services/activity-logger'

await logTaskCreated(userId, taskId, projectId, {
  title: task.title,
  description: task.description,
})
```

#### In Task Update
```typescript
import { logTaskUpdated } from '@/lib/services/activity-logger'

await logTaskUpdated(userId, taskId, projectId, {
  field: 'status',
  old_value: 'todo',
  new_value: 'in_progress',
})
```

#### In Task Completion
```typescript
import { logTaskCompleted } from '@/lib/services/activity-logger'

await logTaskCompleted(userId, taskId, projectId)
```

### Displaying Activities

#### In TaskDetail Sidebar
```tsx
import { useActivityFeed } from '@/hooks/useActivityFeed'
import { ActivityFeed } from '@/components/activity/activity-feed'

export function TaskActivitySidebar({ taskId, projectId }) {
  const { activities, loading } = useActivityFeed({
    entityId: taskId,
    projectId,
  })

  return (
    <ActivityFeed
      activities={activities}
      showAvatars={true}
      groupSimilar={true}
    />
  )
}
```

#### In Project Page
```tsx
export function ProjectActivityTimeline({ projectId }) {
  const { activities, hasMore, loadMore } = useActivityFeed({
    projectId,
    limit: 50,
  })

  return (
    <ActivityFeed
      activities={activities}
      onLoadMore={hasMore ? loadMore : undefined}
    />
  )
}
```

## Performance Considerations

1. **Indexing**: Indexes on `project_id`, `created_at`, and `entity_id` ensure fast queries
2. **Pagination**: Always use pagination (limit/offset) to avoid large result sets
3. **Caching**: Consider caching recent activities in Redis
4. **Cleanup**: Implement retention policies (e.g., archive logs older than 6 months)

## Testing

Unit tests included for:
- Activity logging service
- Activity API route
- ActivityFeed component
- useActivityFeed hook

Run tests with:
```bash
npm test -- activity
```

## Future Enhancements

1. Real-time updates via WebSocket
2. Activity filtering by action type
3. Advanced search and filtering UI
4. Export activity logs to CSV/PDF
5. Activity email notifications
6. Undo/Redo functionality integration
7. Activity analytics dashboard
