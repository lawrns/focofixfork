## Goals
- Elevate the entire product to a polished, responsive, modern aesthetic inspired by Mollie and TradingView.
- Standardize on shadcn/ui primitives, Tailwind design tokens, and tasteful framer‑motion micro‑interactions.
- Keep performance, accessibility, and clarity of AI interactions as first‑class concerns.

## Design System Foundations
- Tailwind tokens: define primary/emerald brand, neutrals, semantic colors (success/warn/error), spacing/typography scale, shadow and radius.
- Typography: modular scale (display → h1–h6 → body), tighter leading, balanced tracking; system defaults for headings and body.
- Containers: `max-w-7xl` shells, responsive gutters, grid utilities (`grid-cols-12`, cards on 4–6 columns for content heavy views).
- Dark mode: enable consistent tokens via CSS variables; verify contrast ratios.

## shadcn/ui Standardization
- Core primitives (audit and adopt): `Button`, `Card`, `Tabs`, `Input`, `Textarea`, `Dialog/Sheet`, `Toast`, `Dropdown`, `Popover`, `Tooltip`, `Table`.
- Variants: brand, subtle, ghost, destructive across components; sizes (sm/md/lg) and density presets.
- Iconography: lucide‑react modular imports; build icon map for navigation and actions.

## Layout & Navigation
- AppShell: unified header (search, actions), left sidebar (sections), content area and right contextual panel.
- Sticky header with subtle glass/gradient; collapsible/hover‑expand sidebar; mobile bottom nav.
- Page templates: Dashboard, Projects, Project Detail, Tasks/Milestones, Organizations, Settings, Reports.

## Page Modernization (Phased)
- Phase 1 (high impact):
  - Dashboard: hero metrics with gradient cards, quick actions, recent activity feed.
  - Voice → Plan: polished tab layout (Voice/Review/Timeline) with animated transitions; AI confidence and signals badges.
  - Instructions: refined brief entry with helper hints, inline results cards.
- Phase 2:
  - Projects list + filters, sortable table with sticky headers.
  - Project detail: split pane (overview, milestones, tasks), timeline visualization (Mermaid/D3), activity sidebar.
  - Tasks/Milestones views: Kanban and list toggles, micro‑interactions on reordering.
- Phase 3:
  - Organizations/Settings/Reports: consistent cards/forms, accordions for sections, contextual tooltips.

## Motion & Micro‑Interactions
- Route transitions: fade/slide at 200–250ms; tab switches with `motion.div` and spring easing.
- Hover/tap: subtle scale/opacity for buttons and list items; focus‑rings with brand color.
- Skeletons and loading states: shimmer on cards/tables; optimistic UI on key actions.

## AI Interaction Clarity
- Status chips: “Parsed intents”, “Confidence”, “Draft vs Committed” labels with colors and icons.
- Inline explainers: collapsible “How this was derived” per task/milestone.
- Error states: structured messages, retries, and actionable next steps.

## SEO & Content
- JSON‑LD per key pages (SoftwareApplication, HowTo, BreadcrumbList on projects/tasks), canonical links.
- Redirect map expansion; sitemap merges legacy destinations; robots tuned to avoid API crawl.

## Accessibility & Performance
- A11y: color contrast > 4.5:1, keyboard navigation across tabs, ARIA labels for interactive elements.
- Performance: prefetch key routes, modularize icons, dynamic import heavy panels, avoid layout thrash; target LCP < 2.5s.

## Testing & Quality Gates
- Visual/regression: Playwright snapshots for modernized pages.
- Unit: component variants and interactions; motion presence toggles.
- E2E: Voice → Review → Timeline; Instructions → Generate → Commit flows.
- CI thresholds: minimum coverage, bundle size checks, lighthouse budgets.

## Implementation Plan
- Establish tokens and update Tailwind config; align shadcn theme and variants.
- Create AppShell layout; migrate Dashboard, Voice, Instructions templates.
- Refactor list/table views using shadcn Table and Filters; add motion where beneficial.
- Add JSON‑LD and metadata for modernized pages; expand redirects.
- Instrument A11y and performance checks; add tests and stabilize.

## Rollout & Safeguards
- Feature flag: `ui_modernization` gating per route/template.
- Progressive rollout by pages; smoke tests per deploy; quick rollback path.

## Acceptance Criteria
- Consistent modern styling across all core pages; responsive and accessible.
- Clear AI interactions with confidence, status, and helpful explainers.
- Performance budgets met; tests pass with coverage; SEO signals verified.

## Deliverables
- Updated design system and components; modernized pages; motion patterns.
- A11y and performance reports; e2e and visual tests.
- SEO artifacts (JSON‑LD, sitemap/robots, redirects) and documentation of UX guidelines.