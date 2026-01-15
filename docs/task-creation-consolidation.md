# Task Creation System Consolidation

## Problem
The application had multiple, inconsistent task creation entry points:
- Command palette → `/my-work?create=task`
- My Work sections → `/tasks/new?section=${section}`
- Dashboard → "Task creation coming soon!" toast
- Kanban board → Inline task creation
- Project pages → "Add task" buttons
- Tasks page → Full form

## Solution
Created a unified task creation system with a global modal.

### Changes Made

#### 1. New Components
- **`CreateTaskModal`** (`/src/features/tasks/components/create-task-modal.tsx`)
  - Unified modal for task creation
  - Supports pre-selecting project and section
  - Fetches projects and workspace members
  - Handles workspace_id correctly

#### 2. Global State Management
- **`useCreateTaskModal`** hook (`/src/features/tasks/hooks/use-create-task-modal.tsx`)
  - Zustand store for global modal state
  - Can be called from anywhere in the app
  - Supports passing default options

#### 3. Integration Points
- **Command Palette**: Now opens modal instead of navigating
- **Dashboard**: Opens modal (was showing toast)
- **My Work**: Opens modal with section pre-selected
- **Global Provider**: Added to `/src/app/providers.tsx`

### Usage
```typescript
import { useCreateTaskModal } from '@/features/tasks'

// In any component
const { openTaskModal } = useCreateTaskModal()

// Open with defaults
openTaskModal()

// Open with specific project and section
openTaskModal({ 
  projectId: 'xxx', 
  section: 'now' 
})
```

### Benefits
1. **Consistent UX**: Same task creation experience everywhere
2. **No Page Navigation**: Faster task creation without leaving current page
3. **Context Aware**: Can pre-select project/section based on where it's opened
4. **Reduced Duplication**: Single component instead of multiple forms
5. **Global Access**: Available from keyboard shortcuts, command palette, etc.

### Future Improvements
- Add quick task creation (title-only)
- Support templates in modal
- Add AI-powered task suggestions
- Batch task creation from modal
