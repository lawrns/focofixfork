# Foco Design System

**Version:** 2.0  
**Philosophy:** Calm, minimal, premium. Intercom-inspired.

---

## Core Principles

1. **Calm over busy** - White space is a feature, not waste
2. **Consistent over novel** - Same patterns everywhere
3. **Functional over decorative** - Every element earns its place
4. **Accessible by default** - WCAG AA minimum

---

## Color System

### Semantic Tokens (Use These)

```css
/* Backgrounds */
--bg: white / zinc-950           /* Page background */
--bg-muted: zinc-50 / zinc-900   /* Secondary surfaces */
--bg-panel: white / zinc-900     /* Cards, panels */
--bg-elevated: white / zinc-800  /* Popovers, dropdowns */

/* Text */
--text: zinc-900 / zinc-50       /* Primary text */
--text-muted: zinc-600 / zinc-400 /* Secondary text */
--text-subtle: zinc-500 / zinc-500 /* Tertiary, labels */

/* Borders */
--border: zinc-200 / zinc-800    /* Default borders */
--border-muted: zinc-100 / zinc-900 /* Subtle dividers */

/* Interactive */
--primary: zinc-900 / zinc-50    /* Primary buttons */
--primary-hover: zinc-800 / zinc-200
--secondary: zinc-100 / zinc-800 /* Secondary surfaces */

/* Status */
--success: green-600
--warning: amber-500
--danger: red-500
--info: blue-500
```

### Status Colors (Kanban)

| Status | Light | Dark | Use |
|--------|-------|------|-----|
| Backlog | zinc-400 | zinc-500 | Unprioritized items |
| Todo | zinc-500 | zinc-400 | Ready to start |
| In Progress | indigo-500 | indigo-400 | Active work |
| Review | amber-500 | amber-400 | Needs approval |
| Done | green-500 | green-400 | Completed |
| Blocked | red-500 | red-400 | Cannot proceed |

### Priority Colors

| Priority | Color | Dot Class |
|----------|-------|-----------|
| Urgent | red-500 | `bg-red-500` |
| High | orange-500 | `bg-orange-500` |
| Medium | blue-500 | `bg-blue-500` |
| Low | zinc-400 | `bg-zinc-400` |
| None | zinc-300 | `bg-zinc-300` |

---

## Typography

### Scale

| Name | Size | Weight | Line Height | Use |
|------|------|--------|-------------|-----|
| `text-xs` | 12px | 400 | 1.5 | Badges, meta, timestamps |
| `text-sm` | 14px | 400 | 1.5 | Body text (default) |
| `text-base` | 16px | 400 | 1.5 | Large body, spacious mode |
| `text-lg` | 18px | 500 | 1.4 | Section titles |
| `text-xl` | 20px | 600 | 1.3 | Card titles |
| `text-2xl` | 24px | 600 | 1.2 | Page titles |

### Typography Classes

```tsx
// Page title
<h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">

// Section title
<h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">

// Card title
<h3 className="text-base font-medium text-zinc-900 dark:text-zinc-50">

// Body text
<p className="text-sm text-zinc-600 dark:text-zinc-400">

// Muted/helper text
<p className="text-sm text-zinc-500">

// Label
<label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
```

### Font Stack

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

---

## Spacing

### Scale (Use Tailwind Classes)

| Token | Value | Tailwind | Use |
|-------|-------|----------|-----|
| xs | 4px | `p-1`, `gap-1` | Icon padding |
| sm | 8px | `p-2`, `gap-2` | Tight spacing |
| md | 16px | `p-4`, `gap-4` | Default spacing |
| lg | 24px | `p-6`, `gap-6` | Section spacing |
| xl | 32px | `p-8`, `gap-8` | Page padding |

### Density Settings

| Mode | Row Height | Card Padding | Gap |
|------|------------|--------------|-----|
| Compact | 40px | 12px | 8px |
| Comfortable | 48px | 16px | 12px |
| Spacious | 56px | 20px | 16px |

---

## Layout Components

### PageShell

Standard page wrapper. All pages use this.

```tsx
<PageShell>
  <PageHeader
    title="Projects"
    subtitle="4 active projects"
    primaryAction={<Button>New Project</Button>}
    secondaryActions={[...]}
  />
  <PageContent>
    {/* Page content */}
  </PageContent>
</PageShell>
```

### PageHeader

Consistent header across all pages.

```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  primaryAction?: ReactNode;
  secondaryActions?: { label: string; onClick: () => void; icon?: LucideIcon }[];
  breadcrumbs?: { label: string; href: string }[];
}
```

**Rules:**
- Title is always `text-2xl font-semibold`
- Subtitle is always `text-sm text-zinc-500 mt-1`
- Primary CTA is always on the right
- Secondary actions in kebab dropdown menu
- Max 1 primary action visible

### Inspector Panel

Right-side detail view. Opens as Sheet on desktop, bottom sheet on mobile.

```tsx
<Inspector 
  open={!!selectedItem}
  onClose={() => setSelectedItem(null)}
  title={selectedItem?.title}
>
  <InspectorSection title="Details">
    {/* Fields */}
  </InspectorSection>
  <InspectorSection title="Activity">
    {/* Comments, history */}
  </InspectorSection>
</Inspector>
```

---

## Component Patterns

### Buttons

