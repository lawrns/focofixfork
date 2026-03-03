# Projects Page Styling Audit Report

## Executive Summary

This report documents all styling violations on the projects page (`/projects` → `/empire/missions`) compared to the established house style patterns used across the Foco application.

**Severity Levels:**
- 🔴 **Critical**: Breaks consistency significantly, user-facing issues
- 🟡 **Warning**: Inconsistent with house style but functional
- 🟢 **Minor**: Stylistic preference, low impact

---

## 1. Page Container (max-width, mx-auto, padding)

### House Style Pattern
**Correct Pattern (from `src/components/layout/page-shell.tsx` lines 25-56):**
```tsx
<PageShell maxWidth="7xl">
  {/* Content with density-aware spacing */}
</PageShell>
```
- Uses `max-w-7xl` (1280px max-width)
- Uses `mx-auto` for centering
- Uses density-aware vertical spacing (`space-y-6` for comfortable)

### Current Implementation
**File: `src/app/projects/ProjectsPageClient.tsx` lines 1044-1273:**
```tsx
<PageShell>  {/* No maxWidth prop, defaults to 7xl - OK */}
  {/* Content */}
</PageShell>
```

**Violation:** None - PageShell is correctly used ✅

**However, note:** The fallback loading state (lines 1022-1041) correctly uses PageShell.

---

## 2. Page Header Styling

### House Style Pattern
**Correct Pattern (from `src/components/layout/page-header.tsx` lines 32-83):**
```tsx
<PageHeader
  title="Projects"
  subtitle={`${projects.length} active projects`}
  primaryAction={
    <Button>
      <Plus className="h-4 w-4" />
      Create project
    </Button>
  }
/>
```
- Title: `text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-50`
- Subtitle: `text-sm text-zinc-500 mt-1`
- Layout: `flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4`

### Current Implementation
**File: `src/app/projects/ProjectsPageClient.tsx` lines 1046-1049:**
```tsx
<PageHeader
  title="Projects"
  subtitle={`${projects.length} active projects`}
/>
```

**File: `src/app/empire/missions/page.tsx` lines 29-35:**
```tsx
<ProjectsPageClient pageTitle="Projects" />
```

### Violations

🔴 **CRITICAL: Missing Primary Action in PageHeader**
- **Current:** PageHeader has no `primaryAction` prop
- **Should Be:** PageHeader should include the "New Project" button as primaryAction
- **Where:** `src/app/projects/ProjectsPageClient.tsx` line 1046-1049
- **Correct Pattern:** See `src/app/empire/missions/page.tsx` fallback (lines 7-27) which shows the correct pattern

🟡 **Warning: Toolbar Implementation Outside PageHeader**
- **Current:** Toolbar with search, sort, view toggle is implemented inline (lines 1052-1100)
- **Should Be:** Toolbar could be part of PageShell or integrated into header pattern
- **Note:** This is acceptable but inconsistent with pages like Dashboard that don't have toolbars

---

## 3. Content Area Layout (grid vs flex, gaps)

### House Style Pattern
**Correct Pattern (from `src/app/dashboard/page.tsx` fallback lines 12-20):**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
  {/* Cards */}
</div>
```
- Standard grid gap: `gap-6`

**Alternative Pattern (from `src/app/empire/page.tsx` lines 222-248):**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Content */}
</div>
```

### Current Implementation
**File: `src/app/projects/ProjectsPageClient.tsx` line 1104:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Violations

🟡 **Warning: Inconsistent Grid Gap**
- **Current:** `gap-4` (1rem / 16px)
- **Should Be:** `gap-6` (1.5rem / 24px) per house standard
- **Where:** Line 1104
- **Correct Pattern:** `src/app/dashboard/page.tsx` line 12

**Also in loading fallback (line 1035):**
- **Current:** `gap-4`
- **Should Be:** `gap-6`

---

## 4. Card/List Item Styling

