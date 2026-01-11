# Foco UI/UX Forensic Audit

**Date:** January 2026  
**Goal:** Upgrade from "basic/vibe-coded" to "Intercom-level" quality  

---

## Executive Summary

The Foco codebase has solid foundations but suffers from **inconsistency syndrome**: multiple layout systems, mixed styling approaches, incomplete design token adoption, and prototype-level polish. The path to Intercom-grade quality requires consolidation, not addition.

---

## Part 1: Critical Issues (Top 20 by Impact)

### 🔴 High Impact (Fix First)

| # | Issue | Files | Impact |
|---|-------|-------|--------|
| 1 | **Dual layout system** - `MainLayout` vs `AppShell` creates inconsistent shell experiences | `src/components/layout/MainLayout.tsx`, `src/components/foco/layout/app-shell.tsx` | Users see different navigation, headers, and spacing depending on route |
| 2 | **Route confusion** - Left-rail links to `/app/*` but most pages exist at root (`/dashboard`, `/projects`) | `src/components/foco/layout/left-rail.tsx` | Navigation doesn't work properly |
| 3 | **No unified page header pattern** - Each page implements its own header with different spacing, button placement | All page files | Inconsistent visual hierarchy |
| 4 | **Hardcoded mock data** - Many pages use local mock arrays instead of API data | `src/app/projects/page.tsx`, `src/app/inbox/page.tsx`, `src/app/people/page.tsx`, `src/app/my-work/page.tsx` | Features appear functional but don't persist |
| 5 | **Missing Command Palette implementation** - TopBar references it but search action doesn't work | `src/components/foco/layout/top-bar.tsx`, `src/components/foco/layout/command-palette.tsx` | Core navigation feature broken |

### 🟠 Medium Impact (Fix Second)

| # | Issue | Files | Impact |
|---|-------|-------|--------|
| 6 | **Empty states inconsistent** - Some pages have rich empty states, others have minimal text | Various pages | Inconsistent onboarding experience |
| 7 | **Typography scale not standardized** - Mix of `text-2xl font-semibold`, `text-lg font-bold`, arbitrary sizes | Global | Visual inconsistency |
| 8 | **Button hierarchy unclear** - Primary actions sometimes `default`, sometimes `outline` | Throughout | Users unsure what to click |
| 9 | **Card overuse** - Everything wrapped in Card even when not needed | `src/app/dashboard/page.tsx`, `src/app/milestones/page.tsx` | Visual clutter, too many borders |
| 10 | **Loading states inconsistent** - Some pages have skeletons, others spinners, some nothing | Various | Perceived performance varies |

### 🟡 Lower Impact (Polish Phase)

| # | Issue | Files | Impact |
|---|-------|-------|--------|
| 11 | **No toast/undo framework** - Actions complete silently or with basic alerts | Throughout | No feedback, no recovery |
| 12 | **Form copy is robotic** - "Enter project name", "Select organization (optional)" | Dialog forms | Feels like a prototype |
| 13 | **Keyboard shortcuts not functional** - Documented but not wired | `left-rail.tsx`, various | Power users frustrated |
| 14 | **Dark mode incomplete** - Some components use zinc, others use gray | `globals.css`, various components | Visual bugs in dark mode |
| 15 | **Mobile responsiveness gaps** - Some pages have responsive code, others don't | Various | Broken on small screens |
| 16 | **Icon usage inconsistent** - Sometimes icons alone, sometimes with labels, sizes vary | Throughout | No clear icon language |
| 17 | **Focus states generic** - All use same zinc-900 ring, no component differentiation | `globals.css` | Accessibility is functional but not polished |
| 18 | **Spacing tokens unused** - Design tokens defined but pages use arbitrary px/rem | `design-tokens.css` vs page files | Spacing feels random |
| 19 | **Helper text missing** - Forms lack explanatory text for fields | Dialog forms | Users guess at requirements |
| 20 | **Density setting partially implemented** - Toggle exists but doesn't affect all components | `src/lib/stores/foco-store.ts` | Feature incomplete |

---

## Part 2: Per-Page Analysis

### `/dashboard` (Dashboard Page)
**Primary Goal:** See overview of projects and work  
**Primary CTA:** Create Project  

