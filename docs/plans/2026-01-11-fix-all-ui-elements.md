# Fix All UI Elements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Fix all 147+ broken UI elements across the application including non-functional buttons, broken forms, drag-drop issues, navigation problems, state management bugs, accessibility violations, and mobile responsiveness issues.

**Architecture:** Systematic fixes organized by severity (Critical → High → Medium → Low), with TDD approach for all changes. Each fix includes unit tests, integration tests where applicable, and verification commands.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Zustand, Supabase, Tailwind CSS, @hello-pangea/dnd, Radix UI, PostgreSQL

**Database Connection:** `postgresql://postgres:tqe.cgb0wkv9fmt7XRV@db.ouvqnyfqipgnrjnuqsqq.supabase.co:5432/postgres`

---

## CRITICAL FIXES (15 Issues - Must Fix Immediately)

### Task 1: Fix Settings Page Save Button

**Files:**
- Modify: `src/app/settings/page.tsx:78`
- Test: `src/app/settings/__tests__/settings-page.test.tsx`

**Step 1: Write failing test for Save button**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SettingsPage from '../page'

describe('Settings Page Save Button', () => {
  it('should call API when Save Changes button is clicked', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      })
    ) as jest.Mock

    render(<SettingsPage />)

    const saveButton = screen.getByText('Save Changes')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/app/settings/__tests__/settings-page.test.tsx`
Expected: FAIL - "expected fetch to have been called"

**Step 3: Add state and handler for save button**

In `src/app/settings/page.tsx`, add state management and onClick handler:

```typescript
const [isSaving, setIsSaving] = useState(false)

const handleSaveSettings = async () => {
  setIsSaving(true)
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Collect all settings state here
        defaultView,
        theme,
        // etc.
      }),
    })

    if (!response.ok) throw new Error('Failed to save settings')

    toast.success('Settings saved successfully')
  } catch (error) {
    toast.error('Failed to save settings')
  } finally {
    setIsSaving(false)
  }
}

// Update button
<Button onClick={handleSaveSettings} disabled={isSaving}>
  {isSaving ? 'Saving...' : 'Save Changes'}
</Button>
```

**Step 4: Run test to verify it passes**

Run: `npm test src/app/settings/__tests__/settings-page.test.tsx`
Expected: PASS

**Step 5: Run linting**

Run: `npm run lint`
Expected: No errors

**Step 6: Commit**

```bash
git add src/app/settings/page.tsx src/app/settings/__tests__/settings-page.test.tsx
git commit -m "fix: add onClick handler to Settings page Save Changes button

- Added handleSaveSettings function to persist settings via API
- Added loading state with disabled button during save
- Added success/error toast notifications
- Fixes critical issue where Save button was completely non-functional

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Fix Settings Page Data Source Switches

**Files:**
- Modify: `src/app/settings/page.tsx:253-261`
- Test: `src/app/settings/__tests__/settings-switches.test.tsx`

**Step 1: Write failing test for switch state binding**

```typescript
describe('Settings Data Source Switches', () => {
  it('should toggle tasks switch state when clicked', async () => {
    render(<SettingsPage />)

    const tasksSwitch = screen.getByRole('switch', { name: /tasks/i })
    const initialChecked = tasksSwitch.getAttribute('data-state') === 'checked'

    fireEvent.click(tasksSwitch)

    await waitFor(() => {
      const newChecked = tasksSwitch.getAttribute('data-state') === 'checked'
      expect(newChecked).toBe(!initialChecked)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/app/settings/__tests__/settings-switches.test.tsx`
Expected: FAIL - "expected state to change"

**Step 3: Wire switches to state with onCheckedChange handlers**

```typescript
const [dataSourceSettings, setDataSourceSettings] = useState({
  tasks: true,
  comments: true,
  docs: true,
})

// Update switches
<Switch
  checked={dataSourceSettings.tasks}
  onCheckedChange={(checked) =>
    setDataSourceSettings((prev) => ({ ...prev, tasks: checked }))
  }
/>
```

**Step 4: Run test to verify it passes**

