# FOCO UI/UX COMPLETE REPLACEMENT MASTERPLAN

**Version:** 1.0  
**Date:** January 9, 2026  
**Status:** Ready for Implementation  
**Estimated Duration:** 6-8 weeks

---

## EXECUTIVE SUMMARY

This document provides an exhaustive, step-by-step plan to completely redesign the Foco application UI/UX. Inspired by **Linear**, **Notion**, **Asana**, and **ClickUp**, this plan transforms Foco from a functional but dated interface into a world-class, beautiful productivity application.

### Design Philosophy: "Refined Simplicity"

**Core Principles:**
1. **Radical Minimalism** - Every element must earn its place
2. **Visual Hierarchy** - Guide attention with precision typography and spacing
3. **Delightful Interactions** - Smooth, satisfying micro-animations
4. **Dark-First Design** - Premium dark mode with equally polished light mode
5. **Accessibility-Native** - WCAG 2.1 AA built into every decision

### Inspiration Sources

| Application | Key Learnings |
|-------------|---------------|
| **Linear** | Dark mode excellence, reduced visual noise, timeless UI chrome, subtle gradients |
| **Notion** | Clean whitespace, flexible layouts, elegant typography, seamless editing |
| **Asana** | Color-coded projects, celebration animations, personality through color |
| **ClickUp** | Modern card designs, smooth transitions, comprehensive feature organization |
| **Vercel Geist** | Monochromatic elegance, bold typography, sophisticated spacing |

---

## PART 1: DESIGN TOKENS & VARIABLES

### 1.1 COLOR SYSTEM

#### Primary Brand Colors (Indigo-Purple Gradient)

```css
/* Primary - Shifted from blue to indigo for more sophistication */
--color-primary-50: 238 242 255;   /* #EEF2FF */
--color-primary-100: 224 231 255;  /* #E0E7FF */
--color-primary-200: 199 210 254;  /* #C7D2FE */
--color-primary-300: 165 180 252;  /* #A5B4FC */
--color-primary-400: 129 140 248;  /* #818CF8 */
--color-primary-500: 99 102 241;   /* #6366F1 - PRIMARY */
--color-primary-600: 79 70 229;    /* #4F46E5 - HOVER */
--color-primary-700: 67 56 202;    /* #4338CA */
--color-primary-800: 55 48 163;    /* #3730A3 */
--color-primary-900: 49 46 129;    /* #312E81 */
```

#### Accent Colors (For Gradients & Highlights)

```css
--color-accent-violet: 139 92 246;   /* #8B5CF6 */
--color-accent-fuchsia: 217 70 239;  /* #D946EF */
--color-accent-cyan: 34 211 238;     /* #22D3EE */
--color-accent-emerald: 52 211 153;  /* #34D399 */
--color-accent-amber: 251 191 36;    /* #FBBF24 */
--color-accent-rose: 251 113 133;    /* #FB7185 */
```

#### Neutral Palette (Light Mode)

```css
--color-gray-50: 250 250 250;   /* #FAFAFA - Page background */
--color-gray-100: 245 245 245;  /* #F5F5F5 - Card background */
--color-gray-200: 229 229 229;  /* #E5E5E5 - Borders */
--color-gray-300: 212 212 212;  /* #D4D4D4 - Disabled borders */
--color-gray-400: 163 163 163;  /* #A3A3A3 - Placeholder text */
--color-gray-500: 115 115 115;  /* #737373 - Secondary text */
--color-gray-600: 82 82 82;     /* #525252 - Body text */
--color-gray-700: 64 64 64;     /* #404040 - Headings */
--color-gray-800: 38 38 38;     /* #262626 - Primary text */
--color-gray-900: 23 23 23;     /* #171717 - Strongest text */
--color-gray-950: 10 10 10;     /* #0A0A0A - Near black */
```

#### Neutral Palette (Dark Mode)

```css
--color-dark-50: 250 250 250;   /* #FAFAFA - Primary text */
--color-dark-100: 245 245 245;  /* #F5F5F5 - Headings */
--color-dark-200: 229 229 229;  /* #E5E5E5 - Secondary text */
--color-dark-300: 163 163 163;  /* #A3A3A3 - Tertiary text */
--color-dark-400: 115 115 115;  /* #737373 - Placeholder */
--color-dark-500: 64 64 64;     /* #404040 - Borders */
--color-dark-600: 38 38 38;     /* #262626 - Card background */
--color-dark-700: 23 23 23;     /* #171717 - Elevated surface */
--color-dark-800: 14 14 14;     /* #0E0E0E - Surface */
--color-dark-900: 9 9 9;        /* #090909 - Page background */
--color-dark-950: 0 0 0;        /* #000000 - True black */
```

#### Semantic Colors

