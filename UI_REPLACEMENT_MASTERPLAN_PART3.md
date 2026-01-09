# FOCO UI/UX REPLACEMENT MASTERPLAN - PART 3

## PAGE-BY-PAGE REDESIGN SPECIFICATIONS

---

## PART 3: PAGE REDESIGNS

### 3.1 LANDING PAGE (`src/app/page.tsx`)

#### Current Issues
- Gradient feels dated and generic
- Hero text hierarchy needs refinement
- CTA buttons lack visual impact
- Feature cards are basic
- No social proof section
- Footer is minimal

#### New Design Vision
Inspired by **Linear**, **Vercel**, and **Raycast** landing pages - dark, sophisticated, with subtle gradients and precise typography.

#### Section-by-Section Breakdown

##### 3.1.1 Navigation Bar

```tsx
// File: src/components/landing/navbar.tsx

// Structure:
// ┌────────────────────────────────────────────────────────────────────┐
// │ [Logo]     [Products ▾] [Pricing] [Docs] [Blog]    [Login] [Start] │
// └────────────────────────────────────────────────────────────────────┘

const NavbarSpec = {
  height: '64px',
  position: 'fixed top-0 left-0 right-0',
  background: 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl',
  border: 'border-b border-gray-200/50 dark:border-gray-800/50',
  zIndex: 'z-fixed',
  
  container: 'max-w-7xl mx-auto px-6 h-full flex items-center justify-between',
  
  logo: {
    component: 'Link to /',
    content: 'Foco logo + wordmark',
    size: '32px height',
    hover: 'opacity-80 transition-opacity',
  },
  
  navLinks: {
    gap: '32px',
    font: 'text-sm font-medium',
    color: 'text-gray-600 dark:text-gray-400',
    hover: 'text-gray-900 dark:text-white',
    transition: 'transition-colors duration-150',
    activeIndicator: 'relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-500',
  },
  
  dropdownMenu: {
    trigger: 'flex items-center gap-1',
    icon: 'ChevronDown, 16px, rotates 180deg on open',
    content: {
      width: '240px',
      background: 'bg-white dark:bg-gray-900',
      border: 'border border-gray-200 dark:border-gray-800',
      shadow: 'shadow-xl',
      radius: 'rounded-xl',
      padding: 'p-2',
      animation: 'fade + slide down 8px over 150ms',
    },
  },
  
  rightSection: {
    gap: '16px',
    loginButton: {
      variant: 'ghost',
      size: 'sm',
      text: 'Log in',
    },
    ctaButton: {
      variant: 'primary',
      size: 'sm',
      text: 'Get Started Free',
      icon: 'ArrowRight on hover',
    },
  },
  
  mobileMenu: {
    breakpoint: 'lg:hidden',
    trigger: 'hamburger icon button',
    panel: 'full-screen overlay with slide-in animation',
  },
};
```

##### 3.1.2 Hero Section

