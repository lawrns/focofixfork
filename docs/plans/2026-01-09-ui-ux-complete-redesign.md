# Foco UI/UX Complete Redesign Plan

> Transform Foco from functional to exceptional with a Linear/Notion-inspired modern design system

## Executive Summary

This document outlines a comprehensive redesign of Foco's entire UI/UX based on research from industry leaders (Linear, Notion, Asana, Stripe, Vercel) and modern design principles. The goal is to create a simple, beautiful, and powerful project management experience.

---

## Part 1: Current State Analysis & Pain Points

### Critical Issues Identified

#### 1. Visual Inconsistency
- **Landing page** uses dark gradients (`bg-gradient-to-b from-white to-slate-50` then switches to dark `bg-white/5`)
- Mixed color schemes - violet/purple gradients compete with emerald/primary colors
- Inconsistent border treatments (`border-white/10` vs `border-slate-200`)
- Typography lacks hierarchy discipline

#### 2. Information Overload
- Landing page is 800+ lines with too many sections
- Feature cards all look identical - no visual hierarchy
- Stats section uses arbitrary percentages without context
- Pricing section for a "free" product feels unnecessarily complex

#### 3. Component Design Issues
- Cards use heavy gradients and excessive backdrop-blur
- Buttons lack consistent hover states
- No micro-interactions or meaningful animations
- Loading states are basic spinners instead of skeletons

#### 4. Navigation Problems
- Sidebar is feature-heavy but not scannable
- No command palette (⌘K) for power users
- Mobile navigation feels like an afterthought
- No breadcrumbs for deep navigation

#### 5. Dashboard Chaos
- Widgets compete for attention equally
- No clear information hierarchy
- Kanban board lacks polish and drag feedback
- Task cards are information-dense but not scannable

---

## Part 2: Design Philosophy

### Core Principles (Inspired by Linear, Notion, Stripe)

#### 1. Radical Simplicity
> "Make it impossible to make things ugly" - Notion

- **Remove, don't add**: Every element must earn its place
- **Whitespace is design**: Use generous spacing to create breathing room
- **One font, many weights**: Inter with strict weight hierarchy
- **Muted by default**: Color should be intentional, not decorative

#### 2. Content-First Design
> "The UI should disappear" - Linear

- Interface fades into background, content shines
- No decorative gradients or heavy shadows
- Borders should be subtle (`border-gray-100` not `border-gray-300`)
- Backgrounds: pure white or very subtle gray (`gray-50`)

#### 3. Progressive Disclosure
> "Show only what's needed, when it's needed" - Notion

- Hide complexity behind contextual menus
- Use hover states to reveal secondary actions
- Collapse advanced options by default
- Command palette for power users

#### 4. Meaningful Motion
> "Animation should inform, not decorate" - Stripe

- Micro-interactions provide feedback (button press, hover lift)
- Transitions guide attention (page changes, modal opens)
- Spring physics for natural-feeling movement
- Performance-first: use `transform` and `opacity` only

---

## Part 3: New Design System Specification

### Color Palette

```css
/* Light Mode (Primary) */
--background: #FFFFFF;
--background-subtle: #FAFAFA;
--background-muted: #F4F4F5;

--foreground: #18181B;           /* zinc-900 */
--foreground-muted: #71717A;     /* zinc-500 */
--foreground-subtle: #A1A1AA;    /* zinc-400 */

--border: #E4E4E7;               /* zinc-200 */
--border-subtle: #F4F4F5;        /* zinc-100 */

--primary: #18181B;              /* zinc-900 - buttons, links */
--primary-foreground: #FFFFFF;

--accent: #3B82F6;               /* blue-500 - highlights, focus */
--accent-subtle: #EFF6FF;        /* blue-50 */

--success: #22C55E;              /* green-500 */
--warning: #F59E0B;              /* amber-500 */
--destructive: #EF4444;          /* red-500 */

/* Dark Mode */
--background: #09090B;           /* zinc-950 */
--background-subtle: #18181B;    /* zinc-900 */
--background-muted: #27272A;     /* zinc-800 */

--foreground: #FAFAFA;           /* zinc-50 */
--foreground-muted: #A1A1AA;     /* zinc-400 */
--foreground-subtle: #71717A;    /* zinc-500 */

--border: #27272A;               /* zinc-800 */
--border-subtle: #18181B;        /* zinc-900 */
```