**Issues:**
- ❌ Wrapped in unnecessary Card with CardHeader
- ❌ ViewTabs component loaded lazily but skeleton doesn't match final layout
- ❌ Import/Export buttons feel random (not grouped with primary actions)
- ❌ Mix of old MainLayout and new component patterns
- ❌ Multiple modals (New Project, AI Project) with different styles
- ⚠️ Tour auto-starts which can be jarring

**Fixes Needed:**
- Remove outer Card, use PageHeader pattern
- Group secondary actions in kebab menu
- Unify modal styling
- Make tour opt-in or checklist-based

---

### `/projects` (Projects Page)
**Primary Goal:** Browse and find projects  
**Primary CTA:** New Project  

**Issues:**
- ✅ Clean grid/list toggle
- ✅ Good search and filter placement
- ❌ Uses hardcoded mock data (not connected to API)
- ❌ Links go to `/app/projects/[slug]` (wrong route)
- ❌ Empty state is minimal
- ⚠️ Risk badges use different color system than rest of app

**Fixes Needed:**
- Connect to real API
- Fix route links
- Enhance empty state with illustration and guidance
- Standardize badge colors

---

### `/inbox` (Inbox Page)
**Primary Goal:** Triage notifications  
**Primary CTA:** Mark all read  

**Issues:**
- ✅ Good tab structure (All/Unread/Mentions/AI)
- ✅ Bulk action bar appears on selection
- ✅ Keyboard shortcut hints in footer
- ❌ Uses hardcoded mock data
- ❌ "All caught up" empty state is minimal
- ❌ Item actions only in dropdown (should have hover actions)

**Fixes Needed:**
- Connect to real API
- Add hover actions for common operations
- Enhance empty state

---

### `/my-work` (My Work Page)
**Primary Goal:** Focus on personal tasks  
**Primary CTA:** Add task (per section)  

**Issues:**
- ✅ Good section structure (Now/Next/Later/Waiting)
- ✅ Focus mode exists and works
- ❌ Uses hardcoded mock data
- ❌ Links go to `/app/tasks/[id]` (wrong route)
- ❌ Drag handle shows but no actual drag-and-drop
- ⚠️ "Plan my day" button does nothing

**Fixes Needed:**
- Connect to real API
- Implement drag-and-drop reordering
- Wire up AI "Plan my day" feature or remove

---

### `/settings` (Settings Page)
**Primary Goal:** Configure workspace  
**Primary CTA:** Save Changes (per section)  

**Issues:**
- ✅ Good left-nav structure
- ✅ Theme and density selectors work
- ✅ Clean card-based sections
- ❌ Most settings don't persist (no API calls)
- ❌ Some sections show "coming soon" placeholder
- ⚠️ No confirmation on save

**Fixes Needed:**
- Connect to real API
- Add toast confirmation on save
- Complete placeholder sections or remove

---

### `/reports` (Reports Page)
**Primary Goal:** View workspace analytics  
**Primary CTA:** Generate Report  

**Issues:**
- ✅ Good metric cards
- ✅ AI-generated report display is well-designed
- ❌ Charts are placeholder (hardcoded bars)
- ❌ "Generate Report" doesn't do anything
- ⚠️ Grid layout breaks on medium screens

**Fixes Needed:**
- Implement real charting (Recharts recommended)
- Connect report generation to AI
- Fix responsive breakpoints

---

### `/people` (People Page)
**Primary Goal:** View team capacity  
**Primary CTA:** Invite Member  

**Issues:**
- ✅ Good capacity visualization
- ✅ AI insights section is nice pattern
- ❌ Uses hardcoded mock data
- ❌ Capacity view tab doesn't change anything
- ⚠️ Status indicators (online/away) are mock

**Fixes Needed:**
- Connect to real API
- Implement actual capacity view
- Add real-time presence if feasible

---

### `/milestones` (Milestones Page)
**Primary Goal:** Track major deliverables  
**Primary CTA:** New Milestone  

**Issues:**
- ❌ Uses old MainLayout wrapper
- ❌ Inconsistent card density vs other pages
- ❌ Delete uses window.confirm and window.location.reload
- ⚠️ Edit shows alert("coming soon")
- ⚠️ Script tag for JSON-LD seems unnecessary

**Fixes Needed:**
- Migrate to AppShell
- Use toast + undo for delete
- Implement edit functionality

---

## Part 3: Component Standardization Needed