### House Style Pattern
**Correct Pattern (from `src/components/ui/card.tsx` lines 9-41):**
```tsx
<Card variant="interactive" padding="md">
  {/* Content */}
</Card>
```
- Default: `bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800`
- Interactive: adds `hover:shadow-sm hover:border-zinc-200 dark:hover:border-zinc-700`
- Border radius: `rounded-lg`
- Padding: `p-6`

### Current Implementation
**File: `src/app/projects/ProjectsPageClient.tsx` lines 136-330 (ProjectCard):**
```tsx
<Link
  href={`/projects/${project.slug}`}
  className={cn(
    'block p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800',
    'hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all',
    'group overflow-hidden'
  )}
>
```

### Violations

🟡 **Warning: Non-Standard Card Implementation**
- **Current:** Custom Link component with manual card styling
- **Should Be:** Use `<Card variant="interactive">` component
- **Where:** `ProjectCard` function, lines 136-330
- **Issues:**
  1. Using `rounded-xl` instead of standard `rounded-lg`
  2. Using `border-zinc-200` instead of `border-zinc-100`
  3. Using custom padding `p-4 sm:p-5` instead of Card's default

🔴 **CRITICAL: Inconsistent Dark Mode Border Colors**
- **Current:** `border-zinc-800`
- **Should Be:** `border-zinc-100` (default card border in light), dark mode maps to `border-zinc-800`
- **Note:** The Card component uses `border-zinc-100 dark:border-zinc-800` - the projects page uses `border-zinc-200 dark:border-zinc-800` which is inconsistent

**File: `src/app/projects/ProjectsPageClient.tsx` lines 1118 (List View):**
```tsx
<div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
```
- Using `rounded-xl` instead of `rounded-lg`

---

## 5. Typography (font sizes, weights, colors)

### House Style Pattern
**Correct Pattern (from `src/components/layout/page-header.tsx` lines 42-48):**
```tsx
<h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
  {title}
</h1>
<div className="text-sm text-zinc-500 mt-1">
  {subtitle}
</div>
```

**Card Title Pattern (from `src/components/ui/card.tsx` lines 61-71):**
```tsx
<h3 className="text-xl font-bold leading-tight tracking-tight text-foreground">
```

### Current Implementation
**File: `src/app/projects/ProjectsPageClient.tsx` line 158:**
```tsx
<h3 className="font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
  {project.name}
</h3>
```

**Line 161:**
```tsx
<p className="text-xs text-zinc-500">
  Updated {formatRelativeDate(project.updatedAt)}
</p>
```

**Line 243:**
```tsx
<p className="text-sm text-zinc-500 mb-4 line-clamp-2">
  {project.description}
</p>
```

### Violations

🟡 **Warning: Inconsistent Text Colors in Dark Mode**
- **Current:** Uses `text-zinc-500` for secondary text
- **Should Be:** Could use `text-muted-foreground` for consistency
- **Where:** Lines 161, 243, 251, 262, etc.

🟡 **Warning: Non-Standard Hover Color**
- **Current:** `group-hover:text-indigo-600 dark:group-hover:text-indigo-400`
- **Should Be:** Use theme primary color if available, or standard zinc palette
- **Where:** Line 158

🟢 **Minor: Font Size Inconsistencies**
- Card titles don't specify font size (inherits)
- Should explicitly use `text-lg` or `text-base`

---

## 6. Button Styles (primary, secondary, ghost)

### House Style Pattern
**Correct Pattern (from `src/components/ui/button.tsx` lines 14-66):**
```tsx
// Primary (default)
<Button>
  <Plus className="h-4 w-4" />
  Create project
</Button>

// Secondary/Outline
<Button variant="outline">
  <Filter className="h-4 w-4" />
</Button>

// Ghost
<Button variant="ghost" size="icon">
  <MoreHorizontal className="h-4 w-4" />
</Button>
```

