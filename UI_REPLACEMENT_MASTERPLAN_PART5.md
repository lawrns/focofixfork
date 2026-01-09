# FOCO UI/UX REPLACEMENT MASTERPLAN - PART 5

## IMPLEMENTATION ROADMAP & EXECUTION GUIDE

---

## PART 6: IMPLEMENTATION PHASES

### 6.1 PHASE 0: FOUNDATION (Week 1)

#### 6.1.1 Design Token Setup

**File to Create:** `src/styles/design-tokens.css`

```css
/* EXACT CSS TO IMPLEMENT */

:root {
  /* Primary Colors */
  --color-primary-50: 238 242 255;
  --color-primary-100: 224 231 255;
  --color-primary-200: 199 210 254;
  --color-primary-300: 165 180 252;
  --color-primary-400: 129 140 248;
  --color-primary-500: 99 102 241;
  --color-primary-600: 79 70 229;
  --color-primary-700: 67 56 202;
  --color-primary-800: 55 48 163;
  --color-primary-900: 49 46 129;

  /* Neutral Colors */
  --color-gray-50: 250 250 250;
  --color-gray-100: 245 245 245;
  --color-gray-200: 229 229 229;
  --color-gray-300: 212 212 212;
  --color-gray-400: 163 163 163;
  --color-gray-500: 115 115 115;
  --color-gray-600: 82 82 82;
  --color-gray-700: 64 64 64;
  --color-gray-800: 38 38 38;
  --color-gray-900: 23 23 23;
  --color-gray-950: 10 10 10;

  /* Semantic Colors */
  --color-success: 34 197 94;
  --color-warning: 234 179 8;
  --color-error: 239 68 68;
  --color-info: 59 130 246;

  /* Shadows */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.03);
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  --shadow-primary: 0 10px 40px -10px rgb(99 102 241 / 0.35);

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.25rem;
  --radius-full: 9999px;

  /* Spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.25rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-10: 2.5rem;
  --spacing-12: 3rem;
  --spacing-16: 4rem;

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Transitions */
  --transition-fast: 150ms;
  --transition-normal: 200ms;
  --transition-slow: 300ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);

  /* Layout */
  --sidebar-width: 260px;
  --sidebar-collapsed: 64px;
  --header-height: 56px;
}

.dark {
  --color-gray-50: 250 250 250;
  --color-gray-100: 245 245 245;
  --color-gray-200: 229 229 229;
  --color-gray-300: 163 163 163;
  --color-gray-400: 115 115 115;
  --color-gray-500: 64 64 64;
  --color-gray-600: 38 38 38;
  --color-gray-700: 23 23 23;
  --color-gray-800: 14 14 14;
  --color-gray-900: 9 9 9;
  --color-gray-950: 0 0 0;
}
```

**File to Update:** `tailwind.config.ts`

```typescript
// Add these color extensions
const config = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900) / <alpha-value>)',
        },
        gray: {
          50: 'rgb(var(--color-gray-50) / <alpha-value>)',
          100: 'rgb(var(--color-gray-100) / <alpha-value>)',
          200: 'rgb(var(--color-gray-200) / <alpha-value>)',
          300: 'rgb(var(--color-gray-300) / <alpha-value>)',
          400: 'rgb(var(--color-gray-400) / <alpha-value>)',
          500: 'rgb(var(--color-gray-500) / <alpha-value>)',
          600: 'rgb(var(--color-gray-600) / <alpha-value>)',
          700: 'rgb(var(--color-gray-700) / <alpha-value>)',
          800: 'rgb(var(--color-gray-800) / <alpha-value>)',
          900: 'rgb(var(--color-gray-900) / <alpha-value>)',
          950: 'rgb(var(--color-gray-950) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        'primary': 'var(--shadow-primary)',
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
};
```

#### 6.1.2 Component Library Audit

**Tasks:**
1. List all existing components in `src/components/ui/`
2. Identify which can be updated vs. replaced
3. Create new component structure