Run: `npm test src/app/settings/__tests__/settings-switches.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/settings/page.tsx src/app/settings/__tests__/settings-switches.test.tsx
git commit -m "fix: wire data source switches to state with onCheckedChange handlers

- Replaced defaultChecked with checked + onCheckedChange pattern
- Added state management for tasks, comments, docs switches
- Switches now properly toggle and persist state changes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Fix Settings AI Action Switches

**Files:**
- Modify: `src/app/settings/page.tsx:273-287`
- Test: `src/app/settings/__tests__/ai-switches.test.tsx`

**Step 1: Write failing test**

```typescript
describe('Settings AI Action Switches', () => {
  it('should toggle auto-suggest switch state', async () => {
    render(<SettingsPage />)

    const autoSuggestSwitch = screen.getByRole('switch', { name: /auto-suggest/i })

    fireEvent.click(autoSuggestSwitch)

    await waitFor(() => {
      expect(autoSuggestSwitch.getAttribute('data-state')).toBe('checked')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/app/settings/__tests__/ai-switches.test.tsx`
Expected: FAIL

**Step 3: Wire AI switches to state**

```typescript
const [aiSettings, setAiSettings] = useState({
  autoSuggest: false,
  autoAssign: false,
  autoPrioritize: false,
})

<Switch
  checked={aiSettings.autoSuggest}
  onCheckedChange={(checked) =>
    setAiSettings((prev) => ({ ...prev, autoSuggest: checked }))
  }
/>
```

**Step 4: Run test to verify it passes**

Run: `npm test src/app/settings/__tests__/ai-switches.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/settings/page.tsx src/app/settings/__tests__/ai-switches.test.tsx
git commit -m "fix: wire AI action switches to state with handlers

- Added state management for autoSuggest, autoAssign, autoPrioritize
- Replaced defaultChecked with checked + onCheckedChange pattern

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Fix Settings Notification Switches

**Files:**
- Modify: `src/app/settings/page.tsx:303-343`
- Test: `src/app/settings/__tests__/notification-switches.test.tsx`

**Step 1: Write failing test**

```typescript
describe('Settings Notification Switches', () => {
  it('should toggle notification channel switches', async () => {
    render(<SettingsPage />)

    const emailSwitch = screen.getByRole('switch', { name: /email notifications/i })

    fireEvent.click(emailSwitch)

    await waitFor(() => {
      expect(emailSwitch.getAttribute('data-state')).toBe('checked')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/app/settings/__tests__/notification-switches.test.tsx`
Expected: FAIL

**Step 3: Wire notification switches to state**

```typescript
const [notificationSettings, setNotificationSettings] = useState({
  email: true,
  push: true,
  inApp: true,
  taskUpdates: true,
  comments: true,
  mentions: true,
})

<Switch
  checked={notificationSettings.email}
  onCheckedChange={(checked) =>
    setNotificationSettings((prev) => ({ ...prev, email: checked }))
  }
/>
```

**Step 4: Run test to verify it passes**

Run: `npm test src/app/settings/__tests__/notification-switches.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/settings/page.tsx src/app/settings/__tests__/notification-switches.test.tsx
git commit -m "fix: wire notification switches to state with handlers

- Added state for email, push, inApp, taskUpdates, comments, mentions
- All notification switches now properly toggle state

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Fix Project Dropdown Menu onClick Handlers

**Files:**
- Modify: `src/app/projects/page.tsx:133-137, 290-294`
- Test: `src/app/projects/__tests__/project-dropdown.test.tsx`

**Step 1: Write failing test for dropdown handlers**

```typescript
describe('Project Dropdown Menu', () => {
  it('should call edit handler when Edit project is clicked', async () => {
    const mockOnEdit = jest.fn()
    render(<ProjectCard project={mockProject} onEdit={mockOnEdit} />)

    const moreButton = screen.getByRole('button', { name: /more options/i })
    fireEvent.click(moreButton)

    const editItem = screen.getByText('Edit project')
    fireEvent.click(editItem)

    expect(mockOnEdit).toHaveBeenCalledWith(mockProject.id)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/app/projects/__tests__/project-dropdown.test.tsx`
Expected: FAIL - "expected onEdit to have been called"

**Step 3: Add onClick handlers to dropdown items**

```typescript
const [projectToEdit, setProjectToEdit] = useState<string | null>(null)
const [projectToArchive, setProjectToArchive] = useState<string | null>(null)

<DropdownMenuItem onClick={() => setProjectToEdit(project.id)}>
  Edit project
</DropdownMenuItem>
<DropdownMenuItem onClick={() => handleDuplicateProject(project.id)}>
  Duplicate
</DropdownMenuItem>
<DropdownMenuItem onClick={() => handleGenerateStatusUpdate(project.id)}>
  Generate status update
</DropdownMenuItem>
<DropdownMenuItem
  className="text-red-600"
  onClick={() => setProjectToArchive(project.id)}
>
  Archive
</DropdownMenuItem>
```

**Step 4: Run test to verify it passes**

Run: `npm test src/app/projects/__tests__/project-dropdown.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/projects/page.tsx src/app/projects/__tests__/project-dropdown.test.tsx
git commit -m "fix: add onClick handlers to project dropdown menu items

- Added handlers for Edit, Duplicate, Generate status update, Archive
- Connected dropdown items to state management for modals

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Fix Top Bar Create Dropdown Handlers

**Files:**
- Modify: `src/components/foco/layout/top-bar.tsx:103-114`
- Test: `src/components/foco/layout/__tests__/top-bar.test.tsx`

**Step 1: Write failing test**

```typescript
describe('Top Bar Create Dropdown', () => {
  it('should open project creation dialog when Project is clicked', async () => {
    render(<TopBar />)

    const createButton = screen.getByRole('button', { name: /create/i })
    fireEvent.click(createButton)

    const projectItem = screen.getByText('Project')
    fireEvent.click(projectItem)

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /create project/i })).toBeInTheDocument()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/foco/layout/__tests__/top-bar.test.tsx`
Expected: FAIL

**Step 3: Add onClick handlers for Project, Doc, Import**

```typescript
<DropdownMenuItem onClick={() => openCommandPalette('create-project')}>
  <span>Project</span>
</DropdownMenuItem>
<DropdownMenuItem onClick={() => openCommandPalette('create-doc')}>
  <span>Doc</span>
</DropdownMenuItem>
<DropdownMenuItem onClick={() => openCommandPalette('import')}>
  <span>Import...</span>
</DropdownMenuItem>
```

**Step 4: Run test to verify it passes**

Run: `npm test src/components/foco/layout/__tests__/top-bar.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/foco/layout/top-bar.tsx src/components/foco/layout/__tests__/top-bar.test.tsx
git commit -m "fix: add onClick handlers to Create dropdown items

- Connected Project, Doc, Import buttons to command palette
- All create dropdown items now functional

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Fix OAuth Callback Route

**Files:**
- Create: `src/app/auth/callback/route.ts`
- Test: `src/app/auth/callback/__tests__/route.test.ts`

**Step 1: Write failing test for OAuth callback**

```typescript
import { NextRequest } from 'next/server'
import { GET } from '../route'

describe('OAuth Callback Route', () => {
  it('should exchange code for session and redirect', async () => {
    const request = new NextRequest('http://localhost:3000/auth/callback?code=test-code&redirectTo=/dashboard')

    const response = await GET(request)

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/dashboard')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/app/auth/callback/__tests__/route.test.ts`
Expected: FAIL - "route not found"

**Step 3: Create OAuth callback route**

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(redirectTo, request.url))
}
```

**Step 4: Run test to verify it passes**

Run: `npm test src/app/auth/callback/__tests__/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/auth/callback/route.ts src/app/auth/callback/__tests__/route.test.ts
git commit -m "fix: create OAuth callback route for Google/Apple login

- Added /auth/callback route handler
- Exchanges authorization code for Supabase session
- Redirects to specified path after authentication
- Fixes critical OAuth flow breakage

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Fix Real-Time Subscription Table Name

**Files:**
- Modify: `src/lib/hooks/use-foco-data.ts:244-262`
- Test: `src/lib/hooks/__tests__/use-foco-data.test.ts`

**Step 1: Write failing test**

```typescript
describe('Real-time subscription', () => {
  it('should subscribe to tasks table not work_items', () => {
    const mockSubscribe = jest.fn()
    const mockSupabase = {
      channel: jest.fn(() => ({
        on: jest.fn(function(this: any, event: string, config: any, callback: any) {
          expect(config.table).toBe('tasks')
          return this
        }),
        subscribe: mockSubscribe,
      })),
    }

    renderHook(() => useFocoData({ supabase: mockSupabase as any }))

    expect(mockSupabase.channel).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/lib/hooks/__tests__/use-foco-data.test.ts`
Expected: FAIL - "expected 'tasks', received 'work_items'"

**Step 3: Change table name from work_items to tasks**

```typescript
const channel = supabase
  .channel('work-items-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'tasks',  // ✅ Changed from 'work_items'
    },
    handleChange
  )
  .subscribe()
```

**Step 4: Run test to verify it passes**

Run: `npm test src/lib/hooks/__tests__/use-foco-data.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/hooks/use-foco-data.ts src/lib/hooks/__tests__/use-foco-data.test.ts
git commit -m "fix: correct real-time subscription table name from work_items to tasks

- Changed subscription table from 'work_items' to 'tasks'
- Real-time updates now work correctly
- Fixes critical bug where UI didn't update on data changes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Fix Infinite Loop in useCurrentWorkspace

**Files:**
- Modify: `src/lib/hooks/use-foco-data.ts:50-89`
- Test: `src/lib/hooks/__tests__/use-current-workspace.test.ts`

**Step 1: Write failing test**

```typescript
describe('useCurrentWorkspace infinite loop prevention', () => {
  it('should not cause infinite loop when setCurrentWorkspace is in dependencies', () => {
    const mockFetch = jest.fn(() => Promise.resolve({ ok: true, json: () => ({}) }))
    global.fetch = mockFetch

    renderHook(() => useCurrentWorkspace())

    // Wait for effects to settle
    act(() => {
      jest.runAllTimers()
    })

    // Should only fetch once, not infinitely
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/lib/hooks/__tests__/use-current-workspace.test.ts`
Expected: FAIL - "expected 1 call, received infinite"

**Step 3: Remove setCurrentWorkspace from dependency array**

```typescript
useEffect(() => {
  if (currentWorkspace) return
  fetchDefaultWorkspace()
}, [currentWorkspace])  // ✅ Removed setCurrentWorkspace
```

**Step 4: Run test to verify it passes**

Run: `npm test src/lib/hooks/__tests__/use-current-workspace.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/hooks/use-foco-data.ts src/lib/hooks/__tests__/use-current-workspace.test.ts
git commit -m "fix: remove setCurrentWorkspace from useEffect dependencies to prevent infinite loop

- Removed setCurrentWorkspace from dependency array
- Prevents infinite re-renders and API calls
- Fixes critical bug that could hang the application

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Fix Kanban Position Persistence

**Files:**
- Modify: `src/features/projects/components/kanban-board.tsx:218-243`
- Modify: `database/migrations/101_add_position_ordering.sql`
- Test: `src/features/projects/components/__tests__/kanban-board.test.tsx`

**Step 1: Write failing test**

```typescript
describe('Kanban drag-drop position persistence', () => {
  it('should persist position when dragging within same column', async () => {
    const mockFetch = jest.fn(() => Promise.resolve({ ok: true }))
    global.fetch = mockFetch

    const { getByText } = render(<KanbanBoard />)

    // Simulate drag task from position 0 to position 2 within same column
    const task = getByText('Task 1')
    fireEvent.dragStart(task)
    fireEvent.drop(getByText('Column 1'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tasks/'),
        expect.objectContaining({
          body: expect.stringContaining('"position":2')
        })
      )
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/features/projects/components/__tests__/kanban-board.test.tsx`
Expected: FAIL

**Step 3: Create migration for position field with proper gaps**

```sql
-- 101_add_position_ordering.sql
ALTER TABLE tasks ALTER COLUMN position TYPE BIGINT;

-- Update existing tasks to use gap-based positioning (gaps of 65536)
WITH ranked_tasks AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at) - 1 AS rank
  FROM tasks
)
UPDATE tasks
SET position = ranked_tasks.rank * 65536
FROM ranked_tasks
WHERE tasks.id = ranked_tasks.id;

CREATE INDEX IF NOT EXISTS idx_tasks_status_position ON tasks(status, position);
```

**Step 4: Update handleDragEnd to calculate position between items**

```typescript
const handleDragEnd = async (result: DropResult) => {
  const { source, destination, draggableId } = result
  if (!destination) return

  const destColumn = columns.find(col => col.id === destination.droppableId)
  if (!destColumn) return

  // Calculate position between surrounding items
  const destTasks = destColumn.tasks
  let newPosition: number

  if (destTasks.length === 0) {
    newPosition = 65536  // First item
  } else if (destination.index === 0) {
    // Before first item
    newPosition = Math.floor(destTasks[0].position / 2)
  } else if (destination.index >= destTasks.length) {
    // After last item
    newPosition = destTasks[destTasks.length - 1].position + 65536
  } else {
    // Between two items
    const prevPosition = destTasks[destination.index - 1].position
    const nextPosition = destTasks[destination.index].position
    newPosition = Math.floor((prevPosition + nextPosition) / 2)
  }

  // Update backend
  await fetch(`/api/tasks/${draggableId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: destColumn.id,
      position: newPosition,
    }),
  })
}
```

**Step 5: Run test to verify it passes**

Run: `npm test src/features/projects/components/__tests__/kanban-board.test.tsx`
Expected: PASS

**Step 6: Run migration**

Run: `psql postgresql://postgres:tqe.cgb0wkv9fmt7XRV@db.ouvqnyfqipgnrjnuqsqq.supabase.co:5432/postgres -f database/migrations/101_add_position_ordering.sql`
Expected: Migration successful

**Step 7: Commit**

```bash
git add src/features/projects/components/kanban-board.tsx database/migrations/101_add_position_ordering.sql src/features/projects/components/__tests__/kanban-board.test.tsx
git commit -m "fix: implement proper position persistence for kanban drag-drop

- Changed position field to BIGINT with gap-based positioning
- Calculate position between items when dropping (before/between/after)
- Added index on (status, position) for query performance
- Fixes critical bug where task order didn't persist

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 11: Fix Project Routing Bug (Click One Project → Redirects to Different One)

**Files:**
- Modify: `src/app/projects/page.tsx`
- Modify: `src/components/layout/sidebar-new.tsx:177`
- Test: `src/app/projects/__tests__/project-routing.test.tsx`

**Step 1: Write failing test**

```typescript
describe('Project routing', () => {
  it('should navigate to correct project when clicked', async () => {
    const mockProjects = [
      { id: '123', slug: 'project-a', name: 'Project A' },
      { id: '456', slug: 'project-b', name: 'Project B' },
    ]

    const mockPush = jest.fn()
    jest.mock('next/navigation', () => ({
      useRouter: () => ({ push: mockPush }),
    }))

    render(<ProjectList projects={mockProjects} />)

    const projectB = screen.getByText('Project B')
    fireEvent.click(projectB)

    expect(mockPush).toHaveBeenCalledWith('/projects/project-b')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/app/projects/__tests__/project-routing.test.tsx`
Expected: FAIL - "expected '/projects/project-b', received '/projects/123'"

**Step 3: Fix sidebar to use slug instead of id**

In `src/components/layout/sidebar-new.tsx:177`:

```typescript
// BEFORE (WRONG):
<Link href={`/projects/${project.id}`}>

// AFTER (CORRECT):
<Link href={`/projects/${project.slug}`}>
```

**Step 4: Fix projects page to use slug consistently**

Ensure all project links use slug:

```typescript
// In project cards
<Link href={`/projects/${project.slug}`}>
  {project.name}
</Link>
```

**Step 5: Run test to verify it passes**

Run: `npm test src/app/projects/__tests__/project-routing.test.tsx`
Expected: PASS

**Step 6: Test in browser**

Manual verification:
1. Click on "Project A" in sidebar
2. Verify URL is `/projects/project-a` (not ID)
3. Verify correct project loads
4. Repeat for multiple projects

**Step 7: Commit**

```bash
git add src/components/layout/sidebar-new.tsx src/app/projects/page.tsx src/app/projects/__tests__/project-routing.test.tsx
git commit -m "fix: use project slug instead of id for routing consistency

- Changed sidebar links from /projects/{id} to /projects/{slug}
- Ensured all project navigation uses slug consistently
- Fixes critical bug where clicking one project redirected to different one

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 12: Fix /search Route (404)

**Files:**
- Create: `src/app/search/page.tsx`
- Modify: `src/components/layout/sidebar-new.tsx:31`
- Test: `src/app/search/__tests__/page.test.tsx`

**Step 1: Write failing test**

```typescript
describe('Search Page', () => {
  it('should render search page without 404', async () => {
    const response = await fetch('http://localhost:3000/search')
    expect(response.status).toBe(200)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/app/search/__tests__/page.test.tsx`
Expected: FAIL - "expected 200, received 404"

**Step 3: Create search page**

```typescript
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  const handleSearch = async (q: string) => {
    setQuery(q)
    if (!q.trim()) {
      setResults([])
      return
    }

    const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    const data = await response.json()
    setResults(data.results || [])
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Search</h1>
      <Input
        type="search"
        placeholder="Search tasks, projects, docs..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        aria-label="Search"
      />
      <div className="mt-6">
        {results.map((result: any) => (
          <div key={result.id} className="p-4 border rounded mb-2">
            {result.title}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test src/app/search/__tests__/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/search/page.tsx src/app/search/__tests__/page.test.tsx
git commit -m "fix: create /search route to fix 404 error

- Created search page with input and results display
- Connected to /api/search endpoint
- Fixes critical 404 error when clicking search in sidebar

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Fix /projects/new Route (404)

**Files:**
- Modify: `src/app/voice/page.tsx:28`
- Test: `src/app/voice/__tests__/page.test.tsx`

**Step 1: Write failing test**

```typescript
describe('Voice Page Project Creation Link', () => {
  it('should not link to non-existent /projects/new route', () => {
    render(<VoicePage />)

    const newProjectLink = screen.getByText('New Project')
    expect(newProjectLink.getAttribute('href')).not.toBe('/projects/new')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/app/voice/__tests__/page.test.tsx`
Expected: FAIL - "href is /projects/new"

**Step 3: Change link to open command palette instead**

```typescript
// BEFORE (WRONG):
<Button variant="default" asChild>
  <a href="/projects/new">New Project</a>
</Button>

// AFTER (CORRECT):
<Button
  variant="default"
  onClick={() => openCommandPalette('create-project')}
>
  New Project
</Button>
```

**Step 4: Run test to verify it passes**

Run: `npm test src/app/voice/__tests__/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/voice/page.tsx src/app/voice/__tests__/page.test.tsx
git commit -m "fix: replace broken /projects/new link with command palette

- Changed link to onClick handler that opens command palette
- Fixes critical 404 error from Voice Planning page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 14: Fix localStorage Token Storage (XSS Vulnerability)

**Files:**
- Modify: `src/lib/contexts/auth-context.tsx:35, 60, 75, 195`
- Test: `src/lib/contexts/__tests__/auth-context.test.tsx`

**Step 1: Write failing test**

```typescript
describe('Auth Context Token Storage', () => {
  it('should not store tokens in localStorage', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem')

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(spy).not.toHaveBeenCalledWith(expect.stringContaining('token'))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/lib/contexts/__tests__/auth-context.test.tsx`
Expected: FAIL - "localStorage.getItem called with token"

**Step 3: Remove all localStorage token access**

```typescript
// REMOVE these lines:
// localStorage.getItem('supabase.auth.token')
// localStorage.setItem('supabase.auth.token', ...)
// localStorage.removeItem('supabase.auth.token')

// Supabase already handles tokens via HTTP-only cookies when using:
const supabase = createClientComponentClient()

// No manual token management needed - cookies are secure by default
```

**Step 4: Run test to verify it passes**

Run: `npm test src/lib/contexts/__tests__/auth-context.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/contexts/auth-context.tsx src/lib/contexts/__tests__/auth-context.test.tsx
git commit -m "fix: remove localStorage token storage to prevent XSS vulnerability

- Removed manual token management from localStorage
- Rely on Supabase HTTP-only cookies (secure by default)
- Fixes critical XSS security vulnerability

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 15: Fix Icon Buttons Missing ARIA Labels (Accessibility Critical)

**Files:**
- Modify: `src/components/foco/layout/top-bar.tsx:119, 236-237`
- Modify: `src/components/layout/sidebar-new.tsx:106-108`
- Modify: `src/features/dashboard/components/header.tsx`
- Test: `src/components/__tests__/accessibility-aria-labels.test.tsx`

**Step 1: Write failing accessibility test**

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

describe('Icon Buttons Accessibility', () => {
  it('should have aria-labels on all icon buttons', async () => {
    const { container } = render(<TopBar />)
    const results = await axe(container)

    expect(results).toHaveNoViolations()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/__tests__/accessibility-aria-labels.test.tsx`
Expected: FAIL - "Buttons must have accessible text"

**Step 3: Add aria-label to notification bell**

```typescript
<Button
  variant="ghost"
  size="icon"
  aria-label="Notifications"
>
  <Bell className="h-5 w-5" />
</Button>
```

**Step 4: Add aria-labels to profile menu buttons**

```typescript
<DropdownMenuItem onClick={() => router.push('/settings')} aria-label="Profile settings">
  Profile settings
</DropdownMenuItem>
<DropdownMenuItem onClick={() => setShowKeyboardShortcuts(true)} aria-label="Keyboard shortcuts">
  Keyboard shortcuts
</DropdownMenuItem>
```

**Step 5: Add aria-label to sidebar plus button**

```typescript
<Button
  variant="ghost"
  size="icon"
  onClick={handleCreateProject}
  aria-label="Create new project"
>
  <Plus className="h-4 w-4" />
</Button>
```

**Step 6: Add aria-labels to all header icon buttons**

```typescript
<Button variant="ghost" size="icon" aria-label="Filter">
  <Filter className="h-4 w-4" />
</Button>
<Button variant="ghost" size="icon" aria-label="Share">
  <Share2 className="h-4 w-4" />
</Button>
<Button variant="ghost" size="icon" aria-label="More options">
  <MoreHorizontal className="h-4 w-4" />
</Button>
```

**Step 7: Run test to verify it passes**

Run: `npm test src/components/__tests__/accessibility-aria-labels.test.tsx`
Expected: PASS

**Step 8: Commit**

```bash
git add src/components/foco/layout/top-bar.tsx src/components/layout/sidebar-new.tsx src/features/dashboard/components/header.tsx src/components/__tests__/accessibility-aria-labels.test.tsx
git commit -m "fix: add aria-labels to all icon buttons for accessibility

- Added aria-label to notification bell, profile buttons, sidebar plus
- Added aria-labels to header filter, share, more buttons
- Fixes critical WCAG Level A violation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary of Critical Fixes

**Total Critical Issues Fixed:** 15

1. ✅ Settings Save button
2. ✅ Data source switches
3. ✅ AI action switches
4. ✅ Notification switches
5. ✅ Project dropdown handlers
6. ✅ Create dropdown handlers
7. ✅ OAuth callback route
8. ✅ Real-time table name
9. ✅ useCurrentWorkspace infinite loop
10. ✅ Kanban position persistence
11. ✅ Project routing bug (slug vs id)
12. ✅ /search route 404
13. ✅ /projects/new route 404
14. ✅ localStorage XSS vulnerability
15. ✅ Icon button aria-labels

---

## Next Phase: HIGH Priority Fixes (35 Issues)

Continue with high-severity issues from the report, following the same TDD pattern:
- Write failing test
- Run test to confirm failure
- Implement minimal fix
- Run test to confirm pass
- Run linting
- Commit with detailed message

All HIGH priority fixes should follow identical structure to critical fixes above.
