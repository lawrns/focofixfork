# FOCO UI/UX REPLACEMENT MASTERPLAN - INDEX

## 📋 Quick Navigation

| Document | Contents | Status |
|----------|----------|--------|
| [PART 1](./UI_REPLACEMENT_MASTERPLAN.md) | Design Tokens, Colors, Typography, Spacing, Shadows | ✅ Complete |
| [PART 2](./UI_REPLACEMENT_MASTERPLAN_PART2.md) | Component Library Specifications | ✅ Complete |
| [PART 3](./UI_REPLACEMENT_MASTERPLAN_PART3.md) | Landing Page & Dashboard Redesign | ✅ Complete |
| [PART 4](./UI_REPLACEMENT_MASTERPLAN_PART4.md) | Kanban Board & Drag-and-Drop | ✅ Complete |
| [PART 5](./UI_REPLACEMENT_MASTERPLAN_PART5.md) | Implementation Roadmap & Execution | ✅ Complete |

---

## 🎯 Executive Summary

**Goal:** Transform Foco from a functional but dated UI into a world-class, beautiful productivity application rivaling Linear, Notion, and Asana.

**Timeline:** 6-8 weeks

**Design Philosophy:** "Refined Simplicity"
- Radical minimalism
- Visual hierarchy through typography and spacing
- Delightful micro-interactions
- Dark-first design with polished light mode
- Accessibility-native (WCAG 2.1 AA)

---

## 🎨 Design Inspiration Sources

| Application | Key Takeaways |
|-------------|---------------|
| **Linear** | Dark mode excellence, reduced visual noise, timeless UI chrome |
| **Notion** | Clean whitespace, flexible layouts, elegant typography |
| **Asana** | Color-coded projects, celebration animations, personality |
| **Vercel/Geist** | Monochromatic elegance, bold typography |
| **Raycast** | Complex gradients, glassmorphism, bold colors |

---

## 📊 Document Contents Overview

### PART 1: Design Tokens
- **Color System:** Primary (indigo-purple), Neutrals, Semantics, Status colors
- **Gradients:** Primary, subtle, glass, mesh, success
- **Typography:** Font families, sizes (10px-72px), weights, line heights
- **Spacing:** 8px grid system (4px-384px)
- **Border Radius:** 4px-24px + full pill
- **Shadows:** Light/dark mode variants + colored glows
- **Animations:** Duration, easing functions, transitions
- **Z-Index:** Layering scale for dropdowns, modals, tooltips
- **Breakpoints:** xs (475px) to 2xl (1536px)
- **Component Tokens:** Sidebar, header, cards, inputs, buttons, kanban

### PART 2: Components
- **Button:** 6 variants, 5 sizes, loading/disabled states, animations
- **Input:** 4 variants, validation, icons, helper text
- **Card:** 5 variants, header/body/footer anatomy, hover effects
- **Badge:** 4 variants, 8 colors, sizes
- **Avatar:** Image/initials/icon, 6 sizes, status indicators, groups
- **Select/Dropdown:** Search, multi-select, keyboard nav, animations
- **Modal:** 5 sizes, backdrop blur, close behaviors, animations
- **Tooltip:** Positioning, delays, styling
- **Toast:** 5 variants, progress bar, actions, slide animation
- **Skeleton:** Pulse and wave animations

### PART 3: Page Redesigns
- **Landing Page:**
  - Navbar: Fixed, blur backdrop, dropdown menus, mobile menu
  - Hero: Announcement badge, gradient headline, CTAs, product preview
  - Social Proof: Company logos, statistics
  - Features: 6-card grid with icons
  - How It Works: 3 steps with connectors
  - Testimonials: Masonry grid
  - CTA Section: Gradient background
  - Footer: Links, social, copyright

- **Dashboard:**
  - Sidebar: Collapsible, workspace selector, projects, user
  - Header: Breadcrumbs, view toggle, filters, user menu
  - Content: Welcome, quick actions, metrics, activity, projects

### PART 4: Kanban & Animations
- **Board Header:** Title, filters, view toggle, sort/group
- **Columns:** Header with status dot, card list, add button, WIP limits
- **Cards:** Priority, title, labels, subtasks, due date, assignee, context menu
- **Drag-and-Drop:** Sensors, overlays, drop placeholders, accessibility
- **Card Detail Modal:** Two-column layout, rich editor, comments
- **Quick Add:** Inline creation with quick field selectors
- **Animations:** Button, card, fade, slide, scale, celebrations, page transitions

### PART 5: Implementation
- **Phase 0 (Week 1):** Foundation - design tokens, Tailwind config, directory structure
- **Phase 1 (Week 2):** Core components - button, input, card
- **Phase 2 (Week 3):** Layout - sidebar, header
- **Phase 3 (Week 4):** Landing page - all 8 sections
- **Phase 4 (Week 5):** Dashboard redesign
- **Phase 5 (Week 6):** Kanban board with DnD
- **Phase 6 (Week 7):** Polish, accessibility, dark mode, mobile
- **Phase 7 (Week 8):** Testing, fixes, launch

