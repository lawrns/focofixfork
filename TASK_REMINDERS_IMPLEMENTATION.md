# Task Reminders Implementation - Complete

## Overview
Implemented comprehensive task reminders feature with strict Test-Driven Development (TDD) approach.

## Features Implemented

### 1. Core Reminder Hook (`use-task-reminder.ts`)
- **setReminder**: Set reminder for a task with date/time and options
- **removeReminder**: Remove reminder from a task
- **getReminderTime**: Calculate reminder time based on options
- **validateReminder**: Validate reminder settings
- **sendReminderNotification**: Send in-app notifications
- **getReminderOptions**: Get all available reminder options
- **formatReminderOption**: Format option for UI display

### 2. Reminder Types (`reminder.types.ts`)
```typescript
export type ReminderOption = '1hour' | '1day' | 'custom'

interface ReminderSettings {
  taskId: string
  reminderAt: string // ISO string
  option: ReminderOption
}

interface ReminderValidationResult {
  valid: boolean
  errors: string[]
}
```

### 3. Database Schema
Added to `supabase/migrations/20260112000002_add_task_reminders.sql`:

#### Main Tables
- **tasks.reminder_at**: TIMESTAMPTZ column to store reminder time
- **task_reminders**: Tracks reminder state and history
  - id (UUID)
  - task_id (UUID FK)
  - user_id (UUID FK)
  - reminder_at (TIMESTAMPTZ)
  - option (TEXT: '1hour', '1day', 'custom')
  - sent (BOOLEAN)
  - sent_at (TIMESTAMPTZ)
  - created_at, updated_at

- **reminder_notifications**: Notification history
  - id (UUID)
  - task_id (UUID FK)
  - user_id (UUID FK)
  - reminder_id (UUID FK)
  - notification_type ('in-app', 'email', 'both')
  - message (TEXT)
  - sent (BOOLEAN)
  - sent_at (TIMESTAMPTZ)

#### Indexes
- idx_task_reminders_task
- idx_task_reminders_user
- idx_task_reminders_sent
- idx_task_reminders_at
- idx_reminder_notifications_task
- idx_reminder_notifications_user
- idx_reminder_notifications_sent
- idx_tasks_reminder_at

#### Row Level Security (RLS)
- Users can only read/write their own reminders
- Users can only see their own notifications

### 4. Reminder Service (`reminder-service.ts`)
Core service methods:
- **setReminder**: Create or update reminder
- **removeReminder**: Delete reminder
- **getPendingReminders**: Get reminders ready to be sent
- **markReminderAsSent**: Mark as sent and create notification
- **checkAndSendReminders**: Cron job handler
- **getTaskReminders**: Get all reminders for a task
- **getUserNotifications**: Get user's recent notifications

### 5. UI Components
#### ReminderPicker (`ReminderPicker.tsx`)
- Dropdown menu with preset options
- Quick reminders: 1 hour before, 1 day before
- Custom date/time picker
- Display current reminder time
- Remove reminder option
- Responsive design with icons

### 6. API Routes

#### POST /api/tasks/[id]/reminder
Set a reminder for a task
```json
Request:
{
  "reminder_at": "2026-01-15T10:00:00Z",
  "option": "1hour"
}

Response:
{
  "success": true,
  "data": {
    "taskId": "...",
    "reminderAt": "...",
    "option": "1hour"
  }
}
```

#### DELETE /api/tasks/[id]/reminder
Remove a reminder
```json
Response:
{
  "success": true,
  "message": "Reminder removed"
}
```

#### GET /api/tasks/[id]/reminder
Get reminders for a task
```json
Response:
{
  "success": true,
  "data": [...]
}
```

#### GET/POST /api/tasks/reminders/check
Cron job endpoint to check and send pending reminders
- Requires `Authorization: Bearer ${CRON_SECRET}` header
- Should be called every minute

### 7. Validation

#### Schema Updates (`task.schema.ts`)
Added `reminder_at` field to:
- **TaskSchema**: Optional DateTime field
- **CreateTaskSchema**: Optional DateTime with future validation
- **UpdateTaskSchema**: Optional DateTime with future validation

#### Validations
- Reminder must be in the future
- Task ID required
- Valid reminder option required
- ISO datetime format validation

### 8. Tests