### Current Implementation
**File: `src/app/projects/ProjectsPageClient.tsx` lines 1077-1098:**
```tsx
<Button variant="outline" size="icon" className="shrink-0" onClick={() => toast.info('Project filtering coming soon')}>
  <Filter className="h-4 w-4" />
</Button>

<div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 shrink-0">
  <Button
    variant={view === 'grid' ? 'secondary' : 'ghost'}
    size="icon"
    className="h-8 w-8"
    onClick={() => setView('grid')}
  >
    <Grid3X3 className="h-4 w-4" />
  </Button>
  <Button
    variant={view === 'list' ? 'secondary' : 'ghost'}
    size="icon"
    className="h-8 w-8"
    onClick={() => setView('list')}
  >
    <List className="h-4 w-4" />
  </Button>
</div>
```

### Violations

🟡 **Warning: Custom Toggle Container**
- **Current:** Custom div with border containing toggle buttons
- **Should Be:** Use a Tabs component or standard segmented control
- **Where:** Lines 1081-1098

🔴 **CRITICAL: Missing Primary Action Button**
- **Current:** No "Create Project" button in the main UI
- **Should Be:** Primary button in PageHeader as per house style
- **Where:** Missing from lines 1046-1049
- **Note:** The create button only appears in the empty state and dialogs

---

## 7. Loading Skeleton Patterns

### House Style Pattern
**Correct Pattern (from `src/components/ui/skeleton.tsx` lines 8-38):**
```tsx
<Skeleton className="h-64 rounded-xl" />
```
- Uses `bg-gray-200 dark:bg-gray-800` via Skeleton component
- Animation: `animate-pulse` (default)

**Standard Pattern (from `src/app/dashboard/page.tsx` lines 5-23):**
```tsx
function DashboardFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```

### Current Implementation
**File: `src/app/projects/ProjectsPageClient.tsx` lines 1022-1041:**
```tsx
if (isLoading) {
  return (
    <PageShell>
      <PageHeader
        title={pageTitle}
        subtitle="Loading..."
        primaryAction={
          <Button disabled>
            <Plus className="h-4 w-4" />
            {buttons.createProject}
          </Button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </PageShell>
  );
}
```

### Violations

🟡 **Warning: Different Container Structure**
- **Current:** Uses PageShell/PageHeader with skeletons
- **Should Be:** Consistent with pattern, but PageHeader in loading state has primaryAction while main UI doesn't
- **Where:** Lines 1025-1034

🟢 **Minor: Skeleton Gap Inconsistency**
- **Current:** `gap-4`
- **Should Be:** `gap-6` to match grid content

**File: `src/app/empire/missions/page.tsx` lines 7-27:**
```tsx
function MissionsFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Button disabled>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```

🔴 **CRITICAL: Fallback Pattern Doesn't Match Actual Layout**
- **Current:** Fallback uses raw divs with manual styling
- **Should Be:** Fallback should use PageShell like the main component
- **Where:** `src/app/empire/missions/page.tsx` lines 9-25

---

## 8. Empty State Patterns

### House Style Pattern
**Correct Pattern (from `src/components/ui/empty-state-standard.tsx` lines 25-126):**
```tsx
<EmptyState
  icon={FolderKanban}
  title={emptyStates.projects.title}
  description={emptyStates.projects.description}
  primaryAction={{
    label: emptyStates.projects.primaryCta,
    onClick: handleCreate,
  }}
  size="lg"
/>
```
- Uses gradient icon background: `bg-gradient-to-br from-zinc-100 to-zinc-50`
- Icon styling: `p-3 rounded-full`
- Title: `text-xl font-semibold`
- Description: `text-base text-zinc-500`

### Current Implementation
**File: `src/app/projects/ProjectsPageClient.tsx` lines 1146-1161:**
```tsx
{sortedProjects.length === 0 && !search && currentWorkspaceId && (
  <ProjectEmptyState workspaceId={currentWorkspaceId} hasProjects={false} />
)}

{sortedProjects.length === 0 && search && (
  <EmptyState
    icon={FolderKanban}
    title={`No projects matching "${search}"`}
    description="Try a different search term"
    primaryAction={{
      label: 'Clear search',
      onClick: () => setSearch(''),
    }}
  />
)}
```

### Violations

