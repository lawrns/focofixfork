# Overarching UI Modernization & Voice Planning Focus

## Goals
- Make `/voice` the first-class layout focused on voice planning, with a clean, structured AppShell.
- Eliminate duplicated buttons and legacy UI, standardize on shadcn/ui and Tailwind tokens.
- Improve responsiveness, accessibility, performance and testing coverage.

## Audit & Stabilize
- Identify duplicate rendering sources:
  - `src/app/voice/page.tsx:25-28` renders `Settings` + `New Project` in page header.
  - `src/components/voice/VoicePlanningWorkbench.tsx:597-601` renders `Search`, `Settings`, `New Project` in component header.
  - `src/components/layout/Sidebar.tsx:357-379` renders legacy bottom actions (`Settings`, `New Project`).
- Flag mismatches:
  - `voice_monitoring_enabled` is referenced in `src/lib/voice/monitoring-service.ts` but not declared in `FeatureFlagEnum`.
- Fix noisy dev logs and full reload warnings:
  - Reduce server-side env logs in `src/app/layout.tsx:8-12`.
  - Investigate 404 `/@vite/client` and fast-refresh full reload; ensure Next dev tooling only.

## AppShell Unification
- Decide single source of header actions:
  - Remove page-level `Settings/New Project` in `src/app/voice/page.tsx` OR the internal header in `VoicePlanningWorkbench.tsx`.
  - Prefer: keep actions in the page’s top header and expose an `actions` prop/slot to `VoicePlanningWorkbench` if it needs inline controls.
- Ensure `/voice` uses the same `MainLayout` structure or a dedicated VoiceShell with consistent `Header` and `Sidebar` behaviors:
  - `src/components/layout/MainLayout.tsx` / `Header.tsx` / `Sidebar.tsx` unify spacing, glass effect, and widths (`max-w-7xl`).
  - Remove legacy bottom-action buttons in `Sidebar.tsx` or convert them to shadcn `Button` and gate by context.

## Voice Planning Layout
- Restructure `/voice` into clear regions:
  - Top Bar: title, `Search`, `Settings`, `New Project` (single row).
  - Primary Pane: Workbench canvas (plan creation, live transcript).
  - Secondary Pane: Tabs (Review, Timeline, Milestones/Tasks), each in shadcn `Card`.
- Use responsive split-pane (md+: two-column; sm: stacked) with `grid` and consistent gap.
- Standardize tab switching with `framer-motion` 200ms transitions.

## Component Standardization
- Buttons:
  - Use `src/components/ui/button.tsx` exclusively; remove Tailwind-only buttons.
  - Define variants: `primary` (brand emerald), `secondary`, `outline`, `ghost`, `destructive`, sizes sm/md/lg.
- Cards/Tabs/Tables/Inputs/Dialog:
  - Ensure pages use shadcn primitives: `Card`, `Tabs`, `Table`, `Input`, `Dialog`.
  - Apply densities (compact/comfortable) and focus rings.
- Tailwind tokens:
  - Align brand colors (emerald primary), neutrals, radius/shadow presets in `tailwind.config.ts`.

## Duplication Fixes (Concrete)
- `/voice` header: remove duplicate actions in `src/components/voice/VoicePlanningWorkbench.tsx:597-601` and move them to the page header.
- Sidebar: eliminate legacy duplicated `Settings/New Project` buttons in `src/components/layout/Sidebar.tsx:357-379` or convert them to links only.
- Ensure only one `New Project` CTA appears per view; consolidate import/export and AI create into a single actions group component.

## Motion & Micro-Interactions
- Tab content transitions (`motion.div`, 200ms, fade/slide).
- Staggered mount for lists/tables; skeleton shimmer for loading.
- Hover/tap micro-interactions for primary actions; accessible reduced-motion support.

## Accessibility
- ARIA roles/labels for tabs, dialogs, tables.
- Keyboard navigation: tab order, arrow keys on tabs/table rows; escape to close dialogs.
- Contrast checks for badges/chips; ensure focus-visible rings.

## Performance
- Dynamic import heavy panels: `PlanReviewPanel`, `PlanTimeline`.
- Modularize lucide icons; memoize heavy components; avoid unnecessary store subscriptions.
- Prefetch common routes; debounce fetches and realtime updates to reduce thrash.

## Feature Flags & Rollout
- Add `ui_modernization` flag in `FeatureFlagEnum` and gate new templates.
- Fix `voice_monitoring_enabled` mismatch: add proper flag or remove references.
- Gradual migration: enable flag page-by-page, with fallback to legacy.

## SEO
- JSON-LD (`BreadcrumbList`) for `/voice`; maintain canonical via metadata.
- Ensure `metadata` exports are complete for the voice route.

## Tests & Verification
- Unit tests: table sorting/filtering, dialog interactions, button variants.
- Visual snapshots: voice workbench, review, timeline.
- E2E flows: voice plan creation, edit, timeline navigation.
- Accessibility tests: keyboard navigation, focus trapping, contrasts.

## Acceptance Criteria
- `/voice` shows a single, clean header with actions; no duplicate buttons.
- Layout is structured, responsive and accessible; motion is tasteful.
- Standardized shadcn primitives and Tailwind tokens across voice and related pages.
- Performance, SEO, and tests pass (unit/visual/e2e/accessibility).

## Milestones
- Phase 1: Audit & AppShell unification (duplication removal).
- Phase 2: Voice layout restructure and component standardization.
- Phase 3: Accessibility + motion + performance polish.
- Phase 4: Tests, SEO, rollout via feature flag with smoke tests and rollback readiness.

Please confirm this plan and priority order; once approved, I’ll start implementing Phase 1 and proceed sequentially with verification at each step.