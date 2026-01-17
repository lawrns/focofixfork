# Mobile-First Redesign Plan

**Date:** 2026-01-16
**Status:** Ready for implementation

## Problem Statement

Multiple UI components are not mobile-compatible:
- Task detail Inspector panel (`w-80` fixed width) causes vertical text rendering on mobile
- Sidebars (`w-64`) don't collapse on mobile
- Tables have `min-w-[900px]` causing horizontal overflow
- No swipe gestures for quick actions
- Desktop-first layouts don't adapt to mobile viewports

## Design Philosophy

**Core Principle:** On mobile, use bottom sheets for detail panels instead of side panels. Users' thumbs are at the bottom of the screen - put interactions there.

**Key Patterns:**
- No persistent sidebars on mobile - everything is full-screen or bottom sheet
- Swipe gestures for quick actions (complete, archive tasks)
- Card-based layouts replace tables on mobile
- Horizontal swipe for Kanban columns

## Screen Designs

### Task Detail Page

**Current:** Side-by-side layout with 320px Inspector panel
**Mobile:** Stacked layout with bottom sheet

```
┌─────────────────────────┐
│ ← Back     TASK-5735    │  ← Sticky header with task ID
├─────────────────────────┤
│                         │
│  Task Title             │  ← Full-width task content
│  Description...         │
│                         │
│  Subtasks               │
│  Comments               │
│                         │
├─────────────────────────┤
│ ● Next  │ Urgent │ Jan 15│  ← Sticky status bar (tap to expand)
└─────────────────────────┘
         ↓ swipe up
┌─────────────────────────┐
│ ─────  (drag handle)    │
│                         │
│ STATUS      ● Next    ▼ │  ← Bottom sheet with all fields
│ ASSIGNEE    LtB       ▼ │
│ PRIORITY    Urgent    ▼ │
│ DUE DATE    Jan 15    📅 │
│ LABELS      + Add       │
│                         │
│ [AI Actions Button]     │  ← AI actions at bottom of sheet
└─────────────────────────┘
```

**Snap Points:**
- 10% (peek): Status bar visible
- 50% (half): All metadata fields
- 90% (full): AI Actions section

### Sidebar & Navigation

**Current:** Fixed `w-64` sidebar always visible
**Mobile:** Full-screen slide-in from hamburger menu

```
┌─────────────────────────┐
│ ☰  Dashboard    🔍  👤  │  ← Header: hamburger, title, search, profile
├─────────────────────────┤
│                         │
│  [Task cards...]        │  ← Full-width content area
│                         │
├─────────────────────────┤
│ 🏠  📁  👥  📊  ⚙️      │  ← Bottom nav (existing)
└─────────────────────────┘
```

**Hamburger Menu → Full-screen overlay:**
```
┌─────────────────────────┐
│ ✕                       │
│                         │
│  Workspaces         ▼   │
│  ─────────────────────  │
│  📥 Inbox          12   │
│  📅 Today           3   │
│  📆 Upcoming        8   │
│  ─────────────────────  │
│  Projects               │
│    Marketing            │
│    Engineering          │
│  ─────────────────────  │
│  + New Project          │
└─────────────────────────┘
```

### Filters

**Current:** Fixed `w-64` QuickFiltersSidebar
**Mobile:** Bottom sheet triggered by filter icon

```
┌─────────────────────────┐
│ ─────  Filters     Clear│
│                         │
│ Status    [All ▼]       │
│ Priority  [All ▼]       │
│ Assignee  [All ▼]       │
│ Due Date  [Any ▼]       │
│                         │
│ [Apply Filters]         │
└─────────────────────────┘
```

### Tables → Card Lists

**Current:** `min-w-[900px]` tables with horizontal scroll
**Mobile:** Card-based lists