### Typography Scale

```css
/* Font: Inter (already in use) */
--font-sans: 'Inter', system-ui, sans-serif;

/* Sizes - Strict hierarchy */
--text-xs: 0.75rem;      /* 12px - labels, badges */
--text-sm: 0.875rem;     /* 14px - body small, captions */
--text-base: 1rem;       /* 16px - body */
--text-lg: 1.125rem;     /* 18px - body large */
--text-xl: 1.25rem;      /* 20px - heading 4 */
--text-2xl: 1.5rem;      /* 24px - heading 3 */
--text-3xl: 1.875rem;    /* 30px - heading 2 */
--text-4xl: 2.25rem;     /* 36px - heading 1 */

/* Weights */
--font-normal: 400;      /* body text */
--font-medium: 500;      /* emphasis, labels */
--font-semibold: 600;    /* subheadings */
--font-bold: 700;        /* headings only */

/* Line Heights */
--leading-tight: 1.25;   /* headings */
--leading-normal: 1.5;   /* body */
--leading-relaxed: 1.75; /* long-form */
```

### Spacing System

```css
/* Base unit: 4px */
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### Border Radius

```css
--radius-sm: 0.375rem;   /* 6px - buttons, inputs */
--radius-md: 0.5rem;     /* 8px - cards, dropdowns */
--radius-lg: 0.75rem;    /* 12px - modals, large cards */
--radius-xl: 1rem;       /* 16px - hero sections */
--radius-full: 9999px;   /* pills, avatars */
```

### Shadow System (Subtle!)

```css
/* Shadows should be barely noticeable */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.03);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05);

/* Elevation for modals/popovers */
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08);
```

---

## Part 4: Component Redesign Specifications

### Buttons

```tsx
// Primary - Solid, minimal
<Button>
  bg-zinc-900 text-white hover:bg-zinc-800
  dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100
  transition-colors duration-150
  shadow-xs hover:shadow-sm
</Button>

// Secondary - Subtle border
<Button variant="secondary">
  bg-white border border-zinc-200 text-zinc-900
  hover:bg-zinc-50 hover:border-zinc-300
  dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100
</Button>

// Ghost - Text only
<Button variant="ghost">
  text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100
  dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800
</Button>

// Destructive - Red, but subtle
<Button variant="destructive">
  bg-red-500 text-white hover:bg-red-600
  // Or subtle: text-red-600 hover:bg-red-50
</Button>
```

### Cards

```tsx
// Base card - Almost invisible borders
<Card>
  bg-white border border-zinc-100 rounded-lg
  dark:bg-zinc-900 dark:border-zinc-800
  // NO shadows by default
  // Shadow only on hover if interactive
  hover:shadow-sm hover:border-zinc-200 transition-all duration-200
</Card>

// Feature card with icon
<Card className="p-6">
  <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center mb-4">
    <Icon className="w-5 h-5 text-zinc-600" />
  </div>
  <h3 className="text-base font-semibold text-zinc-900 mb-2">Title</h3>
  <p className="text-sm text-zinc-500">Description</p>
</Card>
```

### Input Fields

```tsx
<Input>
  w-full px-3 py-2
  bg-white border border-zinc-200 rounded-md
  text-zinc-900 placeholder:text-zinc-400
  focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400
  transition-colors duration-150

  dark:bg-zinc-900 dark:border-zinc-700
  dark:focus:ring-white/10 dark:focus:border-zinc-600
</Input>
```

### Task Cards (Kanban)

```tsx
<TaskCard>
  // Clean, scannable design
  bg-white border border-zinc-100 rounded-md p-3
  hover:border-zinc-200 hover:shadow-sm
  cursor-grab active:cursor-grabbing
  transition-all duration-150

  // Drag state
  [data-dragging="true"]:shadow-lg [data-dragging="true"]:rotate-2 [data-dragging="true"]:scale-105

  // Content hierarchy
  <div className="flex items-start gap-3">
    <Checkbox />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-zinc-900 truncate">Task title</p>
      <div className="flex items-center gap-2 mt-1">
        <Badge variant="subtle">Label</Badge>
        <span className="text-xs text-zinc-400">Due tomorrow</span>
      </div>
    </div>
  </div>