**New Directory Structure:**
```
src/
├── components/
│   ├── ui/                    # Base UI components
│   │   ├── button.tsx         # UPDATE
│   │   ├── input.tsx          # UPDATE
│   │   ├── card.tsx           # UPDATE
│   │   ├── badge.tsx          # UPDATE
│   │   ├── avatar.tsx         # UPDATE
│   │   ├── select.tsx         # UPDATE
│   │   ├── modal.tsx          # UPDATE
│   │   ├── tooltip.tsx        # UPDATE
│   │   ├── toast.tsx          # UPDATE
│   │   ├── skeleton.tsx       # CREATE
│   │   ├── dropdown-menu.tsx  # UPDATE
│   │   └── index.ts           # EXPORT ALL
│   │
│   ├── layout/                # Layout components
│   │   ├── sidebar.tsx        # CREATE/UPDATE
│   │   ├── header.tsx         # CREATE/UPDATE
│   │   ├── page-container.tsx # CREATE
│   │   └── mobile-nav.tsx     # CREATE
│   │
│   ├── landing/               # Landing page components
│   │   ├── navbar.tsx         # CREATE
│   │   ├── hero.tsx           # CREATE
│   │   ├── features.tsx       # CREATE
│   │   ├── social-proof.tsx   # CREATE
│   │   ├── testimonials.tsx   # CREATE
│   │   ├── cta-section.tsx    # CREATE
│   │   └── footer.tsx         # CREATE
│   │
│   ├── views/                 # View components
│   │   ├── kanban/
│   │   │   ├── board.tsx          # UPDATE
│   │   │   ├── column.tsx         # UPDATE
│   │   │   ├── card.tsx           # UPDATE
│   │   │   ├── card-detail.tsx    # CREATE
│   │   │   ├── quick-add.tsx      # CREATE
│   │   │   └── dnd-context.tsx    # CREATE
│   │   ├── list-view.tsx      # UPDATE
│   │   └── calendar-view.tsx  # UPDATE
│   │
│   └── shared/                # Shared components
│       ├── empty-state.tsx    # CREATE
│       ├── error-boundary.tsx # UPDATE
│       └── loading.tsx        # UPDATE
│
├── lib/
│   ├── animations.ts          # CREATE - Framer Motion variants
│   ├── cn.ts                  # UPDATE - className utility
│   └── utils.ts               # UPDATE
│
└── styles/
    ├── globals.css            # UPDATE
    └── design-tokens.css      # CREATE
```

---

### 6.2 PHASE 1: CORE COMPONENTS (Week 2)

#### Day 1-2: Button Component Redesign

**File:** `src/components/ui/button.tsx`