### Layout Components (Create/Refactor)
- [ ] `PageShell` - Standard page wrapper with max-width, padding
- [ ] `PageHeader` - Title + subtitle + primary CTA + secondary menu
- [ ] `PageContent` - Main content area with sections
- [ ] `Inspector` - Right-side detail panel (Sheet-based)

### Data Display (Standardize)
- [ ] `DataTable` - Consistent table with row hover, selection, keyboard nav
- [ ] `DataList` - For simpler lists with hover actions
- [ ] `StatCard` - Metric display with label, value, trend
- [ ] `FilterBar` - Consistent filter chips + saved views

### Feedback (Create)
- [ ] `Toast` with undo support (use Sonner)
- [ ] `EmptyState` - Standardized with illustration, title, description, CTA
- [ ] `LoadingSkeleton` - Match actual component shapes
- [ ] `ErrorState` - Friendly error with retry action

### Forms (Standardize)
- [ ] Form field wrapper with label + helper text + error
- [ ] Consistent button placement (Cancel left, Primary right)
- [ ] Required field indicators

---

## Part 4: Copywriting Backlog

### Empty States Need Rewrite
| Location | Current | Proposed |
|----------|---------|----------|
| Projects empty | "No projects found" | "Start your first project" / "Projects keep work organized" |
| Inbox empty | "All caught up!" | "You're all caught up" / "Mentions and assignments appear here" |
| Tasks empty | "No items in now" | "Your focus list is clear" / "Add tasks you want to tackle today" |
| Milestones empty | "No milestones yet" | "Mark important dates" / "Milestones track major deliverables" |
| People search empty | "No people found" | "No one matches that search" |

### Button Labels Need Consistency
| Current | Proposed |
|---------|----------|
| "Submit" | Never use - be specific |
| "Create Project" | ✅ Good |
| "Save Changes" | ✅ Good |
| "Cancel" | ✅ Good |
| "OK" | Use "Done" or "Got it" |
| "Delete" | "Delete project" (be specific) |

### Error Messages Need Help
| Current | Proposed |
|---------|----------|
| "Failed to load" | "Couldn't load projects. Check your connection and try again." |
| "Error" | Always explain what happened and what to do |

---

## Part 5: Accessibility Issues

### Critical
- [ ] Skip to main content link exists but not visible on focus
- [ ] Some interactive elements lack aria-labels
- [ ] Modal focus trap may not work consistently

### Important
- [ ] Color contrast on muted text may fail WCAG AA
- [ ] Status indicators rely on color alone (need icons/text)
- [ ] Keyboard navigation in dropdowns needs verification

### Minor
- [ ] Focus ring is same for all elements (could be more contextual)
- [ ] Screen reader announcements for async operations missing

---

## Part 6: Recommended Implementation Order

### Phase 1: Foundation (Week 1)
1. Consolidate to single layout system (AppShell)
2. Fix route structure (remove `/app` prefix or add redirects)
3. Create PageShell, PageHeader, PageContent components
4. Implement toast + undo framework

### Phase 2: Consistency (Week 2)
1. Apply PageHeader to all pages
2. Standardize empty states
3. Standardize loading states (skeletons)
4. Create FilterBar component

### Phase 3: Polish (Week 3)
1. Copywriting pass on all strings
2. Connect pages to real APIs (remove mock data)
3. Implement Command Palette
4. Add keyboard shortcuts

### Phase 4: Delight (Week 4)
1. Onboarding checklist
2. Micro-interactions (hover, selection)
3. Accessibility audit fixes
4. Performance optimization

---

## Appendix: File Reference

### Layout Files
- `src/components/foco/layout/app-shell.tsx` - New shell (USE THIS)
- `src/components/foco/layout/left-rail.tsx` - Sidebar navigation
- `src/components/foco/layout/top-bar.tsx` - Header bar
- `src/components/foco/layout/command-palette.tsx` - Cmd+K palette
- `src/components/layout/MainLayout.tsx` - Old layout (DEPRECATE)

### Style Files
- `src/app/globals.css` - Global styles and CSS variables
- `src/styles/design-tokens.css` - Design token definitions
- `tailwind.config.ts` - Tailwind configuration

### Key Component Directories
- `src/components/ui/` - Base UI components (59 files)
- `src/components/foco/` - Foco-specific components
- `src/components/empty-states/` - Empty state components

---

*This audit serves as the source of truth for the UI/UX upgrade. Update as issues are resolved.*