---

## 🚀 Quick Start for AI Execution

### Step 1: Read All Documents
```
1. UI_REPLACEMENT_MASTERPLAN.md      (Design Tokens)
2. UI_REPLACEMENT_MASTERPLAN_PART2.md (Components)
3. UI_REPLACEMENT_MASTERPLAN_PART3.md (Pages)
4. UI_REPLACEMENT_MASTERPLAN_PART4.md (Kanban + Animations)
5. UI_REPLACEMENT_MASTERPLAN_PART5.md (Implementation)
```

### Step 2: Start with Foundation
```bash
# First, update design tokens
# File: src/styles/design-tokens.css

# Then update Tailwind config
# File: tailwind.config.ts

# Then update globals
# File: src/styles/globals.css
```

### Step 3: Component Order
```
1. Button (most used, sets patterns)
2. Input (forms foundation)
3. Card (content containers)
4. Badge (status indicators)
5. Avatar (user representation)
6. Select (form complexity)
7. Modal (overlays)
8. Tooltip (micro-interaction)
9. Toast (notifications)
10. Skeleton (loading states)
```

### Step 4: Layout Components
```
1. Sidebar (navigation foundation)
2. Header (page chrome)
3. Page Container (content wrapper)
4. Mobile Nav (responsive)
```

### Step 5: Page Implementations
```
1. Landing page (public-facing, impression)
2. Dashboard (daily driver)
3. Kanban view (core functionality)
```

---

## ✅ Success Criteria

| Category | Metric | Target |
|----------|--------|--------|
| **Performance** | LCP | < 2.5s |
| **Performance** | FID | < 100ms |
| **Performance** | CLS | < 0.1 |
| **Performance** | Lighthouse Score | > 90 |
| **Accessibility** | WCAG Level | AA |
| **Accessibility** | Lighthouse A11y | 100 |
| **Quality** | TypeScript Coverage | 100% |
| **Quality** | Unit Test Coverage | > 80% |
| **Quality** | Console Errors | 0 |
| **UX** | Animation FPS | 60fps |
| **UX** | Touch Response | < 50ms |

---

## 📁 File Change Summary

### New Files (18)
```
src/styles/design-tokens.css
src/lib/animations.ts
src/components/ui/skeleton.tsx
src/components/layout/sidebar.tsx
src/components/layout/header.tsx
src/components/layout/page-container.tsx
src/components/layout/mobile-nav.tsx
src/components/landing/navbar.tsx
src/components/landing/hero.tsx
src/components/landing/features.tsx
src/components/landing/social-proof.tsx
src/components/landing/testimonials.tsx
src/components/landing/cta-section.tsx
src/components/landing/footer.tsx
src/components/views/kanban/dnd-context.tsx
src/components/views/kanban/card-detail.tsx
src/components/views/kanban/quick-add.tsx
src/components/shared/empty-state.tsx
```

### Modified Files (19)
```
tailwind.config.ts
src/styles/globals.css
src/components/ui/button.tsx
src/components/ui/input.tsx
src/components/ui/card.tsx
src/components/ui/badge.tsx
src/components/ui/avatar.tsx
src/components/ui/select.tsx
src/components/ui/modal.tsx
src/components/ui/tooltip.tsx
src/components/ui/toast.tsx
src/components/ui/dropdown-menu.tsx
src/components/views/kanban-view.tsx
src/components/views/kanban/board.tsx
src/components/views/kanban/column.tsx
src/components/views/kanban/card.tsx
src/app/page.tsx
src/app/dashboard/page.tsx
src/app/layout.tsx
```

---

## 🔑 Key Design Decisions

1. **Primary Color:** Indigo (#6366F1) - more sophisticated than standard blue
2. **Dark Mode First:** Premium feel, reduces eye strain, modern aesthetic
3. **8px Grid:** Consistent spacing throughout
4. **Inter Font:** Clean, modern, excellent readability
5. **Subtle Animations:** 150-300ms, purposeful, not distracting
6. **Card-Based Layout:** Clear content hierarchy
7. **Glassmorphism:** Sparingly used for modals and overlays
8. **Gradient Accents:** Primary gradient for CTAs and hero elements

---

## 📞 Execution Notes for AI

1. **Always test changes** - run `npm run dev` and verify in browser
2. **Maintain consistency** - use design tokens, don't hardcode values
3. **Preserve functionality** - don't break existing features
4. **Accessibility first** - proper ARIA labels, keyboard navigation
5. **Mobile responsive** - test all breakpoints
6. **Dark mode** - verify both themes work correctly
7. **Incremental commits** - small, focused changes
8. **Document changes** - update component documentation

---

*This index provides a complete overview of the UI/UX replacement masterplan. Follow the phases in order for best results.*
