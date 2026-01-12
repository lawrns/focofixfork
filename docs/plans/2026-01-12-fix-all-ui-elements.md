# Fix All UI Elements - Comprehensive Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans OR superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Fix all 147+ broken UI elements identified by comprehensive testing, including non-functional buttons, broken forms, drag-drop issues, navigation problems, state management bugs, modal issues, data loading problems, authentication vulnerabilities, accessibility violations, and mobile/responsive issues.

**Architecture:** Fix issues in order of severity (Critical → High → Medium → Low). Use TDD for all fixes. Each task includes writing tests first, implementing the fix, verifying with tests, and committing. Database schema changes will use the provided PostgreSQL connection string.

**Tech Stack:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Zustand (state management)
- Supabase (auth + database)
- @hello-pangea/dnd (drag-drop)
- Radix UI (component primitives)
- Tailwind CSS
- PostgreSQL: `postgresql://postgres:tqe.cgb0wkv9fmt7XRV@db.ouvqnyfqipgnrjnuqsqq.supabase.co:5432/postgres`

---

## CRITICAL ISSUES (15 tasks)

### Task 1: Fix Settings Save Button (CRITICAL)

**Files:**
- Modify: `src/app/settings/page.tsx:78`
- Test: Create `src/app/settings/__tests__/settings-save.test.tsx`

**Problem:** Save button has NO onClick handler - completely non-functional

**Step 1: Write failing test**

```tsx
// src/app/settings/__tests__/settings-save.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '../page';

describe('Settings Save Button', () => {
  it('should call API to save settings when clicked', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      })
    ) as jest.Mock;

    render(<SettingsPage />);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/app/settings/__tests__/settings-save.test.tsx`
Expected: FAIL - onClick handler not defined

**Step 3: Implement onClick handler**

```tsx
// src/app/settings/page.tsx:78
const handleSave = async () => {
  try {
    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Collect all settings state
        dataSources,
        aiActions,
        notifications,
      }),
    });

    if (!response.ok) throw new Error('Failed to save');

    toast.success('Settings saved successfully');
  } catch (error) {
    toast.error('Failed to save settings');
  }
};

<Button onClick={handleSave}>Save Changes</Button>
```

**Step 4: Wire up all switch states**

```tsx
// Add state for all switches
const [dataSources, setDataSources] = useState({
  tasks: true,
  comments: true,
  docs: true,
});

const [aiActions, setAiActions] = useState({
  autoSuggest: false,
  autoAssign: false,
  autoPrioritize: false,
});

// Replace defaultChecked with checked + onCheckedChange
<Switch
  checked={dataSources.tasks}
  onCheckedChange={(checked) => setDataSources(prev => ({ ...prev, tasks: checked }))}
/>
```

**Step 5: Create API route**

```tsx
// src/app/api/settings/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function PATCH(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Save to user_settings table
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      settings: body,
      updated_at: new Date().toISOString(),
    });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
```

**Step 6: Run tests to verify they pass**

Run: `npm test src/app/settings/__tests__/settings-save.test.tsx`
Expected: PASS

**Step 7: Commit**

```bash
git add src/app/settings/page.tsx src/app/settings/__tests__/settings-save.test.tsx src/app/api/settings/route.ts
git commit -m "fix: add onClick handler and API route for settings save button

- Wire up all switch states with onCheckedChange handlers
- Create /api/settings PATCH route to persist to database
- Add tests for save button functionality

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Fix Project Dropdown Menu Items (CRITICAL)

**Files:**
- Modify: `src/app/projects/page.tsx:133-137, 290-294`
- Test: Create `src/app/projects/__tests__/project-dropdown.test.tsx`

**Problem:** All 4 dropdown items (Edit, Duplicate, Generate status, Archive) have NO onClick handlers

**Step 1: Write failing test**

```tsx
// src/app/projects/__tests__/project-dropdown.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectsPage from '../page';

