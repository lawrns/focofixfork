# Task Intake / Quick Capture Module

Module 2 of the Foco application: Natural language → structured task conversion with AI classification.

## Overview

The Task Intake module provides a streamlined way to capture tasks using natural language, automatically parse them into structured data, and classify them as human-completable, AI-completable, or hybrid.

## Features

- **Quick Capture**: Expandable textarea for natural language task input
- **AI Parsing**: Uses ClawdBot to extract structured fields (title, description, priority, tags, etc.)
- **Auto-Classification**: Determines if task should be handled by human, AI, or both
- **Live Preview**: Real-time preview of parsed results with editable fields
- **Intake Queue**: View and manage pending intake items
- **Bulk Actions**: Convert or discard multiple items at once
- **Delegation Integration**: Auto-dispatch AI-completable tasks to the delegation engine

## Architecture

### Database Schema

```sql
task_intake_queue
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- project_id: uuid (FK to foco_projects, nullable)
- raw_text: text
- parsed_result: jsonb
- classification: enum ('human', 'ai', 'hybrid', 'unclear')
- auto_completed: boolean
- task_id: uuid (FK to work_items, nullable)
- status: enum ('pending', 'parsed', 'classified', 'dispatched', 'completed', 'discarded')
- ai_response: text
- created_at, updated_at: timestamptz
```

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/task-intake` | GET | List intake items with filtering |
| `/api/task-intake` | POST | Submit raw text for parsing |
| `/api/task-intake/[id]` | GET | Get single intake item |
| `/api/task-intake/[id]` | PATCH | Update intake item |
| `/api/task-intake/[id]` | DELETE | Delete intake item |
| `/api/task-intake/parse` | POST | Quick parse for live preview (SSE) |

### Components

| Component | Description |
|-----------|-------------|
| `QuickCapture` | Main input component with project selector |
| `IntakeQueue` | List view with bulk actions |
| `ParsedPreview` | Editable preview of parsed results |

### Store

`useIntakeStore` - Zustand store managing:
- Intake items list
- Processing states
- Draft text
- API actions (submit, convert, discard, dispatch)

## Integration with Command Surface

The Task Intake module is integrated into the Command Surface as a new mode:

1. Select "Intake" mode from the mode selector dropdown
2. The input area is replaced with the Quick Capture component
3. Tasks are parsed and classified automatically
4. Results can be converted to tasks or dispatched to AI agents

## Usage Examples

### Basic Quick Capture

```tsx
import { QuickCapture } from '@/features/task-intake';

function MyComponent() {
  return (
    <QuickCapture
      projectId="project-uuid"
      workspaceId="workspace-uuid"
      onTaskCreated={(taskId) => console.log('Created:', taskId)}
    />
  );
}
```

### Intake Queue

```tsx
import { IntakeQueue } from '@/features/task-intake';

function Dashboard() {
  return (
    <IntakeQueue
      workspaceId="workspace-uuid"
      projectId="project-uuid"
      maxHeight={500}
    />
  );
}
```

### Using the Store

```tsx
import { useIntakeStore } from '@/features/task-intake';

function MyComponent() {
  const { submitIntake, items, isProcessing } = useIntakeStore();

  const handleSubmit = async (text: string) => {
    const result = await submitIntake(text, projectId);
    if (result.success) {
      console.log('Created intake item:', result.item);
    }
  };
}
```

## Classification Rules

The AI classifier uses the following heuristics:

- **AI**: Clear, self-contained technical tasks (code changes, refactors, data processing)
- **Human**: Tasks requiring human judgment, decisions, meetings, or external coordination
- **Hybrid**: Tasks needing both AI assistance and human input (research, design, planning)
- **Unclear**: Not enough information to determine

## Environment Variables

The module uses the same ClawdBot configuration as the Command Surface:

```bash
CLAWDBOT_API_URL=http://127.0.0.1:18794
OPENCLAW_SERVICE_TOKEN=your-token
```

## Migration

Run the migration to create the database schema:

```bash
supabase migration up
```

Or apply manually:

```bash
psql -f supabase/migrations/20260305_task_intake_queue.sql
```