```css
/* Success */
--color-success-50: 240 253 244;
--color-success-500: 34 197 94;   /* #22C55E */
--color-success-600: 22 163 74;   /* #16A34A */

/* Warning */
--color-warning-50: 254 252 232;
--color-warning-500: 234 179 8;   /* #EAB308 */
--color-warning-600: 202 138 4;   /* #CA8A04 */

/* Error */
--color-error-50: 254 242 242;
--color-error-500: 239 68 68;     /* #EF4444 */
--color-error-600: 220 38 38;     /* #DC2626 */

/* Info */
--color-info-50: 239 246 255;
--color-info-500: 59 130 246;     /* #3B82F6 */
--color-info-600: 37 99 235;      /* #2563EB */
```

#### Status Colors (For Kanban & Tasks)

```css
--color-status-backlog: 148 163 184;    /* #94A3B8 - Slate */
--color-status-todo: 100 116 139;       /* #64748B - Slate darker */
--color-status-in-progress: 99 102 241; /* #6366F1 - Indigo */
--color-status-review: 245 158 11;      /* #F59E0B - Amber */
--color-status-done: 34 197 94;         /* #22C55E - Green */
--color-status-cancelled: 107 114 128;  /* #6B7280 - Gray */
```

#### Priority Colors

```css
--color-priority-urgent: 239 68 68;   /* #EF4444 - Red */
--color-priority-high: 249 115 22;    /* #F97316 - Orange */
--color-priority-medium: 99 102 241;  /* #6366F1 - Indigo */
--color-priority-low: 148 163 184;    /* #94A3B8 - Slate */
--color-priority-none: 212 212 212;   /* #D4D4D4 - Gray */
```

### 1.2 GRADIENT DEFINITIONS

```css
/* Primary gradient - for CTAs and hero elements */
--gradient-primary: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%);

/* Subtle gradient - for cards and backgrounds */
--gradient-subtle: linear-gradient(180deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.02) 100%);

/* Glass gradient - for glassmorphism effects */
--gradient-glass: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);

/* Dark gradient - for dark mode surfaces */
--gradient-dark: linear-gradient(180deg, rgba(99, 102, 241, 0.1) 0%, rgba(0, 0, 0, 0) 100%);

/* Mesh gradient - for hero backgrounds */
--gradient-mesh: radial-gradient(at 27% 37%, hsla(259, 84%, 78%, 0.15) 0px, transparent 50%),
                 radial-gradient(at 97% 21%, hsla(259, 84%, 78%, 0.1) 0px, transparent 50%),
                 radial-gradient(at 52% 99%, hsla(259, 84%, 78%, 0.1) 0px, transparent 50%),
                 radial-gradient(at 10% 29%, hsla(259, 84%, 78%, 0.08) 0px, transparent 50%);

/* Success celebration gradient */
--gradient-success: linear-gradient(135deg, #22C55E 0%, #34D399 100%);

/* Status gradients */
--gradient-status-progress: linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%);
```

### 1.3 TYPOGRAPHY SYSTEM

```css
/* Font Families */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-display: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;

/* Font Sizes - Refined scale */
--text-2xs: 0.625rem;   /* 10px - Tiny labels */
--text-xs: 0.75rem;     /* 12px - Captions, badges */
--text-sm: 0.875rem;    /* 14px - Secondary text, buttons */
--text-base: 1rem;      /* 16px - Body text */
--text-lg: 1.125rem;    /* 18px - Large body */
--text-xl: 1.25rem;     /* 20px - Small headings */
--text-2xl: 1.5rem;     /* 24px - Section headings */
--text-3xl: 1.875rem;   /* 30px - Page headings */
--text-4xl: 2.25rem;    /* 36px - Large headings */
--text-5xl: 3rem;       /* 48px - Hero headings */
--text-6xl: 3.75rem;    /* 60px - Display headings */
--text-7xl: 4.5rem;     /* 72px - Massive display */

/* Font Weights */
--font-thin: 100;
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
--font-black: 900;

/* Line Heights */
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;

/* Letter Spacing */
--tracking-tighter: -0.05em;
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
--tracking-widest: 0.1em;
```

### 1.4 SPACING SYSTEM (8px Grid)

```css
--spacing-0: 0;
--spacing-px: 1px;
--spacing-0.5: 0.125rem;  /* 2px */
--spacing-1: 0.25rem;     /* 4px */
--spacing-1.5: 0.375rem;  /* 6px */
--spacing-2: 0.5rem;      /* 8px */
--spacing-2.5: 0.625rem;  /* 10px */
--spacing-3: 0.75rem;     /* 12px */
--spacing-3.5: 0.875rem;  /* 14px */
--spacing-4: 1rem;        /* 16px */
--spacing-5: 1.25rem;     /* 20px */
--spacing-6: 1.5rem;      /* 24px */
--spacing-7: 1.75rem;     /* 28px */
--spacing-8: 2rem;        /* 32px */
--spacing-9: 2.25rem;     /* 36px */
--spacing-10: 2.5rem;     /* 40px */
--spacing-11: 2.75rem;    /* 44px */
--spacing-12: 3rem;       /* 48px */
--spacing-14: 3.5rem;     /* 56px */
--spacing-16: 4rem;       /* 64px */
--spacing-20: 5rem;       /* 80px */
--spacing-24: 6rem;       /* 96px */
--spacing-28: 7rem;       /* 112px */
--spacing-32: 8rem;       /* 128px */
--spacing-36: 9rem;       /* 144px */
--spacing-40: 10rem;      /* 160px */
--spacing-44: 11rem;      /* 176px */
--spacing-48: 12rem;      /* 192px */
--spacing-52: 13rem;      /* 208px */
--spacing-56: 14rem;      /* 224px */
--spacing-60: 15rem;      /* 240px */
--spacing-64: 16rem;      /* 256px */
--spacing-72: 18rem;      /* 288px */
--spacing-80: 20rem;      /* 320px */
--spacing-96: 24rem;      /* 384px */
```