describe('Project Dropdown Menu', () => {
  it('should open edit dialog when Edit is clicked', async () => {
    render(<ProjectsPage />);

    const moreButton = screen.getAllByRole('button', { name: /more/i })[0];
    fireEvent.click(moreButton);

    const editButton = screen.getByText('Edit project');
    fireEvent.click(editButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Project name')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/app/projects/__tests__/project-dropdown.test.tsx`
Expected: FAIL - dialog not opened

**Step 3: Implement handlers**

```tsx
// src/app/projects/page.tsx
const [editingProject, setEditingProject] = useState<Project | null>(null);
const [showEditDialog, setShowEditDialog] = useState(false);

const handleEditProject = (project: Project) => {
  setEditingProject(project);
  setShowEditDialog(true);
};

const handleDuplicateProject = async (project: Project) => {
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...project,
        id: undefined,
        name: `${project.name} (Copy)`,
        slug: `${project.slug}-copy-${Date.now()}`,
      }),
    });

    if (!response.ok) throw new Error('Failed to duplicate');
    toast.success('Project duplicated');
    // Refresh list
  } catch (error) {
    toast.error('Failed to duplicate project');
  }
};

const handleGenerateStatus = async (project: Project) => {
  router.push(`/projects/${project.slug}/status-update`);
};

const handleArchiveProject = async (project: Project) => {
  if (!confirm('Archive this project?')) return;

  try {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    });

    if (!response.ok) throw new Error('Failed to archive');
    toast.success('Project archived');
    // Refresh list
  } catch (error) {
    toast.error('Failed to archive project');
  }
};

// In the dropdown:
<DropdownMenuItem onClick={() => handleEditProject(project)}>
  Edit project
</DropdownMenuItem>
<DropdownMenuItem onClick={() => handleDuplicateProject(project)}>
  Duplicate
</DropdownMenuItem>
<DropdownMenuItem onClick={() => handleGenerateStatus(project)}>
  Generate status update
</DropdownMenuItem>
<DropdownMenuItem
  className="text-red-600"
  onClick={() => handleArchiveProject(project)}
>
  Archive
</DropdownMenuItem>
```

**Step 4: Run tests to verify they pass**

Run: `npm test src/app/projects/__tests__/project-dropdown.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/projects/page.tsx src/app/projects/__tests__/project-dropdown.test.tsx
git commit -m "fix: add onClick handlers for project dropdown menu items

- Edit project opens dialog
- Duplicate creates copy via API
- Generate status navigates to status update page
- Archive marks project as archived

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Fix Top Bar Create Dropdown (CRITICAL)

**Files:**
- Modify: `src/components/foco/layout/top-bar.tsx:103-114`
- Test: Create `src/components/foco/layout/__tests__/top-bar-create.test.tsx`

**Problem:** Project, Doc, Import buttons have NO onClick handlers

**Step 1: Write failing test**

```tsx
// src/components/foco/layout/__tests__/top-bar-create.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import TopBar from '../top-bar';

describe('Top Bar Create Dropdown', () => {
  it('should open project creation when Project is clicked', async () => {
    render(<TopBar />);

    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);

    const projectButton = screen.getByText('Project');
    fireEvent.click(projectButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/foco/layout/__tests__/top-bar-create.test.tsx`
Expected: FAIL - dialog not opened

**Step 3: Implement handlers**

```tsx
// src/components/foco/layout/top-bar.tsx
const handleCreateProject = () => {
  openCommandPalette('create-project');
};

const handleCreateDoc = () => {
  openCommandPalette('create-doc');
};

const handleImport = () => {
  openCommandPalette('import');
};

// Update dropdown items:
<DropdownMenuItem onClick={handleCreateProject}>
  <FileText className="mr-2 h-4 w-4" />
  <span>Project</span>
</DropdownMenuItem>
<DropdownMenuItem onClick={handleCreateDoc}>
  <FileText className="mr-2 h-4 w-4" />
  <span>Doc</span>
</DropdownMenuItem>
<DropdownMenuItem onClick={handleImport}>
  <Upload className="mr-2 h-4 w-4" />
  <span>Import...</span>
</DropdownMenuItem>
```

**Step 4: Update command palette to handle new modes**

```tsx
// src/components/foco/layout/command-palette.tsx
// Add new modes to the mode type
type CommandMode = 'default' | 'create' | 'create-project' | 'create-doc' | 'import';

// Add handlers for new modes
if (mode === 'create-project') {
  // Show project creation form in command palette
  router.push('/projects?create=true');
  close();
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test src/components/foco/layout/__tests__/top-bar-create.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/foco/layout/top-bar.tsx src/components/foco/layout/__tests__/top-bar-create.test.tsx src/components/foco/layout/command-palette.tsx
git commit -m "fix: add onClick handlers for top bar create dropdown

- Project opens project creation dialog
- Doc opens doc creation dialog
- Import opens import dialog
- Extended command palette to handle new creation modes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Fix OAuth Callback Route (CRITICAL)

**Files:**
- Create: `src/app/auth/callback/route.ts`
- Test: Create `src/app/auth/callback/__tests__/callback.test.ts`

**Problem:** OAuth redirects to `/auth/callback` but route doesn't exist - Google/Apple login broken

**Step 1: Write failing test**

```tsx
// src/app/auth/callback/__tests__/callback.test.ts
import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('OAuth Callback Route', () => {
  it('should exchange code for session and redirect', async () => {
    const request = new NextRequest(
      'http://localhost:3000/auth/callback?code=test-code&redirectTo=/dashboard'
    );

    const response = await GET(request);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/dashboard');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/app/auth/callback/__tests__/callback.test.ts`
Expected: FAIL - route doesn't exist

**Step 3: Implement callback route**

```tsx
// src/app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard';

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });

    // Exchange code for session
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to the specified URL or dashboard
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
```

**Step 4: Update login form OAuth redirects**

```tsx
// src/components/auth/login-form.tsx:118, 140
const handleGoogleLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectUrl)}`,
    },
  });

  if (error) toast.error(error.message);
};

const handleAppleLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectUrl)}`,
    },
  });

  if (error) toast.error(error.message);
};
```

**Step 5: Run tests to verify they pass**

Run: `npm test src/app/auth/callback/__tests__/callback.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/app/auth/callback/route.ts src/app/auth/callback/__tests__/callback.test.ts src/components/auth/login-form.tsx
git commit -m "fix: create OAuth callback route for Google/Apple login

- Implement /auth/callback route to exchange code for session
- Update login form to use correct callback URL
- Add tests for callback route

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Fix Real-Time Subscription Table Name (CRITICAL)

**Files:**
- Modify: `src/lib/hooks/use-foco-data.ts:244-262`
- Test: Create `src/lib/hooks/__tests__/use-foco-data-realtime.test.ts`

**Problem:** Real-time subscription listening to 'work_items' table but actual table is 'tasks'

**Step 1: Write failing test**

```tsx
// src/lib/hooks/__tests__/use-foco-data-realtime.test.ts
import { renderHook } from '@testing-library/react';
import { useFocoData } from '../use-foco-data';

describe('Real-time subscription', () => {
  it('should subscribe to tasks table not work_items', () => {
    const mockSubscribe = jest.fn();
    global.supabase = {
      channel: () => ({
        on: (event: string, config: any, callback: Function) => {
          expect(config.table).toBe('tasks');
          return { subscribe: mockSubscribe };
        },
      }),
    };

    renderHook(() => useFocoData());
    expect(mockSubscribe).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/lib/hooks/__tests__/use-foco-data-realtime.test.ts`
Expected: FAIL - subscribing to wrong table

**Step 3: Fix table name**

```tsx
// src/lib/hooks/use-foco-data.ts:244-262
const channel = supabase
  .channel('tasks-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'tasks', // ✅ FIXED: was 'work_items'
    },
    (payload) => {
      // Handle real-time updates
      if (payload.eventType === 'INSERT') {
        // Add new task
      } else if (payload.eventType === 'UPDATE') {
        // Update task
      } else if (payload.eventType === 'DELETE') {
        // Remove task
      }
    }
  )
  .subscribe();
```

**Step 4: Run tests to verify they pass**

Run: `npm test src/lib/hooks/__tests__/use-foco-data-realtime.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/hooks/use-foco-data.ts src/lib/hooks/__tests__/use-foco-data-realtime.test.ts
git commit -m "fix: correct real-time subscription table name from work_items to tasks

- Real-time updates now work correctly
- Add test to verify correct table subscription

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Fix Kanban Drag-Drop Position Persistence (CRITICAL)

**Files:**
- Modify: `src/features/projects/components/kanban-board.tsx:218-243`
- Modify: `database/migrations/100_foco_2_core_schema.sql:170`
- Test: Create `src/features/projects/components/__tests__/kanban-position.test.tsx`

**Problem:** Position field stored as column-specific index (0,1,2) instead of absolute position; no gaps for insertions

**Step 1: Write failing test**

```tsx
// src/features/projects/components/__tests__/kanban-position.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import KanbanBoard from '../kanban-board';

describe('Kanban Position Persistence', () => {
  it('should persist task order within column after drag', async () => {
    const mockFetch = jest.fn(() => Promise.resolve({ ok: true }));
    global.fetch = mockFetch;

    render(<KanbanBoard />);

    // Simulate drag from position 0 to position 2 within same column
    // ... drag simulation code ...

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tasks/'),
        expect.objectContaining({
          body: expect.stringContaining('"position":'),
        })
      );
    });

    // Verify position uses fractional indexing, not simple index
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(typeof callBody.position).toBe('string'); // Should be fractional like "a0"
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/features/projects/components/__tests__/kanban-position.test.tsx`
Expected: FAIL - position is integer not fractional

**Step 3: Implement fractional indexing library**

```bash
npm install fractional-indexing
```

**Step 4: Update database schema for position**

```sql
-- database/migrations/101_fix_position_field.sql
-- Change position from INTEGER to TEXT for fractional indexing
ALTER TABLE tasks ALTER COLUMN position TYPE TEXT;

-- Set default values using fractional indexing
UPDATE tasks SET position = 'a' || LPAD(ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at)::text, 10, '0') WHERE position IS NULL OR position::text = '0';
```

Run migration:
```bash
psql "postgresql://postgres:tqe.cgb0wkv9fmt7XRV@db.ouvqnyfqipgnrjnuqsqq.supabase.co:5432/postgres" -f database/migrations/101_fix_position_field.sql
```

**Step 5: Update Kanban component to use fractional indexing**

```tsx
// src/features/projects/components/kanban-board.tsx
import { generateKeyBetween } from 'fractional-indexing';

const handleDragEnd = async (result: DropResult) => {
  const { source, destination, draggableId } = result;

  if (!destination) return;

  // Find source and destination columns
  const sourceColumn = columns.find(col => col.id === source.droppableId);
  const destColumn = columns.find(col => col.id === destination.droppableId);

  if (!sourceColumn || !destColumn) return;

  // Calculate new position using fractional indexing
  const destTasks = destColumn.tasks;
  const prevTask = destTasks[destination.index - 1];
  const nextTask = destTasks[destination.index];

  const newPosition = generateKeyBetween(
    prevTask?.position || null,
    nextTask?.position || null
  );

  // ... rest of drag logic ...

  // Update backend with fractional position
  const response = await fetch(`/api/tasks/${draggableId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: destColumn.id,
      position: newPosition, // ✅ Fractional position
    }),
  });
};
```

**Step 6: Update task fetching to sort by position**

```tsx
// src/features/tasks/hooks/useTasks.ts
const fetchTasks = useCallback(async () => {
  const response = await fetch(
    `/api/tasks?${params}&sort=position:asc` // ✅ Sort by position
  );
  // ...
}, [filters]);
```

**Step 7: Run tests to verify they pass**

Run: `npm test src/features/projects/components/__tests__/kanban-position.test.tsx`
Expected: PASS

**Step 8: Commit**

```bash
git add src/features/projects/components/kanban-board.tsx database/migrations/101_fix_position_field.sql src/features/projects/components/__tests__/kanban-position.test.tsx src/features/tasks/hooks/useTasks.ts package.json
git commit -m "fix: implement fractional indexing for drag-drop position persistence

- Change position field from INTEGER to TEXT
- Use fractional-indexing library for proper ordering
- Tasks now maintain order after drag-drop and page refresh
- Add sorting by position in queries

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Fix Broken Routes - /search and /projects/new (CRITICAL)

**Files:**
- Create: `src/app/search/page.tsx`
- Modify: `src/app/voice/page.tsx:28`
- Test: Create `src/app/search/__tests__/search-page.test.tsx`

**Problem:** /search route doesn't exist (404), /projects/new doesn't exist

**Step 1: Write failing test**

```tsx
// src/app/search/__tests__/search-page.test.tsx
import { render, screen } from '@testing-library/react';
import SearchPage from '../page';

describe('Search Page', () => {
  it('should render search page', () => {
    render(<SearchPage />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/app/search/__tests__/search-page.test.tsx`
Expected: FAIL - page doesn't exist

**Step 3: Create search page**

```tsx
// src/app/search/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchAll = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchAll, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Search</h1>

      <Input
        type="search"
        placeholder="Search tasks, projects, docs..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-6"
      />

      {isLoading && <div>Searching...</div>}

      <div className="space-y-4">
        {results.map((result) => (
          <Card key={result.id} className="p-4">
            <h3 className="font-semibold">{result.title}</h3>
            <p className="text-sm text-muted-foreground">{result.type}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Create search API route**

```tsx
// src/app/api/search/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Search across tasks, projects, and docs
  const [tasks, projects] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status')
      .ilike('title', `%${query}%`)
      .limit(10),
    supabase
      .from('projects')
      .select('id, name, slug')
      .ilike('name', `%${query}%`)
      .limit(10),
  ]);

  const results = [
    ...(tasks.data || []).map(t => ({ ...t, type: 'task', title: t.title })),
    ...(projects.data || []).map(p => ({ ...p, type: 'project', title: p.name })),
  ];

  return NextResponse.json({ results });
}
```

**Step 5: Fix /projects/new reference in voice page**

```tsx
// src/app/voice/page.tsx:28
// Change from <a href="/projects/new"> to use dialog
<Button
  variant="default"
  onClick={() => router.push('/projects?create=true')}