</TaskCard>
```

### Navigation Sidebar

```tsx
<Sidebar>
  // Collapsible, icon-first design
  w-60 border-r border-zinc-100 bg-zinc-50/50
  dark:bg-zinc-900 dark:border-zinc-800

  // Collapsed state: w-16, icons only
  // Expand on hover or toggle

  <SidebarItem>
    flex items-center gap-3 px-3 py-2 rounded-md
    text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100
    transition-colors duration-150

    // Active state
    [data-active="true"]:bg-zinc-100 [data-active="true"]:text-zinc-900
    [data-active="true"]:font-medium
  </SidebarItem>
</Sidebar>
```

---

## Part 5: Animation & Micro-interaction Specifications

### Transition Defaults

```tsx
// Use throughout app
const transitions = {
  fast: 'transition-all duration-100 ease-out',
  normal: 'transition-all duration-150 ease-out',
  slow: 'transition-all duration-200 ease-out',
  spring: { type: 'spring', stiffness: 400, damping: 30 },
}
```

### Framer Motion Patterns

```tsx
// Page transitions
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

// List items (stagger children)
const listVariants = {
  animate: {
    transition: { staggerChildren: 0.05 }
  }
}
const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}

// Button press
<motion.button
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.1 }}
>

// Card hover lift
<motion.div
  whileHover={{ y: -2, shadow: 'var(--shadow-md)' }}
  transition={{ duration: 0.15 }}
>

// Drag and drop
<Reorder.Item
  value={item}
  dragListener={false}
  dragControls={controls}
  whileDrag={{
    scale: 1.03,
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    rotate: 1
  }}
>
```

### Loading States

```tsx
// Skeleton screens instead of spinners
<Skeleton className="h-4 w-3/4 bg-zinc-100 rounded animate-pulse" />

// Content loading
const SkeletonCard = () => (
  <div className="p-4 space-y-3">
    <Skeleton className="h-5 w-1/2" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
  </div>
)

// Button loading state
<Button disabled>
  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
  Creating...