```tsx
// File: src/components/landing/hero.tsx

// Visual Layout:
// 
// ┌──────────────────────────────────────────────────────────────────────┐
// │                                                                      │
// │                    [Announcement Badge]                              │
// │                                                                      │
// │              Transform Your Ideas into                               │
// │                 Beautiful Projects                                   │
// │                                                                      │
// │      The AI-powered project management platform that helps           │
// │         teams move faster with voice commands and smart              │
// │                      automation.                                     │
// │                                                                      │
// │            [Get Started Free]  [Watch Demo →]                        │
// │                                                                      │
// │                  [Product Screenshot/Video]                          │
// │                                                                      │
// └──────────────────────────────────────────────────────────────────────┘

const HeroSpec = {
  container: {
    padding: 'pt-32 pb-20 lg:pt-40 lg:pb-32',
    background: `
      relative overflow-hidden
      bg-white dark:bg-gray-950
      before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]
    `,
  },
  
  announcementBadge: {
    content: '✨ New: AI Voice Commands now available',
    styling: `
      inline-flex items-center gap-2 
      px-4 py-1.5 
      bg-indigo-500/10 dark:bg-indigo-500/20
      border border-indigo-500/20
      rounded-full
      text-sm font-medium text-indigo-600 dark:text-indigo-400
      hover:bg-indigo-500/20
      transition-colors cursor-pointer
    `,
    animation: 'subtle pulse on the sparkle icon',
    link: '/changelog',
  },
  
  headline: {
    tag: 'h1',
    content: [
      { text: 'Transform Your Ideas into', style: 'text-gray-900 dark:text-white' },
      { text: 'Beautiful Projects', style: 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500' },
    ],
    typography: `
      text-5xl md:text-6xl lg:text-7xl
      font-bold
      tracking-tight
      leading-[1.1]
      text-center
      max-w-4xl mx-auto
    `,
    animation: {
      type: 'fade-up stagger',
      delay: '100ms per line',
      duration: '600ms',
      easing: 'easeOut',
    },
  },
  
  subheadline: {
    tag: 'p',
    content: 'The AI-powered project management platform that helps teams move faster with voice commands and smart automation.',
    typography: `
      text-lg md:text-xl
      text-gray-600 dark:text-gray-400
      text-center
      max-w-2xl mx-auto
      mt-6
    `,
    animation: {
      type: 'fade-up',
      delay: '300ms',
      duration: '600ms',
    },
  },
  
  ctaButtons: {
    container: 'flex flex-col sm:flex-row items-center justify-center gap-4 mt-10',
    primary: {
      text: 'Get Started Free',
      variant: 'primary',
      size: 'lg',
      icon: 'ArrowRight',
      iconPosition: 'right',
      className: 'min-w-[180px] shadow-primary',
      animation: 'icon slides right 4px on hover',
    },
    secondary: {
      text: 'Watch Demo',
      variant: 'secondary',
      size: 'lg',
      icon: 'Play',
      iconPosition: 'left',
      className: 'min-w-[160px]',
    },
    animation: {
      type: 'fade-up',
      delay: '400ms',
      duration: '600ms',
    },
  },
  
  productPreview: {
    container: 'mt-16 lg:mt-24 max-w-6xl mx-auto px-4',
    wrapper: `
      relative
      rounded-2xl
      border border-gray-200 dark:border-gray-800
      shadow-2xl dark:shadow-dark-lg
      overflow-hidden
      bg-gray-100 dark:bg-gray-900
    `,
    aspectRatio: 'aspect-[16/10]',
    content: 'Dashboard screenshot or video',
    glowEffect: `
      before:absolute before:inset-0 before:-z-10
      before:bg-gradient-to-r before:from-indigo-500/20 before:via-purple-500/20 before:to-pink-500/20
      before:blur-3xl before:scale-150
    `,
    animation: {
      type: 'fade-up + scale from 0.95',
      delay: '500ms',
      duration: '800ms',
    },
  },
};
```

##### 3.1.3 Social Proof / Logos Section

```tsx
// File: src/components/landing/social-proof.tsx

const SocialProofSpec = {
  container: 'py-16 border-y border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/30',
  
  heading: {
    text: 'Trusted by innovative teams worldwide',
    typography: 'text-sm font-medium text-gray-500 dark:text-gray-500 text-center uppercase tracking-wider',
  },
  
  logos: {
    container: 'mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-8',
    logoStyle: 'h-8 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300',
    companies: ['Vercel', 'Stripe', 'Notion', 'Linear', 'Figma', 'GitHub'],
  },
  
  stats: {
    container: 'mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto',
    items: [
      { value: '10K+', label: 'Active Teams' },
      { value: '2M+', label: 'Tasks Completed' },
      { value: '99.9%', label: 'Uptime' },
      { value: '4.9/5', label: 'User Rating' },
    ],
    valueStyle: 'text-3xl md:text-4xl font-bold text-gray-900 dark:text-white',
    labelStyle: 'text-sm text-gray-500 dark:text-gray-400 mt-1',
  },
};
```

##### 3.1.4 Features Section