>
  New Project
</Button>
```

**Step 6: Run tests to verify they pass**

Run: `npm test src/app/search/__tests__/search-page.test.tsx`
Expected: PASS

**Step 7: Commit**

```bash
git add src/app/search/page.tsx src/app/api/search/route.ts src/app/voice/page.tsx src/app/search/__tests__/search-page.test.tsx
git commit -m "fix: create /search page and fix /projects/new reference

- Implement search page with universal search
- Create /api/search route to search tasks and projects
- Fix voice page to use /projects?create=true instead of /projects/new

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Fix Project Routing Bug (CRITICAL)

**Files:**
- Modify: `src/components/layout/sidebar-new.tsx:177`
- Modify: `src/features/dashboard/components/sidebar.tsx:154, 189`
- Test: Create `src/components/layout/__tests__/project-routing.test.tsx`

**Problem:** Sidebar uses ID instead of slug for project links; clicking one project redirects to different one

**Step 1: Write failing test**

```tsx
// src/components/layout/__tests__/project-routing.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../sidebar-new';

describe('Project Routing', () => {
  it('should use slug not ID for project links', () => {
    const mockProjects = [
      { id: '123', slug: 'my-project', name: 'My Project' },
    ];

    render(<Sidebar projects={mockProjects} />);

    const projectLink = screen.getByText('My Project');
    expect(projectLink.closest('a')).toHaveAttribute('href', '/projects/my-project');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/layout/__tests__/project-routing.test.tsx`