🟡 **Warning: Using Custom ProjectEmptyState**
- **Current:** Uses `ProjectEmptyState` from features/delegation
- **Should Be:** Should use standardized `EmptyState` component or `ProjectsEmpty` from `src/components/empty-states/projects-empty.tsx`
- **Where:** Line 1147-1149

**File: `src/features/delegation/components/ProjectEmptyState.tsx` lines 13-58:**
```tsx
export function ProjectEmptyState({ workspaceId, hasProjects = false }: ProjectEmptyStateProps) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-6">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Welcome to AI-Powered Project Management</h1>
        {/* ... */}
      </div>
    </div>
  )
}
```

🔴 **CRITICAL: Empty State Doesn't Use Standardized Copy**
- **Current:** Hard-coded strings in ProjectEmptyState
- **Should Be:** Use `emptyStates.projects` from `src/lib/copy.ts`
- **Where:** `src/features/delegation/components/ProjectEmptyState.tsx` lines 20-23

🟡 **Warning: Empty State Has Custom Styling**
- **Current:** Custom gradient background, large heading
- **Should Be:** Match EmptyState component styling
- **Where:** Lines 17-24

---

## 9. Error State Patterns

### House Style Pattern
**Correct Pattern (from `src/lib/copy.ts` lines 117-145):**
```tsx
export const errors = {
  network: {
    title: 'Connection error',
    description: "Couldn't connect to the server...",
    action: 'Try again',
  },
  // ...
}
```

**Implementation Pattern (from various pages):**
```tsx
<div className="px-4 py-8 text-center text-sm text-muted-foreground">
  No active runs. Dispatch an agent to get started.
</div>
```

### Current Implementation
**File: `src/app/projects/ProjectsPageClient.tsx` - Error handling is in the fetch logic:**
```tsx
if (response.status === 401) {
  toast.error('Session expired. Please sign in again.');
} else if (response.status === 403) {
  toast.error('You do not have permission to access projects.');
} else {
  toast.error('Failed to load projects');
}
```

### Violations

🟡 **Warning: Error Handling Uses Toast Instead of Error State UI**
- **Current:** Errors show toast notifications only
- **Should Be:** Display an ErrorState component when data fails to load
- **Where:** Lines 700-706

🟡 **Warning: Error Messages Not from Copy Library**
- **Current:** Hard-coded error strings
- **Should Be:** Use `errors.network`, `errors.permission` from `src/lib/copy.ts`
- **Where:** Lines 701-705

---

## 10. Color Scheme Usage

### House Style Pattern
**Correct Pattern (from `src/components/ui/button.tsx` and other components):**
- Background: `bg-white dark:bg-zinc-900`
- Border light: `border-zinc-100` or `border-zinc-200`
- Border dark: `border-zinc-800` or `border-zinc-700`
- Text primary: `text-zinc-900 dark:text-zinc-50`
- Text secondary: `text-zinc-500` or `text-muted-foreground`
- Hover: `hover:bg-zinc-50 dark:hover:bg-zinc-800`

### Current Implementation Analysis

**File: `src/app/projects/ProjectsPageClient.tsx`**

| Element | Current | Should Be | Line |
|---------|---------|-----------|------|
| Card bg | `bg-white dark:bg-zinc-900` | ✅ Correct | 143 |
| Card border | `border-zinc-200 dark:border-zinc-800` | `border-zinc-100 dark:border-zinc-800` | 143 |
| Hover border | `hover:border-zinc-300 dark:hover:border-zinc-700` | ✅ Acceptable | 144 |
| Text primary | `text-zinc-900 dark:text-zinc-50` | ✅ Correct | 158 |
| Text secondary | `text-zinc-500` | ✅ Correct | 161 |
| Hover text | `group-hover:text-indigo-600` | Theme-dependent | 158 |
| List container bg | `bg-white dark:bg-zinc-900` | ✅ Correct | 1118 |
| List container border | `border-zinc-200 dark:border-zinc-800` | `border-zinc-100 dark:border-zinc-800` | 1118 |
| Row border | `border-zinc-100 dark:border-zinc-800` | ✅ Correct | 466 |
| Hover bg | `hover:bg-zinc-50 dark:hover:bg-zinc-800/50` | ✅ Correct | 467 |