```tsx
// File: src/components/landing/features.tsx

const FeaturesSpec = {
  container: 'py-24 lg:py-32',
  
  sectionHeader: {
    eyebrow: {
      text: 'Features',
      style: 'text-indigo-600 dark:text-indigo-400 text-sm font-semibold uppercase tracking-wider',
    },
    headline: {
      text: 'Everything you need to ship faster',
      style: 'mt-2 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white',
    },
    description: {
      text: 'Powerful features designed for modern teams. Simple enough for anyone, powerful enough for experts.',
      style: 'mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl',
    },
  },
  
  featureGrid: {
    container: 'mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8',
    
    card: {
      padding: 'p-8',
      background: 'bg-white dark:bg-gray-900',
      border: 'border border-gray-200 dark:border-gray-800',
      radius: 'rounded-2xl',
      hover: 'hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300',
      
      icon: {
        container: 'w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center',
        size: '24px',
        color: 'text-indigo-600 dark:text-indigo-400',
      },
      
      title: 'mt-6 text-lg font-semibold text-gray-900 dark:text-white',
      description: 'mt-2 text-gray-600 dark:text-gray-400 leading-relaxed',
    },
  },
  
  features: [
    {
      icon: 'Mic',
      title: 'Voice Commands',
      description: 'Create tasks, update projects, and navigate your workspace using natural voice commands powered by AI.',
    },
    {
      icon: 'Kanban',
      title: 'Beautiful Kanban',
      description: 'Visualize your workflow with smooth drag-and-drop boards. Customizable columns and smart automations.',
    },
    {
      icon: 'Zap',
      title: 'Smart Automations',
      description: 'Automate repetitive tasks with powerful rules. Set triggers, conditions, and actions without code.',
    },
    {
      icon: 'Users',
      title: 'Real-time Collaboration',
      description: 'Work together seamlessly with live cursors, instant updates, and threaded comments.',
    },
    {
      icon: 'BarChart3',
      title: 'Insightful Analytics',
      description: 'Track progress with beautiful charts. Understand velocity, bottlenecks, and team performance.',
    },
    {
      icon: 'Shield',
      title: 'Enterprise Security',
      description: 'SOC 2 compliant with SSO, audit logs, and granular permissions. Your data is always protected.',
    },
  ],
};
```

##### 3.1.5 How It Works Section

```tsx
// File: src/components/landing/how-it-works.tsx

const HowItWorksSpec = {
  container: 'py-24 lg:py-32 bg-gray-50 dark:bg-gray-900/50',
  
  sectionHeader: {
    eyebrow: 'How it works',
    headline: 'From idea to done in 3 simple steps',
    centered: true,
  },
  
  steps: {
    container: 'mt-20 max-w-5xl mx-auto',
    layout: 'grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8',
    
    step: {
      alignment: 'text-center',
      
      number: {
        size: '48px',
        style: `
          inline-flex items-center justify-center
          w-12 h-12
          rounded-full
          bg-indigo-500
          text-white font-bold text-lg
        `,
      },
      
      connector: {
        type: 'dashed line between steps on desktop',
        style: 'hidden lg:block absolute top-6 left-1/2 w-full border-t-2 border-dashed border-gray-300 dark:border-gray-700',
      },
      
      title: 'mt-6 text-xl font-semibold text-gray-900 dark:text-white',
      description: 'mt-3 text-gray-600 dark:text-gray-400',
      
      illustration: {
        type: 'simple icon or mini-screenshot',
        size: '200px',
        position: 'above the number',
      },
    },
  },
  
  stepsContent: [
    {
      number: 1,
      title: 'Create Your Project',
      description: 'Start with a template or from scratch. Invite your team and set up your workflow in minutes.',
    },
    {
      number: 2,
      title: 'Add Tasks & Collaborate',
      description: 'Break down work into tasks. Assign, comment, and track progress together in real-time.',
    },
    {
      number: 3,
      title: 'Ship & Celebrate',
      description: 'Complete tasks, hit milestones, and watch the confetti fly. Celebrate every win with your team.',
    },
  ],
};
```