#### Unit Tests (`use-task-reminder.test.ts`)
Total: 23 tests
Coverage:
- Setting reminders with different options
- Reminder time calculations
- Validation of reminder settings
- Notification sending
- Error handling
- Edge cases (past dates, far future, removals)

#### Service Tests (`reminder-service.test.ts`)
Coverage:
- Service method validation
- Error handling for missing parameters
- Database error scenarios
- Notification creation

## Testing Instructions

### Run All Reminder Tests
```bash
npm run test:run -- src/features/tasks/hooks/__tests__/use-task-reminder.test.ts
npm run test:run -- src/features/tasks/services/__tests__/reminder-service.test.ts
```

### Watch Mode
```bash
npm test -- src/features/tasks
```

## Usage in UI

### In TaskForm or TaskCard
```tsx
import { ReminderPicker } from '@/features/tasks/components/ReminderPicker'

<ReminderPicker
  onSelectReminder={(option, customDate) => {
    // Handle reminder selection
  }}
  onRemoveReminder={() => {
    // Handle removal
  }}
  currentReminder={task.reminder_at}
  dueDate={task.due_date}
/>
```

### Via API
```typescript
// Set reminder
const response = await fetch(`/api/tasks/${taskId}/reminder`, {
  method: 'POST',
  body: JSON.stringify({
    reminder_at: new Date('2026-01-15T10:00:00Z').toISOString(),
    option: '1hour'
  })
})

// Remove reminder
await fetch(`/api/tasks/${taskId}/reminder`, {
  method: 'DELETE'
})

// Get reminders
const reminders = await fetch(`/api/tasks/${taskId}/reminder`)
```

### Using Hook
```typescript
import { useTaskReminder } from '@/features/tasks/hooks/use-task-reminder'

// Set reminder
const result = useTaskReminder.setReminder(
  taskId,
  new Date('2026-01-15T10:00:00Z'),
  '1hour'
)

// Get reminder options
const options = useTaskReminder.getReminderOptions()
// ['1hour', '1day', 'custom']

// Format option for display
const label = useTaskReminder.formatReminderOption('1hour')
// "1 hour before"
```

## Cron Job Setup

To enable automatic reminder sending, set up a cron job that calls the check endpoint every minute:

### GitHub Actions
```yaml
name: Check Task Reminders
on:
  schedule:
    - cron: '* * * * *'
jobs:
  check-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Check reminders
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/tasks/reminders/check
```

### Vercel Cron
```json
{
  "crons": [{
    "path": "/api/tasks/reminders/check",
    "schedule": "* * * * *"
  }]
}
```

### Environment Variables
```
CRON_SECRET=your-secret-token
```

## Files Created/Modified

### New Files
- `src/features/tasks/hooks/use-task-reminder.ts`
- `src/features/tasks/hooks/__tests__/use-task-reminder.test.ts`
- `src/features/tasks/types/reminder.types.ts`
- `src/features/tasks/components/ReminderPicker.tsx`
- `src/features/tasks/services/reminder-service.ts`
- `src/features/tasks/services/__tests__/reminder-service.test.ts`
- `src/app/api/tasks/[id]/reminder/route.ts`
- `src/app/api/tasks/reminders/check/route.ts`
- `supabase/migrations/20260112000002_add_task_reminders.sql`

### Modified Files
- `src/lib/validation/schemas/task.schema.ts` - Added reminder_at field
- `src/components/foco/layout/top-bar.tsx` - Fixed JSX structure (pre-existing)
- `src/features/tasks/components/task-card.tsx` - Fixed JSX structure (pre-existing)

## Success Criteria

### All Tests Passing
- 23 unit tests for reminder hook
- Service integration tests
- All validation logic covered

### Feature Complete
- Users can set reminders with options (1 hour, 1 day, custom)
- Reminders display in UI with ReminderPicker
- Notifications sent when reminders trigger
- Cron job processes pending reminders every minute
- Users can remove reminders

### Code Quality
- All linting passes
- TypeScript strict mode compliant
- Proper error handling and validation
- Database constraints and RLS policies in place

## Notes

- Reminders must be in the future
- Reminders are timezone-aware (stored as TIMESTAMPTZ)
- All user data is protected by RLS policies
- Notification creation is best-effort (doesn't block reminder marking)
- System is ready for email notifications (infrastructure in place)