### Violations

🟡 **Warning: Border Colors Inconsistent**
- **Current:** Cards use `border-zinc-200` in light mode
- **Should Be:** Cards use `border-zinc-100` in light mode (as per Card component)
- **Where:** Lines 143, 1118

🟡 **Warning: Non-Standard Accent Colors**
- **Current:** Uses `indigo-600` for hover states
- **Should Be:** Use theme primary color (likely teal/cyan based on CSS vars)
- **Where:** Line 158

---

## Summary of Violations

### Critical Issues (Must Fix)

1. **Missing Primary Action in PageHeader** (Line 1046-1049)
   - The "Create Project" button should be in PageHeader, not just in empty states

2. **Custom Empty State Instead of Standard Component** (Line 1147-1149)
   - Uses `ProjectEmptyState` instead of standard `EmptyState` or `ProjectsEmpty`
   - Hard-coded copy instead of using `emptyStates.projects` from copy library

3. **Fallback Pattern Doesn't Match Main Layout** (`src/app/empire/missions/page.tsx`)
   - Uses raw divs instead of PageShell component

4. **Error Handling Uses Toast Only** (Lines 700-706)
   - Should display ErrorState UI for failed data loads
   - Hard-coded error messages instead of copy library

### Warning Issues (Should Fix)

5. **Non-Standard Card Implementation** (Lines 136-330)
   - Custom Link with manual card styling instead of Card component
   - `rounded-xl` instead of `rounded-lg`
   - `border-zinc-200` instead of `border-zinc-100`

6. **Inconsistent Grid Gap** (Line 1104)
   - `gap-4` instead of `gap-6`

7. **Custom Toggle Container** (Lines 1081-1098)
   - Manual div with border instead of Tabs or segmented control component

8. **Non-Standard Hover Colors** (Line 158)
   - Uses `indigo-600` instead of theme colors

### Minor Issues (Nice to Fix)

9. **Typography Inconsistencies**
   - Uses `text-zinc-500` instead of `text-muted-foreground` in some places

10. **Loading State Gap Mismatch**
    - `gap-4` in skeleton should match content grid `gap-6`

---

## Recommended Action Plan

### Phase 1: Critical Fixes
1. Add `primaryAction` to PageHeader with "Create Project" button
2. Replace `ProjectEmptyState` with standard `EmptyState` component using copy library
3. Update error handling to use `ErrorState` component and copy library messages
4. Fix fallback in `empire/missions/page.tsx` to use PageShell

### Phase 2: Consistency Fixes
5. Update grid gaps from `gap-4` to `gap-6`
6. Standardize card borders to use `border-zinc-100`
7. Replace custom toggle with proper component or standardized pattern
8. Use theme colors instead of indigo for hover states

### Phase 3: Code Quality
9. Replace manual card styling with Card component
10. Use `text-muted-foreground` consistently
11. Ensure all copy comes from `src/lib/copy.ts`

---

## Reference Files

### House Style Sources:
- **PageShell/PageHeader:** `src/components/layout/page-shell.tsx`, `src/components/layout/page-header.tsx`
- **Card Component:** `src/components/ui/card.tsx`
- **Button Component:** `src/components/ui/button.tsx`
- **Empty State:** `src/components/ui/empty-state-standard.tsx`
- **Skeleton:** `src/components/ui/skeleton.tsx`
- **Copy Library:** `src/lib/copy.ts`

### Well-Implemented Reference Pages:
- **Dashboard:** `src/app/dashboard/page.tsx`, `src/app/dashboard/DashboardPageClient.tsx`
- **Empire:** `src/app/empire/page.tsx`
- **My Work:** `src/app/my-work/page.tsx` (uses PageShell correctly)

### Files Requiring Changes:
- `src/app/projects/ProjectsPageClient.tsx`
- `src/app/empire/missions/page.tsx`
- `src/features/delegation/components/ProjectEmptyState.tsx`