### 1.5 BORDER RADIUS

```css
--radius-none: 0;
--radius-sm: 0.25rem;     /* 4px */
--radius-default: 0.375rem; /* 6px */
--radius-md: 0.5rem;      /* 8px */
--radius-lg: 0.75rem;     /* 12px */
--radius-xl: 1rem;        /* 16px */
--radius-2xl: 1.25rem;    /* 20px */
--radius-3xl: 1.5rem;     /* 24px */
--radius-full: 9999px;    /* Pill shape */
```

### 1.6 SHADOWS

```css
/* Light Mode Shadows */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.03);
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-default: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
--shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);

/* Dark Mode Shadows */
--shadow-dark-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
--shadow-dark-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
--shadow-dark-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4);

/* Colored Shadows - for emphasis */
--shadow-primary: 0 10px 40px -10px rgb(99 102 241 / 0.35);
--shadow-success: 0 10px 40px -10px rgb(34 197 94 / 0.35);
--shadow-error: 0 10px 40px -10px rgb(239 68 68 / 0.35);

/* Glow Effects */
--glow-primary: 0 0 20px rgb(99 102 241 / 0.4);
--glow-success: 0 0 20px rgb(34 197 94 / 0.4);
```

### 1.7 ANIMATION & TRANSITIONS

```css
/* Durations */
--duration-75: 75ms;
--duration-100: 100ms;
--duration-150: 150ms;
--duration-200: 200ms;
--duration-300: 300ms;
--duration-500: 500ms;
--duration-700: 700ms;
--duration-1000: 1000ms;

/* Timing Functions */
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-elastic: cubic-bezier(0.68, -0.6, 0.32, 1.6);
--ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);

/* Common Transitions */
--transition-none: none;
--transition-all: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-default: color, background-color, border-color, text-decoration-color, fill, stroke 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-colors: color, background-color, border-color, text-decoration-color, fill, stroke 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-opacity: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-shadow: box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-transform: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
```

### 1.8 Z-INDEX SCALE

```css
--z-0: 0;
--z-10: 10;
--z-20: 20;
--z-30: 30;
--z-40: 40;
--z-50: 50;
--z-dropdown: 1000;
--z-sticky: 1100;
--z-fixed: 1200;
--z-modal-backdrop: 1300;
--z-modal: 1400;
--z-popover: 1500;
--z-tooltip: 1600;
--z-toast: 1700;
--z-max: 9999;
```

### 1.9 BREAKPOINTS

```css
--breakpoint-xs: 475px;
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

### 1.10 COMPONENT-SPECIFIC TOKENS

```css
/* Sidebar */
--sidebar-width: 260px;
--sidebar-collapsed-width: 64px;
--sidebar-bg: var(--color-gray-900);
--sidebar-bg-dark: var(--color-dark-950);

/* Header */
--header-height: 56px;
--header-bg: rgba(255, 255, 255, 0.8);
--header-bg-dark: rgba(9, 9, 9, 0.8);
--header-blur: 12px;

/* Cards */
--card-padding: 1.5rem;
--card-padding-sm: 1rem;
--card-padding-lg: 2rem;
--card-radius: var(--radius-xl);
--card-border: 1px solid rgb(var(--color-gray-200));
--card-shadow: var(--shadow-sm);
--card-shadow-hover: var(--shadow-md);

/* Inputs */
--input-height: 40px;
--input-height-sm: 32px;
--input-height-lg: 48px;
--input-padding-x: 0.75rem;
--input-radius: var(--radius-md);
--input-border: 1px solid rgb(var(--color-gray-300));
--input-focus-ring: 0 0 0 2px rgb(var(--color-primary-500) / 0.2);

/* Buttons */
--button-height: 40px;
--button-height-sm: 32px;
--button-height-lg: 48px;
--button-padding-x: 1rem;
--button-radius: var(--radius-md);

/* Kanban */
--kanban-column-width: 320px;
--kanban-column-gap: 1rem;
--kanban-card-gap: 0.5rem;
--kanban-card-radius: var(--radius-lg);
```

---

*Continue to PART 2 in UI_REPLACEMENT_MASTERPLAN_PART2.md*