</Button>
```

### Success/Error Feedback

```tsx
// Toast notifications with motion
<motion.div
  initial={{ opacity: 0, y: 50, scale: 0.95 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
>

// Inline success animation (checkmark)
<motion.svg
  initial={{ pathLength: 0 }}
  animate={{ pathLength: 1 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>
```

---

## Part 6: Page-by-Page Redesign Plan

### 1. Landing Page (Complete Rewrite)

**Current**: 800+ lines, visual chaos, mixed themes
**Target**: <300 lines, single cohesive theme, focused message

#### New Structure:

```
┌─────────────────────────────────────────────┐
│ Nav: Logo | [Features] [Pricing] | [Sign in]│
├─────────────────────────────────────────────┤
│                                             │
│     Voice-Powered Project Management        │
│     Speak your ideas. AI creates plans.     │
│                                             │
│     [Get Started Free]  [See Demo →]        │
│                                             │
│     ┌─────────────────────────────┐         │
│     │   Product Screenshot/Video  │         │
│     └─────────────────────────────┘         │
│                                             │
├─────────────────────────────────────────────┤
│ "Used by teams at..." [Logo] [Logo] [Logo]  │
├─────────────────────────────────────────────┤
│                                             │
│ Three Feature Cards (Voice | AI | Collab)   │
│ ┌─────┐  ┌─────┐  ┌─────┐                   │
│ │     │  │     │  │     │                   │
│ └─────┘  └─────┘  └─────┘                   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ Simple CTA: "Start planning with voice"     │
│           [Get Started - It's Free]         │
│                                             │
├─────────────────────────────────────────────┤
│ Footer: Links | © 2025                      │
└─────────────────────────────────────────────┘
```

#### Key Changes:
- Remove all gradient backgrounds
- White background with subtle gray sections
- ONE hero message, not three
- Remove fake statistics
- Remove complex pricing section (it's free)
- Real product screenshot, not abstract illustrations

### 2. Dashboard

**Current**: Widget chaos, no hierarchy
**Target**: Clean, scannable, action-oriented

#### New Layout:

```
┌──────┬──────────────────────────────────────┐
│      │ ⌘K Search...              [+] [👤]   │
│ Logo ├──────────────────────────────────────┤
│      │                                      │
│ ──── │  Good morning, Luke                  │
│ Home │                                      │
│ Proj │  ┌─────────────────┐ ┌────────────┐ │
│ Tasks│  │ Today's Focus   │ │ Quick Add  │ │
│ Goals│  │ • Task 1        │ │            │ │
│ ──── │  │ • Task 2        │ │ [+ Task]   │ │
│      │  │ • Task 3        │ │ [+ Project]│ │
│ Team │  └─────────────────┘ └────────────┘ │
│ Sett │                                      │
│      │  Recent Projects                     │
│      │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│      │  │Proj1│ │Proj2│ │Proj3│ │Proj4│   │
│      │  └─────┘ └─────┘ └─────┘ └─────┘   │
│      │                                      │
└──────┴──────────────────────────────────────┘
```

#### Key Changes:
- Command palette (⌘K) for quick navigation
- "Today's Focus" widget prominently placed
- Quick add buttons always visible
- Recent projects as horizontal cards
- Remove redundant widgets

### 3. Kanban Board

**Current**: Basic drag-drop, no visual feedback
**Target**: Buttery smooth, delightful interactions

#### Interaction Enhancements:

```tsx
// Column structure
<KanbanColumn>
  // Header with count badge
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-medium text-zinc-900">To Do</h3>
    <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">12</span>
  </div>

  // Droppable area with visual feedback
  <Reorder.Group
    values={tasks}
    onReorder={setTasks}
    className="space-y-2"
  >
    {tasks.map(task => (
      <Reorder.Item
        key={task.id}
        value={task}
        // Smooth drag physics
        dragElastic={0.1}
        dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
      >
        <TaskCard task={task} />
      </Reorder.Item>
    ))}
  </Reorder.Group>

  // Drop zone indicator
  <div className="h-20 border-2 border-dashed border-zinc-200 rounded-md mt-2
                  opacity-0 group-[data-dragging-over]:opacity-100
                  transition-opacity duration-150" />
</KanbanColumn>
```

#### Visual Feedback:
- Cards lift and tilt slightly when dragged
- Columns highlight when receiving a drop
- Smooth reordering animation
- Ghost placeholder shows where card will land

### 4. Task Detail View

**Current**: Modal with dense information
**Target**: Slide-over panel with clean sections

```
┌────────────────────────────────────┐
│ ← Back to board           [···]   │
├────────────────────────────────────┤
│                                    │
│ □ Implement user authentication    │
│   High Priority • Due Jan 15       │
│                                    │
├────────────────────────────────────┤
│ Description                        │
│ ┌────────────────────────────────┐ │
│ │ Add click to edit...           │ │
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ Subtasks                    [+]    │
│ ☑ Research auth libraries          │
│ □ Set up Supabase auth             │
│ □ Create login form                │
├────────────────────────────────────┤
│ Activity                           │
│ Luke created this task • 2h ago    │
│ Sarah added a comment • 1h ago     │
└────────────────────────────────────┘
```

### 5. Project Overview

**Current**: Table-heavy, information dense
**Target**: Visual hierarchy, scannable

```
┌────────────────────────────────────────────┐
│ Marketing Website Redesign                 │
│ 12 tasks • 3 members • Due Feb 28          │
├────────────────────────────────────────────┤
│                                            │
│ Progress ████████████░░░░░░░░ 65%          │
│                                            │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ Backlog  │ │ In Prog  │ │ Complete │    │
│ │    8     │ │    3     │ │    7     │    │
│ └──────────┘ └──────────┘ └──────────┘    │
│                                            │
│ Recent Activity                            │
│ ─────────────────────────────────────────  │
│ • Task completed: Homepage design          │
│ • New comment on: Navigation               │
│ • Task created: Mobile responsive          │
└────────────────────────────────────────────┘
```

---

## Part 7: Implementation Phases

### Phase 1: Foundation (Design System)
- [ ] Update Tailwind config with new color palette
- [ ] Create CSS custom properties for theming
- [ ] Update base component styles (Button, Card, Input)
- [ ] Establish typography scale
- [ ] Set up Framer Motion defaults

### Phase 2: Core Components
- [ ] Redesign Button component with new variants
- [ ] Redesign Card component (remove gradients)
- [ ] Redesign Input/Form components
- [ ] Create new Badge component
- [ ] Update Dialog/Modal styling
- [ ] Add skeleton loading components

### Phase 3: Navigation
- [ ] Redesign Sidebar (collapsible, icon-first)
- [ ] Add Command Palette (⌘K)
- [ ] Update Header component
- [ ] Add Breadcrumb component
- [ ] Mobile navigation improvements

### Phase 4: Landing Page
- [ ] Complete rewrite with new design
- [ ] Remove all gradients and heavy styling
- [ ] Create real product screenshots
- [ ] Simplify to essential sections only
- [ ] Add subtle entrance animations

### Phase 5: Dashboard
- [ ] Redesign layout grid
- [ ] Create "Today's Focus" widget
- [ ] Redesign project cards
- [ ] Add quick actions
- [ ] Implement skeleton loading

### Phase 6: Kanban & Tasks
- [ ] Implement smooth drag-and-drop with Framer Motion
- [ ] Redesign task cards
- [ ] Add visual drag feedback
- [ ] Create task detail slide-over
- [ ] Add micro-interactions

### Phase 7: Polish & Animation
- [ ] Add page transitions
- [ ] Implement staggered list animations
- [ ] Add hover micro-interactions
- [ ] Toast notification animations
- [ ] Success/error feedback animations

### Phase 8: Mobile & Accessibility
- [ ] Touch-optimized interactions
- [ ] Responsive breakpoint audit
- [ ] WCAG 2.1 AA compliance check
- [ ] Screen reader testing
- [ ] Reduced motion support

---

## Part 8: Technical Implementation Notes

### Tailwind Config Updates

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Override default zinc with our palette
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ... rest of semantic colors
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        // ... rest
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
      },
    },
  },
}
```

### Framer Motion Setup

```tsx
// lib/motion.ts
export const transitions = {
  fast: { duration: 0.1 },
  normal: { duration: 0.15 },
  slow: { duration: 0.2 },
  spring: { type: 'spring', stiffness: 400, damping: 30 },
}

export const variants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  // ... more variants
}
```

### Component Migration Strategy

1. Create new components alongside existing (`button-v2.tsx`)
2. Test new components in isolation
3. Replace imports page-by-page
4. Remove old components after full migration

---

## References & Inspiration

### Design Systems Studied
- [Linear Design](https://linear.app) - Clean, fast, focused
- [Notion](https://notion.so) - Block-based, minimal, flexible
- [Stripe](https://stripe.com) - Polish, attention to detail
- [Vercel](https://vercel.com) - Modern, developer-focused
- [Raycast](https://raycast.com) - Command palette excellence

### Research Sources
- [Notion UI/UX Breakdown](https://medium.com/@yolu.x0918/a-breakdown-of-notion-how-ui-design-pattern-facilitates-autonomy-cleanness-and-organization-84f918e1fa48)
- [Framer Motion Best Practices](https://blog.maximeheckel.com/posts/advanced-animation-patterns-with-framer-motion/)
- [shadcn/ui Design Principles](https://ui.shadcn.com/)
- [Radix UI Accessibility](https://www.radix-ui.com/)

---

## Success Metrics

After redesign, the UI should:
- [ ] Feel "fast" even without performance changes
- [ ] Be immediately understandable to new users
- [ ] Delight users with subtle interactions
- [ ] Work flawlessly on mobile
- [ ] Score 95+ on Lighthouse accessibility
- [ ] Load perceived content in <1 second (skeletons)

---

*Document created: January 9, 2026*
*Author: AI Design Research Team*