##### 3.1.6 Testimonials Section

```tsx
// File: src/components/landing/testimonials.tsx

const TestimonialsSpec = {
  container: 'py-24 lg:py-32',
  
  sectionHeader: {
    eyebrow: 'Testimonials',
    headline: 'Loved by teams everywhere',
    centered: true,
  },
  
  testimonialGrid: {
    container: 'mt-16 columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6',
    
    card: {
      display: 'break-inside-avoid',
      padding: 'p-6',
      background: 'bg-white dark:bg-gray-900',
      border: 'border border-gray-200 dark:border-gray-800',
      radius: 'rounded-xl',
      
      quote: 'text-gray-700 dark:text-gray-300 leading-relaxed',
      
      author: {
        container: 'mt-6 flex items-center gap-3',
        avatar: '40px circle',
        name: 'font-medium text-gray-900 dark:text-white',
        role: 'text-sm text-gray-500 dark:text-gray-400',
        company: 'text-sm text-gray-500',
      },
      
      rating: {
        display: '5 star icons',
        color: 'text-yellow-400',
        size: '16px',
      },
    },
  },
  
  testimonials: [
    {
      quote: "Foco transformed how our team works. The voice commands alone save us hours every week.",
      author: 'Sarah Chen',
      role: 'Engineering Lead',
      company: 'TechCorp',
      avatar: '/avatars/sarah.jpg',
    },
    // ... more testimonials
  ],
};
```

##### 3.1.7 CTA Section

```tsx
// File: src/components/landing/cta-section.tsx

const CTASectionSpec = {
  container: 'py-24 lg:py-32',
  
  wrapper: `
    max-w-4xl mx-auto
    rounded-3xl
    bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
    p-12 lg:p-16
    text-center
    relative overflow-hidden
  `,
  
  glowEffects: `
    before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent_50%)]
    after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_40%)]
  `,
  
  headline: {
    text: 'Ready to transform your workflow?',
    style: 'text-3xl md:text-4xl font-bold text-white',
  },
  
  subheadline: {
    text: 'Join thousands of teams already using Foco to ship faster.',
    style: 'mt-4 text-lg text-white/80',
  },
  
  buttons: {
    container: 'mt-8 flex flex-col sm:flex-row items-center justify-center gap-4',
    primary: {
      text: 'Start Free Trial',
      style: 'bg-white text-indigo-600 hover:bg-gray-100',
      size: 'lg',
    },
    secondary: {
      text: 'Talk to Sales',
      style: 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
      size: 'lg',
    },
  },
  
  noCreditCard: {
    text: 'No credit card required • Free 14-day trial',
    style: 'mt-6 text-sm text-white/60',
  },
};
```

##### 3.1.8 Footer

```tsx
// File: src/components/landing/footer.tsx

const FooterSpec = {
  container: 'py-16 border-t border-gray-200 dark:border-gray-800',
  
  layout: 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8',
  
  brand: {
    logo: 'Foco logo',
    tagline: 'The AI-powered project management platform.',
    social: {
      icons: ['Twitter', 'GitHub', 'LinkedIn', 'YouTube'],
      size: '20px',
      color: 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
    },
  },
  
  columns: [
    {
      title: 'Product',
      links: ['Features', 'Pricing', 'Integrations', 'Changelog', 'Roadmap'],
    },
    {
      title: 'Resources',
      links: ['Documentation', 'API Reference', 'Guides', 'Blog', 'Community'],
    },
    {
      title: 'Company',
      links: ['About', 'Careers', 'Press', 'Contact'],
    },
    {
      title: 'Legal',
      links: ['Privacy', 'Terms', 'Security', 'Cookies'],
    },
  ],
  
  bottom: {
    container: 'mt-16 pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4',
    copyright: '© 2025 Foco. All rights reserved.',
    themeToggle: 'Dark/Light mode switch',
    languageSelector: 'Language dropdown',
  },
};
```

---

### 3.2 DASHBOARD PAGE (`src/app/dashboard/page.tsx`)