```tsx
// COMPLETE IMPLEMENTATION

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles
  `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg
   text-sm font-medium transition-all duration-150
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
   disabled:pointer-events-none disabled:opacity-50
   active:scale-[0.98]`,
  {
    variants: {
      variant: {
        primary: `
          bg-primary-500 text-white shadow-sm
          hover:bg-primary-600 hover:shadow-primary
          focus-visible:ring-primary-500
        `,
        secondary: `
          bg-white dark:bg-gray-800 
          text-primary-600 dark:text-primary-400 
          border border-primary-200 dark:border-primary-800
          hover:bg-primary-50 dark:hover:bg-primary-900/30
          focus-visible:ring-primary-500
        `,
        ghost: `
          text-gray-700 dark:text-gray-300
          hover:bg-gray-100 dark:hover:bg-gray-800
          focus-visible:ring-gray-500
        `,
        danger: `
          bg-red-500 text-white shadow-sm
          hover:bg-red-600
          focus-visible:ring-red-500
        `,
        success: `
          bg-green-500 text-white shadow-sm
          hover:bg-green-600
          focus-visible:ring-green-500
        `,
        link: `
          text-primary-600 dark:text-primary-400
          underline-offset-4 hover:underline
          p-0 h-auto
        `,
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md",
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-base",
        xl: "h-14 px-6 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-xs": "h-6 w-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

#### Day 3-4: Input & Form Components

**File:** `src/components/ui/input.tsx`

```tsx
// COMPLETE IMPLEMENTATION

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const id = React.useId();
    
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          
          <input
            id={id}
            type={type}
            disabled={disabled}
            className={cn(
              `w-full rounded-lg border bg-white px-3 py-2.5
               text-gray-900 placeholder:text-gray-400
               transition-all duration-150
               focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
               disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60
               dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500
               dark:border-gray-700 dark:disabled:bg-gray-800`,
              error
                ? "border-red-500 focus:ring-red-500/30 focus:border-red-500"
                : "border-gray-300 dark:border-gray-700",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            ref={ref}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        
        {(helperText || error) && (
          <p
            className={cn(
              "mt-1.5 text-xs",
              error ? "text-red-500" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
```

#### Day 5: Card Component

**File:** `src/components/ui/card.tsx`

```tsx
// COMPLETE IMPLEMENTATION

import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined" | "ghost" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl overflow-hidden",
          {
            default: "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm",
            elevated: "bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-950/50",
            outlined: "bg-transparent border border-gray-200 dark:border-gray-800",
            ghost: "bg-gray-50 dark:bg-gray-900/50",
            interactive: `
              bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm
              cursor-pointer transition-all duration-200
              hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700
              hover:-translate-y-0.5 active:scale-[0.99]
            `,
          }[variant],
          {
            none: "p-0",
            sm: "p-4",
            md: "p-6",
            lg: "p-8",
          }[padding],
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-white",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-500 dark:text-gray-400", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

---

### 6.3 PHASE 2: LAYOUT COMPONENTS (Week 3)

#### 6.3.1 Sidebar Implementation

**File:** `src/components/layout/sidebar.tsx`

```tsx
// COMPLETE IMPLEMENTATION - Key sections shown

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Search,
  Inbox,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed = false, onCollapse }: SidebarProps) {
  const pathname = usePathname();
  
  const quickLinks = [
    { icon: Home, label: "Home", href: "/dashboard" },
    { icon: Search, label: "Search", href: "/search", shortcut: "⌘K" },
    { icon: Inbox, label: "Inbox", href: "/inbox", badge: 3 },
  ];
  
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40",
        "flex flex-col",
        "bg-gray-50 dark:bg-gray-950",
        "border-r border-gray-200 dark:border-gray-800"
      )}
    >
      {/* Header - Workspace Selector */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 flex-1"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              Foco
            </span>
          </motion.div>
        )}
      </div>
      
      {/* Quick Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {quickLinks.map((link) => (
            <Tooltip key={link.href} content={collapsed ? link.label : undefined} side="right">
              <Link
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                  "text-gray-700 dark:text-gray-300",
                  "hover:bg-gray-200/50 dark:hover:bg-gray-800",
                  "transition-colors",
                  pathname === link.href && "bg-gray-200 dark:bg-gray-800 font-medium"
                )}
              >
                <link.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{link.label}</span>
                    {link.badge && (
                      <span className="px-1.5 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-full">
                        {link.badge}
                      </span>
                    )}
                    {link.shortcut && (
                      <kbd className="text-xs text-gray-400">{link.shortcut}</kbd>
                    )}
                  </>
                )}
              </Link>
            </Tooltip>
          ))}
        </div>
        
        {/* Projects Section */}
        {!collapsed && (
          <div className="mt-6">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Projects
              </span>
              <Button variant="ghost" size="icon-xs">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Project list would go here */}
          </div>
        )}
      </nav>
      
      {/* Footer - User */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <Avatar size="sm" name="John Doe" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                John Doe
              </p>
              <p className="text-xs text-gray-500 truncate">
                john@example.com
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Collapse Toggle */}
      <button
        onClick={() => onCollapse?.(!collapsed)}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2",
          "w-6 h-6 rounded-full",
          "bg-white dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "shadow-sm",
          "flex items-center justify-center",
          "text-gray-400 hover:text-gray-600",
          "transition-colors"
        )}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </motion.aside>
  );
}
```

---

### 6.4 PHASE 3: LANDING PAGE (Week 4)

#### Tasks Checklist

```markdown
□ Create src/components/landing/navbar.tsx
  - Fixed position with backdrop blur
  - Logo + navigation links + CTAs
  - Mobile hamburger menu
  
□ Create src/components/landing/hero.tsx
  - Announcement badge
  - Gradient headline
  - Subheadline
  - Two CTA buttons
  - Product screenshot with glow effect
  
□ Create src/components/landing/social-proof.tsx
  - "Trusted by" text
  - Logo grid (grayscale, color on hover)
  - Stats section
  
□ Create src/components/landing/features.tsx
  - Section header with eyebrow
  - 6-feature grid
  - Icon + title + description cards
  
□ Create src/components/landing/how-it-works.tsx
  - 3 steps with connectors
  - Step number, title, description
  
□ Create src/components/landing/testimonials.tsx
  - Masonry grid of testimonial cards
  - Avatar + quote + name + role
  
□ Create src/components/landing/cta-section.tsx
  - Gradient background
  - Headline + subheadline
  - Two CTAs
  
□ Create src/components/landing/footer.tsx
  - Logo + tagline
  - Link columns
  - Social icons
  - Copyright + theme toggle
  
□ Update src/app/page.tsx
  - Compose all sections
  - Add animations with Framer Motion
```

---

### 6.5 PHASE 4: DASHBOARD (Week 5)

#### Tasks Checklist

```markdown
□ Update src/components/layout/sidebar.tsx
  - Collapsible sidebar
  - Workspace selector
  - Quick links
  - Project list
  - User section
  
□ Create src/components/layout/header.tsx
  - Breadcrumbs
  - Page title
  - View toggle
  - Filter button
  - User menu
  
□ Update src/app/dashboard/page.tsx
  - Welcome section with greeting
  - Quick action cards
  - Summary metric cards
  - Recent activity feed
  - Upcoming deadlines
  - Project cards grid
  
□ Add animations
  - Staggered fade-in for cards
  - Smooth transitions
```

---

### 6.6 PHASE 5: KANBAN BOARD (Week 6)

#### Tasks Checklist

```markdown
□ Create src/components/views/kanban/dnd-context.tsx
  - DndContext setup
  - Sensors configuration
  - Collision detection
  - Drag overlay
  
□ Update src/components/views/kanban/board.tsx
  - Horizontal scrolling columns
  - Add column button
  - Board-level drag handlers
  
□ Update src/components/views/kanban/column.tsx
  - Column header with drag handle
  - Status dot + title + count
  - Card list with vertical sorting
  - Add card button
  - Empty state
  - Drop placeholder
  
□ Update src/components/views/kanban/card.tsx
  - Priority indicator
  - Title with line clamp
  - Labels (max 3 + overflow)
  - Subtask progress
  - Due date with color coding
  - Assignee avatar
  - Hover actions
  - Context menu
  - Drag styling (rotate, shadow)
  
□ Create src/components/views/kanban/card-detail.tsx
  - Modal with two columns
  - Editable title
  - Rich text description
  - Subtasks checklist
  - Attachments
  - Activity/comments
  - Sidebar fields
  
□ Create src/components/views/kanban/quick-add.tsx
  - Inline card creation
  - Quick field selectors
  - Keyboard shortcuts
  
□ Add drag-and-drop animations
  - Card lift on drag start
  - Rotate effect
  - Drop animation
  - Reorder animation
```

---

### 6.7 PHASE 6: POLISH & ACCESSIBILITY (Week 7)

#### Tasks Checklist

```markdown
□ Accessibility audit
  - All interactive elements focusable
  - Proper ARIA labels
  - Keyboard navigation
  - Screen reader testing
  - Color contrast check (WCAG AA)
  
□ Motion & Animation polish
  - Reduce motion mode
  - Consistent timing
  - No janky animations
  
□ Dark mode verification
  - All components render correctly
  - No flash of unstyled content
  - Proper color contrast
  
□ Mobile responsiveness
  - Test all breakpoints
  - Touch-friendly targets
  - Mobile navigation works
  
□ Performance optimization
  - Lazy load heavy components
  - Optimize images
  - Minimize bundle size
  - Check Core Web Vitals
  
□ Error states
  - Empty states designed
  - Error messages styled
  - Loading states smooth
```

---

### 6.8 PHASE 7: TESTING & LAUNCH (Week 8)

#### Tasks Checklist

```markdown
□ Unit tests
  - Component render tests
  - Interaction tests
  - Accessibility tests
  
□ Integration tests
  - Page load tests
  - Navigation tests
  - Form submission tests
  
□ E2E tests (Playwright)
  - Critical user flows
  - Kanban drag-and-drop
  - Task creation/editing
  
□ Visual regression tests
  - Component snapshots
  - Page snapshots
  - Dark mode snapshots
  
□ User testing
  - Internal team review
  - Gather feedback
  - Fix critical issues
  
□ Launch preparation
  - Documentation update
  - Changelog entry
  - Announcement prep
```

---

## PART 7: SUCCESS METRICS

### 7.1 Performance Targets

| Metric | Target | Tool |
|--------|--------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Lighthouse |
| **FID** (First Input Delay) | < 100ms | Lighthouse |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| **TTI** (Time to Interactive) | < 3.5s | Lighthouse |
| **Lighthouse Performance** | > 90 | Lighthouse |
| **Lighthouse Accessibility** | 100 | Lighthouse |

### 7.2 Quality Targets

| Metric | Target |
|--------|--------|
| **TypeScript Coverage** | 100% |
| **Unit Test Coverage** | > 80% |
| **E2E Test Coverage** | Critical flows |
| **WCAG Compliance** | AA |
| **Console Errors** | 0 |
| **Build Warnings** | 0 |

### 7.3 User Experience Targets

| Metric | Target |
|--------|--------|
| **Animation FPS** | 60fps |
| **Drag-and-Drop Latency** | < 16ms |
| **Modal Open Time** | < 150ms |
| **Page Transition Time** | < 300ms |
| **Touch Response** | < 50ms |

---

## PART 8: FILE CHANGE SUMMARY

### Files to Create (New)

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

### Files to Update (Modify)

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

## CONCLUSION

This masterplan provides a complete, executable roadmap for transforming Foco's UI/UX into a world-class, beautiful, and highly functional productivity application. Each phase builds upon the previous, with clear specifications that any AI or developer can follow.

**Key Principles to Maintain Throughout:**
1. Consistency in design tokens and spacing
2. Smooth, purposeful animations
3. Accessibility at every step
4. Performance optimization
5. Mobile-first responsiveness

**Total Estimated Time:** 6-8 weeks with dedicated effort

---

*End of UI/UX Replacement Masterplan*
