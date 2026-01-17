# Mobile Optimization Phase 2 Plan

**Date:** 2026-01-16
**Status:** Ready for implementation

## Problem Statement

Phase 1 addressed major mobile issues (bottom sheets, task detail, sidebars, kanban). Phase 2 targets remaining UI details:

1. Touch targets below 44px minimum throughout the app
2. Settings page with non-responsive sidebar and grids
3. Dialog/modal components not optimized for mobile
4. Form inputs not using mobile-optimized variants
5. Tab components lacking horizontal scroll indicators

## Implementation Agents

### Agent 1: Touch Target Fixes
**Scope:** Increase all interactive elements to 44px minimum

**Files:**
- `src/components/ui/checkbox.tsx` - Wrap in 44px touch area
- `src/components/ui/radio-group.tsx` - Wrap in 44px touch area
- `src/components/ui/dialog.tsx` - Increase close button size
- `src/app/inbox/page.tsx` - Fix h-8 w-8 buttons
- `src/app/my-work/page.tsx` - Fix h-7 w-7 buttons
- `src/app/people/page.tsx` - Fix h-8 w-8 buttons
- `src/app/timeline/page.tsx` - Fix h-8 w-8 buttons

**Pattern:**
- Remove explicit h-8 w-8 overrides, use default button sizes
- Add `min-h-[44px] min-w-[44px]` where needed
- Use `[@media(pointer:coarse)]` for touch devices

### Agent 2: Settings Page Mobile
**Scope:** Make settings page fully responsive

**Files:**
- `src/app/settings/page.tsx`

**Changes:**
- Sidebar: Hide on mobile, add hamburger menu
- Theme grid: `grid-cols-1 sm:grid-cols-3`
- Usage metrics: `grid-cols-1 md:grid-cols-3`
- Plan selection: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Members list: Stack on mobile

### Agent 3: Dialog & Popover Mobile
**Scope:** Optimize overlay components for mobile

**Files:**
- `src/components/ui/dialog.tsx` - Full-screen on mobile option
- `src/components/ui/popover.tsx` - Responsive width
- `src/components/ui/tooltip.tsx` - Touch-friendly tooltips
- `src/components/foco/layout/command-palette.tsx` - Mobile layout

**Changes:**
- Dialog: Add `fullScreenOnMobile` prop
- Popover: Remove fixed w-72, use max-w-[calc(100vw-2rem)]
- Tooltip: Long-press to show on mobile
- Command palette: Full-screen on mobile with larger touch targets

### Agent 4: Form Input Mobile
**Scope:** Use mobile-optimized form components consistently

**Files:**
- `src/app/tasks/new/page.tsx` - Use MobileFormField, MobileSelect
- `src/components/ui/input.tsx` - Add min-h-[48px] on mobile
- `src/components/ui/textarea.tsx` - Add auto-resize, mobile padding
- `src/components/ui/select.tsx` - Add native select fallback on mobile

**Changes:**
- Audit all form usage and swap to mobile components
- Add inputMode attributes where appropriate
- Ensure 48px minimum height on all inputs

### Agent 5: Projects List Mobile
**Scope:** Fix horizontal overflow in projects list view

**Files:**
- `src/app/projects/ProjectsPageClient.tsx`

**Changes:**
- Toolbar: `flex-col sm:flex-row` stacking
- Sort dropdown: `w-full sm:w-[160px]`
- List header: Hide columns on mobile, show in card expansion
- ProjectRow: Mobile card layout instead of fixed-width columns

## Success Criteria

1. All touch targets >= 44px on mobile
2. Settings page works on 375px screens
3. Dialogs go full-screen on mobile when appropriate
4. Forms use native mobile inputs
5. Projects list has no horizontal scroll on mobile
6. All lint checks pass