#### Design Vision
Clean, data-focused interface inspired by **Linear** and **Notion**. Emphasize content hierarchy, reduce chrome, maximize workspace.

#### Layout Structure

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Sidebar]                                                                │
│ ┌──────────┐ ┌────────────────────────────────────────────────────────┐ │
│ │          │ │ [Header: Page title, actions, user menu]               │ │
│ │          │ ├────────────────────────────────────────────────────────┤ │
│ │          │ │                                                        │ │
│ │  Quick   │ │  [Main Content Area]                                   │ │
│ │  Access  │ │                                                        │ │
│ │          │ │  - Welcome message                                     │ │
│ │  ──────  │ │  - Quick actions                                       │ │
│ │          │ │  - Recent activity                                     │ │
│ │ Projects │ │  - Task summary cards                                  │ │
│ │          │ │  - Upcoming deadlines                                  │ │
│ │  ──────  │ │                                                        │ │
│ │          │ │                                                        │ │
│ │ Settings │ │                                                        │ │
│ │          │ │                                                        │ │
│ └──────────┘ └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

##### 3.2.1 Sidebar Component

```tsx
// File: src/components/layout/sidebar.tsx

const SidebarSpec = {
  dimensions: {
    width: '260px',
    collapsedWidth: '64px',
    minHeight: '100vh',
  },
  
  styling: {
    background: 'bg-gray-50 dark:bg-gray-950',
    border: 'border-r border-gray-200 dark:border-gray-800',
  },
  
  sections: {
    header: {
      height: '64px',
      content: 'Workspace selector dropdown',
      padding: 'px-4',
    },
    
    quickActions: {
      items: [
        { icon: 'Search', label: 'Search', shortcut: '⌘K' },
        { icon: 'Inbox', label: 'Inbox', badge: 3 },
        { icon: 'Home', label: 'Home' },
      ],
      itemStyle: `
        flex items-center gap-3 px-3 py-2
        text-sm text-gray-700 dark:text-gray-300
        rounded-lg
        hover:bg-gray-200/50 dark:hover:bg-gray-800
        transition-colors
      `,
    },
    
    projects: {
      header: {
        text: 'Projects',
        action: 'Plus icon to create new',
      },
      item: {
        icon: 'colored dot or emoji',
        label: 'project name',
        actions: 'More menu on hover',
        style: 'same as quickActions.itemStyle',
        active: 'bg-gray-200 dark:bg-gray-800',
      },
      emptyState: 'Create your first project illustration',
    },
    
    footer: {
      content: 'User avatar + name + settings link',
      height: '60px',
    },
  },
  
  collapseToggle: {
    position: 'absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2',
    styling: 'w-6 h-6 bg-white dark:bg-gray-800 border rounded-full shadow-sm flex items-center justify-center cursor-pointer hover:bg-gray-100',
    icon: 'ChevronLeft (ChevronRight when collapsed)',
  },
  
  animation: {
    collapse: {
      duration: '200ms',
      easing: 'ease-out',
      width: 'animate width from 260px to 64px',
      labels: 'fade out with 100ms delay',
    },
  },
};
```

##### 3.2.2 Dashboard Header

```tsx
// File: src/components/layout/dashboard-header.tsx

const DashboardHeaderSpec = {
  dimensions: {
    height: '56px',
    position: 'sticky top-0',
    zIndex: 'z-sticky',
  },
  
  styling: {
    background: 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl',
    border: 'border-b border-gray-200/50 dark:border-gray-800/50',
    padding: 'px-6',
  },
  
  layout: 'flex items-center justify-between',
  
  left: {
    breadcrumb: {
      items: ['Projects', 'My Project', 'Tasks'],
      separator: 'ChevronRight icon',
      style: 'text-sm text-gray-500 dark:text-gray-400',
      activeStyle: 'text-gray-900 dark:text-white font-medium',
    },
    pageTitle: 'text-lg font-semibold text-gray-900 dark:text-white',
  },
  
  right: {
    container: 'flex items-center gap-2',
    
    viewToggle: {
      options: ['Board', 'List', 'Calendar', 'Timeline'],
      style: 'segmented button group',
      activeStyle: 'bg-gray-200 dark:bg-gray-700',
    },
    
    filterButton: {
      icon: 'Filter',
      badge: 'number if filters active',
    },
    
    shareButton: {
      icon: 'Share2',
      text: 'Share',
    },
    
    moreMenu: {
      icon: 'MoreHorizontal',
    },
    
    userMenu: {
      avatar: '32px',
      dropdown: 'settings, theme, logout',
    },
  },
};
```