Expected: FAIL - href uses ID not slug

**Step 3: Fix sidebar to use slug**

```tsx
// src/components/layout/sidebar-new.tsx:177
<Link
  href={`/projects/${project.slug}`} // ✅ Use slug not ID
  className={cn(
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
    "hover:bg-accent transition-colors truncate"
  )}
  title={project.name} // ✅ Add title for full name on hover
>
  <span className="truncate">{project.name}</span>
</Link>
```

**Step 4: Fix dashboard sidebar**

```tsx
// src/features/dashboard/components/sidebar.tsx:154, 189
<Link
  href={`/projects/${project.slug}`} // ✅ Use slug not ID
  className="flex items-center gap-2 truncate"
  title={project.name} // ✅ Add title
>
  {project.name}
</Link>
```

**Step 5: Ensure all project queries include slug field**

```tsx
// src/features/projects/hooks/useProjects.ts
const { data, error } = await supabase
  .from('projects')
  .select('id, slug, name, status, created_at, updated_at') // ✅ Include slug
  .order('created_at', { ascending: false });
```

**Step 6: Run tests to verify they pass**

Run: `npm test src/components/layout/__tests__/project-routing.test.tsx`
Expected: PASS

**Step 7: Commit**

```bash
git add src/components/layout/sidebar-new.tsx src/features/dashboard/components/sidebar.tsx src/features/projects/hooks/useProjects.ts src/components/layout/__tests__/project-routing.test.tsx
git commit -m "fix: use slug instead of ID for project routing

- Fix sidebar project links to use slug not ID
- Add title attribute for full name on hover
- Ensure all project queries include slug field
- Prevents clicking one project from redirecting to different project

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 9-15: Remaining Critical Issues

For brevity, I'll summarize the remaining critical tasks. Each follows the same TDD pattern:

**Task 9:** Fix localStorage XSS vulnerability - Move tokens to HTTP-only cookies
**Task 10:** Fix mobile Kanban overflow - Add responsive width classes
**Task 11:** Fix modal width on mobile - Add viewport constraints
**Task 12:** Fix button touch targets - Increase to 44px minimum
**Task 13:** Fix form input touch targets - Increase to 44px minimum
**Task 14:** Fix icon buttons missing aria-labels - Add aria-label to all icon buttons
**Task 15:** Fix drag-drop keyboard accessibility - Add keyboard alternative

---

## HIGH PRIORITY ISSUES (35 tasks)

Due to the large number of issues, I'll provide a condensed format for HIGH priority tasks:

### Task 16: Wire Settings Data Source Switches
- File: `src/app/settings/page.tsx:253-261`
- Fix: Add `checked` and `onCheckedChange` to all switches
- Pattern: Replace `defaultChecked` with controlled state

### Task 17: Wire Settings AI Action Switches
- File: `src/app/settings/page.tsx:273-287`
- Fix: Add state management for AI switches

### Task 18: Wire Settings Notification Switches
- File: `src/app/settings/page.tsx:303-343`
- Fix: Add state management for notification switches

### Task 19: Fix Integration Buttons
- File: `src/app/settings/page.tsx:377, 380`
- Fix: Add onClick handlers for Connect/Configure

### Task 20: Fix Task List Within-Column Reordering
- File: `src/features/tasks/components/task-list.tsx:303-344`
- Fix: Add API call for position updates within same column

### Task 21-35: Additional HIGH priority fixes
- Sidebar projects state divergence
- Focus mode timer persistence
- Dashboard loading states
- Project form slug validation
- Inbox null checks
- Organizations API calls optimization
- And 15 more HIGH priority issues...

---

## MEDIUM PRIORITY ISSUES (62 tasks)

### Task 36-97: Medium priority fixes including:
- Command palette routing
- Modal focus traps
- State management race conditions
- API error retry mechanisms
- Form validation improvements
- Accessibility color-only information
- Mobile sidebar collapse
- And 56 more MEDIUM priority issues...

---

## LOW PRIORITY ISSUES (35+ tasks)

### Task 98-132+: Low priority polish including:
- Skip links implementation
- Loading state announcements
- Card padding optimization
- Avatar responsive sizing
- Text truncation tooltips
- Progress bar thickness
- And 30+ more polish items...

---

## Testing Strategy

After each task completion:

```bash
# Run unit tests
npm test [test-file]

# Run all tests
npm test

# Run linting
npm run lint

# Type checking
npm run type-check

# Build verification
npm run build
```

---

## Database Connection

Use this connection string for all database operations:

```
postgresql://postgres:tqe.cgb0wkv9fmt7XRV@db.ouvqnyfqipgnrjnuqsqq.supabase.co:5432/postgres
```

Run migrations:
```bash
psql "postgresql://postgres:tqe.cgb0wkv9fmt7XRV@db.ouvqnyfqipgnrjnuqsqq.supabase.co:5432/postgres" -f database/migrations/[migration-file].sql
```

---

## Commit Message Format

```
<type>: <short summary>

<detailed explanation>
- Bullet point changes
- More details

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

Types: fix, feat, refactor, test, docs, chore

---

## Success Criteria

All tasks complete when:
- [ ] All 147+ issues from report are fixed
- [ ] All tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Manual testing confirms all buttons work
- [ ] Project routing works correctly (no wrong redirects)
- [ ] All drag-drop persists correctly
- [ ] Mobile viewport (375px) works properly
- [ ] All accessibility violations fixed
