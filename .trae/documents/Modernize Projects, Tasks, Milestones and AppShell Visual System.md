## Objectives
- Apply the upgraded visual system to Projects, Tasks, Milestones and shared AppShell elements.
- Standardize shadcn/ui primitives (Cards, Table, Tabs, Inputs) and Tailwind tokens; add tasteful motion.
- Ensure responsive, accessible layouts and clear AI interactions across pages.

## Targets & Changes
### 1) Projects List (`src/app/projects/page.tsx`)
- Replace legacy list with shadcn Table: sticky header, compact rows, sortable columns, filter chips.
- Header actions in a Card header: New, Import/Export, AI Create; motion fade-in for table region.
- Empty state using shadcn Card with call-to-action.

### 2) Project Detail (if present: `src/app/projects/[id]/page.tsx`)
- Split-pane layout: Overview (Card) left; Milestones/Tasks tabs right.
- Info badges: status, priority, due date; motion on tab switch.

### 3) Tasks Page (`src/app/tasks/page.tsx`)
- Tabs: List/Kanban using shadcn Tabs; list = Table with filters; kanban = dense cards with micro-interactions on drag.
- Edit/Create dialogs standardized with shadcn Dialog; Inputs and Textarea variants.

### 4) Milestones Page (`src/app/milestones/page.tsx`)
- Grid of milestone Cards with status chips and deadline badges; filter chips top.
- Motion on card mount and status updates; accessible keyboard navigation.

### 5) AppShell Enhancements
- Header: glass effect and balanced spacing; integrate SavedViews inside a Card section when on dashboard/projects.
- Sidebar: wider column, refined hover/active states, consistent icon opacity; count badges.
- Global container widths (`max-w-7xl`) and page paddings standardized.

### 6) Design System & Tokens
- Tailwind tokens: ensure brand primary (emerald), neutrals, semantic colors aligned; radius/shadow presets.
- shadcn variants: button sizes (sm/md/lg), card densities, input focus rings; table row densities.

### 7) Motion & Micro-Interactions
- Tab content `motion.div` transitions at 200ms; list/table mount stagger.
- Hover/tap micro-interactions on action buttons; skeleton shimmer for loading states.

### 8) Accessibility & Performance
- Contrast checks for badges/chips; keyboard nav for tabs, tables and dialogs.
- Dynamic imports for heavy views; modularize lucide icons; prefetch common routes.

### 9) Tests & Verification
- Visual snapshots for Projects/Tasks/Milestones with Playwright.
- Unit tests for table sorting/filtering and dialog interactions.
- E2E flows: project creation (standard + AI), milestone/task creation and edits.

### 10) SEO Signal Continuation
- JSON-LD: BreadcrumbList on Projects/Tasks/Milestones; canonical via metadata.

## Rollout & Safeguards
- Feature flag `ui_modernization` to gate new templates; gradual page-by-page migration.
- Smoke tests on each page; rollback via flag toggle if regressions.

## Acceptance Criteria
- Pages are visually consistent, responsive and accessible; motion is tasteful.
- Tables provide sort/filter; dialogs are standardized; tabs operate smoothly.
- Tests (unit/visual/e2e) pass; performance and SEO signals verified.