##### 3.2.3 Dashboard Content

```tsx
// File: src/app/dashboard/page.tsx

const DashboardContentSpec = {
  container: 'p-6 lg:p-8 max-w-7xl mx-auto',
  
  welcomeSection: {
    greeting: {
      text: 'Good morning, {userName}',
      style: 'text-2xl font-semibold text-gray-900 dark:text-white',
    },
    date: {
      text: 'Today is {formattedDate}',
      style: 'text-sm text-gray-500 dark:text-gray-400 mt-1',
    },
  },
  
  quickActions: {
    container: 'mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
    
    card: {
      styling: `
        p-4
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-800
        rounded-xl
        cursor-pointer
        hover:border-indigo-500/50 hover:shadow-md
        transition-all duration-200
      `,
      icon: '40px, colored background',
      title: 'font-medium text-gray-900 dark:text-white',
      description: 'text-sm text-gray-500',
    },
    
    actions: [
      { icon: 'Plus', title: 'New Task', description: 'Create a quick task', color: 'indigo' },
      { icon: 'Mic', title: 'Voice Command', description: 'Speak to create', color: 'purple' },
      { icon: 'FileText', title: 'New Document', description: 'Start writing', color: 'blue' },
      { icon: 'Users', title: 'Invite Team', description: 'Add collaborators', color: 'green' },
    ],
  },
  
  summaryCards: {
    container: 'mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
    
    card: {
      padding: 'p-6',
      styling: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl',
      
      value: 'text-3xl font-bold text-gray-900 dark:text-white',
      label: 'text-sm text-gray-500 dark:text-gray-400 mt-1',
      change: {
        positive: 'text-green-600 flex items-center gap-1 text-sm mt-2',
        negative: 'text-red-600 flex items-center gap-1 text-sm mt-2',
      },
      icon: 'top-right corner, muted color',
    },
    
    metrics: [
      { value: '12', label: 'Tasks Due Today', change: '+3 from yesterday', trend: 'neutral' },
      { value: '28', label: 'In Progress', change: '+5 this week', trend: 'up' },
      { value: '156', label: 'Completed', change: '+23 this week', trend: 'up' },
      { value: '94%', label: 'On Track', change: '-2% from last week', trend: 'down' },
    ],
  },
  
  mainGrid: {
    container: 'mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6',
    
    recentActivity: {
      span: 'lg:col-span-2',
      title: 'Recent Activity',
      content: 'Activity feed with avatars, actions, timestamps',
      seeAll: 'View all activity →',
    },
    
    upcomingDeadlines: {
      span: 'lg:col-span-1',
      title: 'Upcoming Deadlines',
      content: 'List of tasks with due dates',
      emptyState: 'No upcoming deadlines 🎉',
    },
  },
  
  projectsSection: {
    container: 'mt-8',
    header: {
      title: 'Your Projects',
      action: 'See all →',
    },
    grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    
    projectCard: {
      padding: 'p-6',
      styling: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:shadow-md transition-shadow',
      
      header: 'flex items-center gap-3',
      icon: 'project emoji or icon',
      title: 'font-medium text-gray-900 dark:text-white',
      members: 'avatar stack',
      
      progress: {
        bar: 'h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4',
        fill: 'h-full bg-indigo-500 rounded-full transition-all',
      },
      
      stats: 'mt-3 flex items-center gap-4 text-sm text-gray-500',
    },
  },
};
```

---

*Continue to PART 4 in UI_REPLACEMENT_MASTERPLAN_PART4.md*