```
┌─────────────────────────┐
│ Projects           + ▼  │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ Marketing Website   │ │
│ │ 12 tasks • 3 overdue│ │
│ │ ●●●○○ 60% complete  │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Mobile App v2       │ │
│ │ 24 tasks • 0 overdue│ │
│ │ ●●●●○ 80% complete  │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Kanban → Horizontal Swipe

**Current:** All columns visible side-by-side
**Mobile:** Single column with swipe navigation

```
┌─────────────────────────┐
│ ← Backlog │ In Progress │  ← Swipeable column tabs
├─────────────────────────┤
│                         │
│  [Task Card]            │
│  [Task Card]            │
│  [Task Card]            │
│                         │
│      ● ○ ○ ○ ○          │  ← Column indicators
└─────────────────────────┘
```

### Task Card Swipe Actions

```
┌─────────────────────────────────────┐
│ ← [Complete] [Task Card] [Archive] →│
└─────────────────────────────────────┘
```
- Swipe right: Mark complete (green background)
- Swipe left: Archive/delete (red background)

## Technical Implementation

### Existing Primitives to Use
- `Sheet` component (Radix-based) - for slide-in overlays
- `useMobile()` hook - for responsive detection (768px breakpoint)
- `MobileDataCard` - for card-based layouts
- `MobileBottomNav` - existing bottom navigation
- Framer Motion - for animations and gestures

### New Components Needed
1. `MobileBottomSheet` - draggable bottom sheet with snap points
2. `MobileFiltersSheet` - filters as bottom sheet
3. `SwipeableTaskCard` - task card with swipe actions
4. `MobileKanban` - horizontal swipe column navigation

## Implementation Agents

### Agent 1: Bottom Sheet Foundation
**Scope:** Create reusable `MobileBottomSheet` component

**Files:**
- New: `src/components/ui/mobile-bottom-sheet.tsx`

**Requirements:**
- Snap points: configurable (default 10%, 50%, 90%)
- Drag handle at top
- Swipe up/down gestures via framer-motion
- Peek state with summary content slot
- Backdrop overlay (optional)
- Keyboard-aware (adjusts when keyboard opens)

**Implementation Notes:**
- Use `motion.div` with `drag="y"` and `dragConstraints`
- Use `useAnimation` for snap point transitions
- Spring animation: `stiffness: 300, damping: 30` (match existing)

### Agent 2: Task Detail Mobile View
**Scope:** Refactor task detail page for mobile

**Files:**
- Modify: `src/app/tasks/[id]/page.tsx`
- New: `src/app/tasks/[id]/mobile-task-detail.tsx` (optional extraction)

**Requirements:**
- Detect mobile via `useMobile()` hook
- Desktop: Keep current side-by-side layout
- Mobile: Stacked layout with bottom sheet
- Sticky header with back button and task ID
- Sticky status bar showing Status, Priority, Due Date
- Tap status bar or swipe up to open bottom sheet
- Bottom sheet contains all Inspector fields
- AI Actions section at bottom of sheet

**Implementation Notes:**
- Conditional render based on `isMobile`
- Extract Inspector content into reusable component
- Use new `MobileBottomSheet` component

### Agent 3: Sidebar & Navigation Mobile
**Scope:** Convert sidebars to mobile-friendly patterns

**Files:**
- Modify: `src/features/dashboard/components/sidebar.tsx`
- Modify: `src/components/filters/quick-filters-sidebar.tsx`
- New: `src/components/filters/mobile-filters-sheet.tsx`

**Requirements:**
- Sidebar: Full-screen overlay on mobile (use existing Sheet)
- Sidebar: Keep current behavior on desktop
- Filters: Bottom sheet on mobile
- Filters: Keep current sidebar on desktop
- Add filter icon button to trigger filters sheet
- Smooth transitions between states

**Implementation Notes:**
- Use `useMobile()` for conditional rendering
- Leverage existing `Sheet` component for sidebar overlay
- Use new `MobileBottomSheet` for filters

### Agent 4: Tables & Cards Mobile
**Scope:** Make tables responsive with card fallbacks

**Files:**
- Modify: `src/features/projects/components/ProjectTable.tsx`
- Audit: Any other files with `min-w-[` patterns

**Requirements:**
- Remove `min-w-[900px]` from ProjectTable
- Add mobile card view using `MobileDataCard` pattern
- Desktop: Keep table layout
- Mobile: Card list with key info visible
- Expandable cards for full details

**Implementation Notes:**
- Use `useMobile()` for conditional rendering
- Follow existing `ResponsiveTable` patterns
- Ensure touch targets >= 44px

### Agent 5: Kanban & Swipe Actions
**Scope:** Mobile Kanban and swipe-to-action

**Files:**
- Modify: `src/app/projects/[slug]/page.tsx` (or Kanban components)
- New: `src/components/ui/swipeable-task-card.tsx`
- New: `src/components/kanban/mobile-kanban.tsx`

**Requirements:**
- Kanban: Horizontal swipe between columns on mobile
- Kanban: Column indicator dots at bottom
- Kanban: Keep current layout on desktop
- Task cards: Swipe right to complete (green)
- Task cards: Swipe left to archive (red)
- Haptic feedback on action trigger (if available)

**Implementation Notes:**
- Use `motion.div` with `drag="x"` for swipe
- Use `useMotionValue` and `useTransform` for action reveal
- Threshold-based action trigger (swipe > 100px)
- Spring back animation on cancel

## Success Criteria

1. **Task detail page:** No vertical text, bottom sheet works smoothly
2. **Sidebars:** No fixed-width panels visible on mobile
3. **Tables:** No horizontal scroll, card layout on mobile
4. **Kanban:** Single column visible, swipe to navigate
5. **Swipe actions:** Complete/archive tasks with swipe gestures
6. **Performance:** Animations at 60fps, no jank
7. **Accessibility:** Touch targets >= 44px, proper focus management

## Testing Checklist

- [ ] iPhone SE (375px) - smallest common viewport
- [ ] iPhone 14 Pro (393px) - standard iPhone
- [ ] iPad Mini (768px) - breakpoint boundary
- [ ] Android (360px) - common Android size
- [ ] Landscape orientation
- [ ] With keyboard open
- [ ] VoiceOver/TalkBack compatibility
