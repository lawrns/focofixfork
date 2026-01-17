# Mobile Optimization Phase 3 Plan

**Date:** 2026-01-16
**Status:** Ready for implementation

## Problem Statement

Phase 2 addressed touch targets, settings page, dialogs, forms, and projects list. Phase 3 targets remaining polish issues visible in mobile screenshots:

1. Page header title truncation ("Dashboa..." instead of "Dashboard")
2. Dropdown menu items below 44px touch target minimum
3. Project card visual overflow and spacing issues
4. View Archived button placement and integration
5. Card visual hierarchy inconsistencies

## Reference: Mobile UI Best Practices (2025)

- Touch targets: 44-48px minimum (Apple HIG/Material Design)
- Spacing between targets: 8dp minimum
- Card spacing: 16-24px between cards
- Menu items: Need vertical spacing for fingers, not precision pointers
- iOS 8-point grid system, generous white space

## Implementation Agents

### Agent 1: Page Header Mobile Fix
**Scope:** Fix title truncation and header layout on mobile

**Files:**
- `src/components/layout/page-header.tsx`

**Changes:**
- Remove `truncate` class on mobile, allow wrapping or use smaller text
- Stack title/subtitle vertically on mobile with actions below
- Use `text-xl sm:text-2xl` for responsive title size
- Flex-wrap the actions row on mobile

### Agent 2: Dropdown Menu Touch Targets
**Scope:** Increase dropdown menu item touch targets

**Files:**
- `src/components/ui/dropdown-menu.tsx`

**Changes:**
- DropdownMenuItem: `py-1.5` → `py-2.5 [@media(pointer:coarse)]:py-3`
- DropdownMenuSeparator: Increase `my-1` → `my-2`
- Add `min-h-[44px]` on touch devices
- Increase icon spacing with `gap-2.5`

### Agent 3: Project Card Polish
**Scope:** Fix card overflow and improve visual hierarchy

**Files:**
- `src/app/projects/ProjectsPageClient.tsx` (ProjectCard, ProjectRow)
- `src/features/projects/components/project-card.tsx`

**Changes:**
- Progress bar: Add `overflow-hidden` to container, use `rounded-full`
- Card spacing: Consistent `p-4` padding on mobile
- Badge layout: Move status/progress to consistent positions
- Remove orphaned elements, improve grouping

### Agent 4: Dashboard Mobile Layout
**Scope:** Fix View Archived button and overall dashboard layout

**Files:**
- `src/app/dashboard/DashboardPageClient.tsx`
- `src/features/projects/components/ProjectTable.tsx`

**Changes:**
- View Archived: Move into filter dropdown or tab area
- Toolbar: Ensure proper stacking on mobile
- Empty states: Better mobile proportions

### Agent 5: Card Visual Consistency
**Scope:** Ensure consistent card appearance across mobile views

**Files:**
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/progress.tsx`

**Changes:**
- Card: Ensure `overflow-hidden` for all content
- Badge: Consistent sizing on mobile
- Progress: Constrained width, no overflow

## Success Criteria

1. Page titles fully visible on 375px screens
2. All dropdown menu items >= 44px touch target
3. No visual overflow on project cards
4. View Archived integrated into UI flow
5. Consistent card appearance across app
6. All lint checks pass

## Sources

- [Mobile App UI Design Best Practices 2025](https://www.thedroidsonroids.com/blog/mobile-app-ui-design-guide)
- [Mobile Spacing Rules](https://thisisglance.com/learning-centre/what-spacing-rules-create-better-mobile-app-layouts)
- [Touch Target Guidelines](https://garanord.md/touch-target-optimization-designing-finger-friendly-interfaces-for-mobile-devices/)