| Variant | Use | Class |
|---------|-----|-------|
| `default` | Primary actions | Dark bg, white text |
| `outline` | Secondary actions | Border, transparent bg |
| `ghost` | Tertiary, icon buttons | No border, subtle hover |
| `destructive` | Delete, dangerous actions | Red bg |

**Button Rules:**
- Icon + text: icon on left, `mr-2`
- Icon only: use `size="icon"`
- Loading: show `Loader2` icon with spin
- Disabled: reduce opacity, no pointer events

### Cards

Use sparingly. Not everything needs a card.

```tsx
// Use card for:
// - Grouped related content
// - Items in a grid
// - Elevated surfaces

// Don't use card for:
// - Single sections with no siblings
// - List items
// - Page wrappers
```

### Tables

```tsx
<DataTable
  columns={columns}
  data={data}
  onRowClick={(row) => openInspector(row)}
  selectable
  searchable
  sortable
/>
```

**Table Rules:**
- Row height: 48px (comfortable), 40px (compact)
- Hover state: subtle bg change
- Selection: checkbox column on left
- Actions: appear on hover, far right
- Keyboard: j/k to navigate, Enter to open

### Empty States

Every empty state follows this structure:

```tsx
<EmptyState
  icon={<FolderKanban />}
  title="No projects yet"
  description="Projects organize your work into focused streams."
  primaryAction={{ label: "Create project", onClick: createProject }}
  secondaryAction={{ label: "Import from CSV", onClick: importProjects }}
/>
```

**Copy Rules:**
- Title: What this section is (3-5 words)
- Description: Why it matters (1 sentence)
- Primary CTA: What to do next (verb + noun)
- Secondary: Alternative path (optional)

---

## Icons

Using Lucide React.

### Size Rules

| Context | Size | Class |
|---------|------|-------|
| Inline with text | 16px | `h-4 w-4` |
| Button icon | 16px | `h-4 w-4` |
| Card header | 20px | `h-5 w-5` |
| Empty state | 48px | `h-12 w-12` |
| Page decoration | 64px | `h-16 w-16` |

### Icon Usage

- ✅ Icon + label together
- ✅ Icon alone with tooltip
- ❌ Icon alone without tooltip
- ❌ Icon replacing readable label

---

## Motion

### Transitions

```css
/* Default transition */
transition: all 150ms ease-out;

/* Tailwind */
className="transition-colors"  /* Color changes */
className="transition-opacity" /* Fade in/out */
className="transition-all"     /* Multiple properties */
```

### Animation Classes

```tsx
// Fade in
className="animate-in fade-in duration-200"

// Slide up
className="animate-in slide-in-from-bottom-2 duration-200"

// Scale in (for modals)
className="animate-in zoom-in-95 duration-200"
```

### Rules

- No animation > 300ms
- No bouncy/springy effects
- Subtle is better than flashy
- Respect `prefers-reduced-motion`

---

## Dark Mode

### Implementation

```tsx
// ThemeProvider wraps app
<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>

// Components use dark: prefix
<div className="bg-white dark:bg-zinc-950">
```

### Color Mapping

| Light | Dark |
|-------|------|
| white | zinc-950 |
| zinc-50 | zinc-900 |
| zinc-100 | zinc-800 |
| zinc-200 | zinc-700 |
| zinc-900 | zinc-50 |

---

## Accessibility

### Focus States

```css
/* All interactive elements */
*:focus-visible {
  outline: 2px solid rgb(24 24 27);
  outline-offset: 2px;
}

/* Dark mode */
.dark *:focus-visible {
  outline-color: rgb(250 250 250);
}
```

### Required Practices

- [ ] All buttons have accessible names
- [ ] All images have alt text
- [ ] All form fields have labels
- [ ] Color is never the only indicator
- [ ] Focus order matches visual order
- [ ] Skip to main content link exists

---

## Code Examples

### Standard Page Template

```tsx
export default function ProjectsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} projects`}
        primaryAction={
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New project
          </Button>
        }
      />
      
      <PageContent>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
        />
        
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban />}
            title="No projects yet"
            description="Projects organize your work."
            primaryAction={{ label: "Create project", onClick: openCreateDialog }}
          />
        ) : (
          <DataTable
            data={projects}
            columns={columns}
            onRowClick={openInspector}
          />
        )}
      </PageContent>
      
      <Inspector
        open={!!selectedProject}
        onClose={() => setSelectedProject(null)}
      >
        <ProjectDetail project={selectedProject} />
      </Inspector>
    </PageShell>
  );
}
```

### Standard Form Dialog

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Create project</DialogTitle>
      <DialogDescription>
        Add a new project to organize your work.
      </DialogDescription>
    </DialogHeader>
    
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Website redesign" required />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" placeholder="What's this project about?" />
        <p className="text-xs text-zinc-500">Optional. Helps your team understand the goal.</p>
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create project'
          )}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

---

## Component Checklist

Before shipping any component, verify:

- [ ] Works in light and dark mode
- [ ] Works at all density settings
- [ ] Has loading state
- [ ] Has error state
- [ ] Has empty state
- [ ] Keyboard accessible
- [ ] Screen reader friendly
- [ ] Responsive (mobile → desktop)
- [ ] Follows spacing/typography rules
- [ ] Copy reviewed for tone

---

*This design system is the source of truth. When in doubt, follow these patterns.*
