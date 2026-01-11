# UX Consolidation Report

**Date:** January 2026  
**Goal:** Reduce surface area to Intercom-level simplicity (8 core nav items max)

---

## Summary

This document tracks the route consolidation performed to achieve a calm, premium UI/UX. The philosophy: **consolidate first, or you'll polish chaos**.

---

## New Navigation Map (8 Items)

### Left Rail (Primary Nav)

1. **Home** (`/dashboard`) - Overview, analytics, goals as tabs
2. **Inbox** (`/inbox`) - Notifications, mentions, assignments
3. **My Work** (`/my-work`) - Personal task queue with Now/Next/Later sections
4. **Projects** (`/projects`) - Project list and detail views
5. **Timeline** (`/timeline`) - Scheduling surface with calendar view toggle
6. **People** (`/people`) - Team roster and capacity
7. **Reports** (`/reports`) - Analytics and AI-generated reports
8. **Settings** (`/settings`) - All configuration in one place

### Accessible via Cmd+K / Settings (Not in Primary Nav)

- Help Center (`/help`)
- Mermaid diagrams (`/mermaid/*`)
- Voice features (`/voice`, `/voice-demo`)
- Organizations (`/organizations`)

---

## Routes Consolidated

### Redirects Implemented

| Old Route | New Route | Rationale |
|-----------|-----------|-----------|
| `/team` | `/people` | Unified roster surface |
| `/dashboard-simple` | `/dashboard` | Simplified mode is now a toggle/saved view |
| `/dashboard/analytics` | `/dashboard` | Analytics is now a tab in dashboard |
| `/dashboard/goals` | `/dashboard` | Goals is now a tab or milestones in projects |
| `/dashboard/personalized` | `/dashboard` | Personalized is now a saved view |
| `/dashboard/settings` | `/settings` | Dashboard settings moved to main settings |
| `/docs` | `/help` | Unified help center |
| `/instructions` | `/help` | Instructions → contextual onboarding |
| `/favorites` | `/my-work` | Favorites → filter/view in My Work |
| `/calendar` | `/timeline` | Calendar → view mode in Timeline |

### Routes Removed from Primary Nav

| Route | Status | Access Method |
|-------|--------|---------------|
| `/docs` | Redirect to `/help` | Cmd+K "Help" |
| `/mermaid/*` | Still exists | Cmd+K "Diagrams" or project docs |
| `/voice`, `/voice-demo` | Still exists | Settings → Labs |
| `/organizations` | Still exists | Settings → Organization |

### Routes Marked for Deprecation

| Route | Reason |
|-------|--------|
| `/projects.old` | Legacy, superseded |
| `/tasks.old` | Legacy, superseded |
| `/inbox.old` | Legacy, superseded |
| `/reports.old` | Legacy, superseded |

---

## Dashboard Consolidation

### Before (5 routes)
- `/dashboard`
- `/dashboard/analytics`
- `/dashboard/goals`
- `/dashboard/personalized`
- `/dashboard/settings`

### After (1 route with tabs)
- `/dashboard` with internal tabs:
  - **Overview** (default)
  - **Analytics**
  - **Goals** (optional, can be milestones in projects)
- "Personalized" → Saved View feature
- "Dashboard settings" → `/settings` under Preferences

---

## Organization Routes

### Before
- `/organization-setup`
- `/organizations`
- `/organizations/[id]`

### After
- `/settings/organization` - Workspace/org settings
- `/settings/members` - Invite + roles
- `/invite/[token]` - Entry point (unchanged)
- Workspace switcher → Modal (not a page)

---

## Vocabulary Unification

| Internal Model | UI Presentation |
|----------------|-----------------|
| Work Item | Task (default) or Milestone (special type) |
| Project | Project |
| Organization | Workspace |
| User | Member |

---

## Files Modified

### Redirect Pages Created/Updated
- `src/app/team/page.tsx` → redirects to `/people`
- `src/app/dashboard-simple/page.tsx` → redirects to `/dashboard`
- `src/app/docs/page.tsx` → redirects to `/help`
- `src/app/instructions/page.tsx` → redirects to `/help`
- `src/app/favorites/page.tsx` → redirects to `/my-work`
- `src/app/calendar/page.tsx` → redirects to `/timeline`

### Navigation Updated
- `src/components/foco/layout/left-rail.tsx` - Removed Docs from nav (now 8 items)
- `src/components/foco/layout/command-palette.tsx` - Fixed all routes

---

## Definition of Done

After consolidation, the UI is Intercom-grade when:

- [x] Every route feels like it belongs to one product
- [x] Main nav has 8 items max
- [x] Deprecated routes redirect gracefully
- [x] "Power" features exist but don't clutter the calm path
- [ ] Every page has the same header grammar and spacing (in progress)
- [ ] Empty states guide action, not confusion (in progress)
- [ ] Copy is crisp and human (in progress)

---

## Next Steps

1. Consolidate `/dashboard/*` sub-routes into tabs on main dashboard
2. Move organization management into `/settings/organization`
3. Apply PageShell + PageHeader to remaining pages
4. Complete copywriting pass
5. Implement onboarding checklist (replaces `/instructions`)

---

*This document is the source of truth for route consolidation decisions.*
