# FOCO UI/UX REPLACEMENT MASTERPLAN - PART 4

## KANBAN VIEW & DRAG-AND-DROP SPECIFICATIONS

---

## PART 4: KANBAN BOARD REDESIGN

### 4.1 KANBAN OVERVIEW

#### Design Vision
World-class drag-and-drop experience inspired by **Linear**, **Notion**, and **Trello**. Buttery smooth animations, clear visual feedback, and delightful micro-interactions.

#### Layout Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Board Header: Title, filters, view options]                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────┐ │
│  │ Backlog (5) │  │ To Do (3)   │  │ In Progress │  │ Review (1)  │  │ +  │ │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤  └────┘ │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │         │
│  │ │  Card   │ │  │ │  Card   │ │  │ │  Card   │ │  │ │  Card   │ │         │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │         │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │             │  │             │         │
│  │ │  Card   │ │  │ │  Card   │ │  │ [+ Add]     │  │ [+ Add]     │         │
│  │ └─────────┘ │  │ └─────────┘ │  │             │  │             │         │
│  │             │  │             │  │             │  │             │         │
│  │ [+ Add]     │  │ [+ Add]     │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 BOARD HEADER

```tsx
// File: src/components/views/kanban/board-header.tsx

const BoardHeaderSpec = {
  container: 'flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800',
  
  left: {
    title: {
      editable: true,
      style: 'text-xl font-semibold text-gray-900 dark:text-white',
      placeholder: 'Untitled Board',
      hoverStyle: 'hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2',
    },
    
    description: {
      editable: true,
      style: 'text-sm text-gray-500 dark:text-gray-400 mt-1',
      placeholder: 'Add a description...',
    },
  },
  
  center: {
    filters: {
      container: 'flex items-center gap-2',
      
      searchInput: {
        placeholder: 'Filter tasks...',
        icon: 'Search',
        width: '200px',
        style: 'text-sm',
      },
      
      filterDropdowns: [
        { label: 'Assignee', icon: 'User', multiSelect: true },
        { label: 'Priority', icon: 'Flag', multiSelect: true },
        { label: 'Labels', icon: 'Tag', multiSelect: true },
        { label: 'Due Date', icon: 'Calendar', type: 'dateRange' },
      ],
      
      activeFilterBadge: {
        style: 'ml-1 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs rounded-full',
      },
      
      clearFilters: {
        text: 'Clear all',
        style: 'text-sm text-gray-500 hover:text-gray-700',
        showWhen: 'any filter active',
      },
    },
  },
  
  right: {
    container: 'flex items-center gap-2',
    
    viewToggle: {
      type: 'segmented control',
      options: [
        { value: 'board', icon: 'Kanban', label: 'Board' },
        { value: 'list', icon: 'List', label: 'List' },
        { value: 'calendar', icon: 'Calendar', label: 'Calendar' },
      ],
    },
    
    groupBy: {
      label: 'Group by',
      options: ['Status', 'Priority', 'Assignee', 'Label'],
    },
    
    sortBy: {
      label: 'Sort by',
      options: ['Manual', 'Priority', 'Due Date', 'Created', 'Updated'],
    },
    
    moreOptions: {
      icon: 'MoreHorizontal',
      menu: ['Export', 'Print', 'Board Settings', 'Archive'],
    },
  },
};
```

### 4.3 KANBAN COLUMN

```tsx
// File: src/components/views/kanban/column.tsx

const KanbanColumnSpec = {
  dimensions: {
    width: '320px',
    minWidth: '280px',
    maxWidth: '400px',
    gap: '16px',
  },
  
  container: {
    styling: `
      flex flex-col
      h-full
      bg-gray-100/50 dark:bg-gray-900/30
      rounded-xl
      transition-all duration-200
    `,
    dragging: 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-950',
    dropTarget: 'bg-indigo-50 dark:bg-indigo-900/20 border-2 border-dashed border-indigo-300 dark:border-indigo-700',
  },
  
  header: {
    container: 'flex items-center justify-between px-3 py-3 sticky top-0 bg-inherit z-10',
    
    left: {
      container: 'flex items-center gap-2',
      
      dragHandle: {
        icon: 'GripVertical',
        style: 'text-gray-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity',
      },
      
      statusDot: {
        size: '10px',
        shape: 'rounded-full',
        colors: {
          backlog: 'bg-gray-400',
          todo: 'bg-slate-500',
          inProgress: 'bg-indigo-500',
          review: 'bg-amber-500',
          done: 'bg-green-500',
        },
      },
      
      title: {
        editable: true,
        style: 'font-medium text-gray-900 dark:text-white text-sm',
      },
      
      count: {
        style: 'text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded-full ml-2',
      },
    },
    
    right: {
      container: 'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
      
      addButton: {
        icon: 'Plus',
        style: 'p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500',
      },
      
      menuButton: {
        icon: 'MoreHorizontal',
        style: 'p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500',
        menu: ['Edit Column', 'Set Limit', 'Color', 'Collapse', '---', 'Delete Column'],
      },
    },
  },
  
  cardList: {
    container: 'flex-1 overflow-y-auto px-2 pb-2',
    gap: '8px',
    
    emptyState: {
      container: 'flex flex-col items-center justify-center py-8 text-center',
      icon: 'Inbox, 32px, text-gray-300',
      text: 'No tasks yet',
      style: 'text-sm text-gray-400',
    },
    
    dropPlaceholder: {
      height: '80px',
      style: 'border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20',
      animation: 'pulse',
    },
  },
  
  footer: {
    container: 'px-2 pb-2',
    
    addCard: {
      button: {
        icon: 'Plus',
        text: 'Add task',
        style: `
          w-full flex items-center gap-2 px-3 py-2
          text-sm text-gray-500 dark:text-gray-400
          rounded-lg
          hover:bg-gray-200/50 dark:hover:bg-gray-800/50
          transition-colors
        `,
      },
      
      quickInput: {
        show: 'on button click',
        style: 'w-full p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',
        input: 'w-full bg-transparent outline-none text-sm',
        placeholder: 'Task name...',
        submit: 'Enter to create, Esc to cancel',
      },
    },
  },
  
  wipLimit: {
    enabled: 'optional per column',
    display: 'next to count when set',
    warning: 'column header turns amber when at limit',
    exceeded: 'column header turns red when over limit',
  },
};
```

### 4.4 KANBAN CARD

```tsx
// File: src/components/views/kanban/card.tsx

const KanbanCardSpec = {
  container: {
    styling: `
      group
      bg-white dark:bg-gray-800
      border border-gray-200 dark:border-gray-700
      rounded-lg
      shadow-sm
      cursor-pointer
      transition-all duration-200
      hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600
    `,
    
    selected: 'ring-2 ring-indigo-500',
    dragging: 'shadow-xl rotate-2 scale-105 opacity-90',
    dropPreview: 'opacity-50',
  },
  
  layout: {
    padding: 'p-3',
    gap: '8px',
  },
  
  header: {
    container: 'flex items-start justify-between gap-2',
    
    priority: {
      position: 'inline before title or separate icon',
      icons: {
        urgent: { icon: 'AlertCircle', color: 'text-red-500' },
        high: { icon: 'ArrowUp', color: 'text-orange-500' },
        medium: { icon: 'Minus', color: 'text-indigo-500' },
        low: { icon: 'ArrowDown', color: 'text-gray-400' },
        none: { icon: null },
      },
    },
    
    title: {
      style: 'text-sm font-medium text-gray-900 dark:text-white line-clamp-2',
      editable: 'on double-click',
    },
    
    actions: {
      container: 'opacity-0 group-hover:opacity-100 transition-opacity flex items-center',
      editButton: 'p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700',
    },
  },
  
  labels: {
    container: 'flex flex-wrap gap-1 mt-2',
    
    label: {
      style: 'px-2 py-0.5 text-xs font-medium rounded-full',
      maxDisplay: 3,
      overflow: '+{n} more',
      colors: {
        red: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
        orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
        yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
        green: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
        blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
        indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400',
        purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400',
        pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400',
      },
    },
  },
  
  description: {
    show: 'only if has content and card is expanded or in preview',
    style: 'text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-2',
  },
  
  attachments: {
    show: 'if has attachments',
    container: 'mt-2',
    preview: 'thumbnail of first image if exists',
    count: 'icon + count for non-image attachments',
  },
  
  subtasks: {
    show: 'if has subtasks',
    container: 'mt-2 flex items-center gap-1.5',
    icon: 'CheckSquare, 14px',
    progress: '{completed}/{total}',
    style: 'text-xs text-gray-500 dark:text-gray-400',
    progressBar: 'h-1 bg-gray-200 dark:bg-gray-700 rounded-full flex-1 max-w-[60px]',
  },
  
  footer: {
    container: 'flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/50',
    
    left: {
      container: 'flex items-center gap-2',
      
      dueDate: {
        icon: 'Calendar, 14px',
        format: 'MMM D',
        colors: {
          overdue: 'text-red-500',
          dueToday: 'text-orange-500',
          dueSoon: 'text-yellow-600',
          normal: 'text-gray-500',
        },
      },
      
      comments: {
        icon: 'MessageSquare, 14px',
        count: 'number',
        style: 'text-gray-500',
      },
    },
    
    right: {
      assignee: {
        type: 'avatar or avatar stack',
        size: '24px',
        maxDisplay: 2,
        overflow: '+{n}',
      },
    },
  },
  
  contextMenu: {
    trigger: 'right-click',
    items: [
      { label: 'Open', icon: 'ExternalLink' },
      { label: 'Edit', icon: 'Edit2' },
      '---',
      { label: 'Move to...', icon: 'ArrowRight', submenu: 'columns' },
      { label: 'Set Priority', icon: 'Flag', submenu: 'priorities' },
      { label: 'Assign to...', icon: 'User', submenu: 'members' },
      '---',
      { label: 'Duplicate', icon: 'Copy' },
      { label: 'Copy Link', icon: 'Link' },
      '---',
      { label: 'Archive', icon: 'Archive', destructive: false },
      { label: 'Delete', icon: 'Trash2', destructive: true },
    ],
  },
};
```

### 4.5 DRAG-AND-DROP SPECIFICATIONS

```tsx
// File: src/components/views/kanban/dnd-config.tsx

const DragAndDropSpec = {
  library: '@dnd-kit/core + @dnd-kit/sortable',
  
  sensors: {
    mouse: {
      activationConstraint: {
        distance: 5, // 5px before drag starts
      },
    },
    touch: {
      activationConstraint: {
        delay: 150, // 150ms hold before drag
        tolerance: 5,
      },
    },
    keyboard: {
      coordinateGetter: 'sortableKeyboardCoordinates',
    },
  },
  
  cardDrag: {
    dragOverlay: {
      render: 'clone of card with shadow',
      style: 'shadow-2xl rotate-3 scale-105 cursor-grabbing',
      animation: {
        initial: { scale: 1, rotate: 0 },
        animate: { scale: 1.05, rotate: 3 },
        transition: { duration: 0.2 },
      },
    },
    
    dragSource: {
      style: 'opacity-40 scale-95',
    },
    
    dropTarget: {
      placeholder: {
        height: 'matches dragged card height',
        style: 'border-2 border-dashed border-indigo-400 rounded-lg bg-indigo-50 dark:bg-indigo-900/20',
        animation: 'pulse subtle',
      },
    },
    
    dropAnimation: {
      duration: 250,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      scaleFrom: 1.05,
      scaleTo: 1,
    },
    
    reorderAnimation: {
      duration: 200,
      easing: 'ease-out',
    },
  },
  
  columnDrag: {
    handle: 'header only (not cards)',
    
    dragOverlay: {
      style: 'shadow-2xl opacity-90',
    },
    
    dropAnimation: {
      duration: 300,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  },
  
  collisionDetection: {
    algorithm: 'closestCenter with pointerWithin fallback',
    threshold: 0.5,
  },
  
  scrollBehavior: {
    autoScroll: true,
    threshold: 50, // pixels from edge
    speed: 10,
    direction: 'horizontal for columns, vertical for cards within column',
  },
  
  accessibility: {
    announcements: {
      onDragStart: '{item} picked up',
      onDragOver: 'over {container}',
      onDragEnd: 'dropped in {container}',
      onDragCancel: 'drag cancelled',
    },
    keyboardControls: {
      start: 'Space or Enter',
      move: 'Arrow keys',
      drop: 'Space or Enter',
      cancel: 'Escape',
    },
  },
  
  hapticFeedback: {
    onPickup: 'light vibration (mobile)',
    onDrop: 'medium vibration (mobile)',
  },
};
```

### 4.6 CARD DETAIL MODAL

```tsx
// File: src/components/views/kanban/card-detail-modal.tsx

const CardDetailModalSpec = {
  trigger: 'click on card',
  
  dimensions: {
    width: 'max-w-3xl',
    maxHeight: '90vh',
  },
  
  animation: {
    backdrop: 'fade in 200ms',
    modal: 'slide up + fade in 200ms',
  },
  
  layout: {
    type: 'two-column on desktop, single column on mobile',
    mainContent: '65%',
    sidebar: '35%',
  },
  
  header: {
    container: 'flex items-start gap-4 p-6 pb-4 border-b border-gray-100 dark:border-gray-800',
    
    statusIcon: {
      type: 'checkbox or status icon',
      size: '24px',
      interactive: true,
      completedStyle: 'text-green-500',
    },
    
    title: {
      editable: true,
      style: 'text-xl font-semibold text-gray-900 dark:text-white flex-1',
      placeholder: 'Untitled task',
    },
    
    actions: {
      container: 'flex items-center gap-1',
      items: [
        { icon: 'Star', tooltip: 'Add to favorites' },
        { icon: 'Link', tooltip: 'Copy link' },
        { icon: 'MoreHorizontal', tooltip: 'More options' },
        { icon: 'X', tooltip: 'Close' },
      ],
    },
  },
  
  mainContent: {
    container: 'p-6 overflow-y-auto',
    
    description: {
      label: 'Description',
      editor: 'rich text with markdown support',
      placeholder: 'Add a more detailed description...',
      toolbar: ['bold', 'italic', 'link', 'code', 'list', 'checklist'],
    },
    
    subtasks: {
      label: 'Subtasks',
      list: 'checklist with progress',
      addButton: '+ Add subtask',
      reorderable: true,
    },
    
    attachments: {
      label: 'Attachments',
      dropzone: 'drag files here or click to upload',
      preview: 'grid of thumbnails with names',
      maxSize: '10MB',
      types: 'images, documents, archives',
    },
    
    activity: {
      label: 'Activity',
      tabs: ['Comments', 'History'],
      
      commentInput: {
        avatar: 'current user',
        placeholder: 'Write a comment...',
        submitButton: 'Send',
        richText: true,
        mentions: '@user autocomplete',
      },
      
      activityItem: {
        avatar: '24px',
        action: 'User changed X from Y to Z',
        timestamp: 'relative time',
      },
    },
  },
  
  sidebar: {
    container: 'p-6 bg-gray-50 dark:bg-gray-900/50 border-l border-gray-100 dark:border-gray-800',
    
    fields: [
      {
        label: 'Status',
        type: 'select',
        options: 'column statuses',
        icon: 'Circle',
      },
      {
        label: 'Assignee',
        type: 'user-select',
        multiple: true,
        icon: 'User',
      },
      {
        label: 'Priority',
        type: 'select',
        options: ['Urgent', 'High', 'Medium', 'Low', 'None'],
        icon: 'Flag',
      },
      {
        label: 'Due Date',
        type: 'date-picker',
        icon: 'Calendar',
      },
      {
        label: 'Labels',
        type: 'multi-select',
        createNew: true,
        icon: 'Tag',
      },
      {
        label: 'Project',
        type: 'select',
        icon: 'Folder',
      },
      {
        label: 'Estimate',
        type: 'number',
        unit: 'points or hours',
        icon: 'Clock',
      },
    ],
    
    dates: {
      created: 'Created {date} by {user}',
      updated: 'Updated {date}',
    },
    
    actions: {
      archive: 'Archive task',
      delete: 'Delete task (with confirmation)',
    },
  },
};
```

### 4.7 QUICK ADD TASK

```tsx
// File: src/components/views/kanban/quick-add-task.tsx

const QuickAddTaskSpec = {
  trigger: {
    button: '+ Add task at bottom of column',
    keyboard: 'N key when column focused',
  },
  
  inline: {
    container: `
      bg-white dark:bg-gray-800
      border border-gray-200 dark:border-gray-700
      rounded-lg
      shadow-md
      p-3
    `,
    
    input: {
      style: 'w-full bg-transparent text-sm outline-none',
      placeholder: 'Task name',
      autoFocus: true,
    },
    
    quickOptions: {
      container: 'flex items-center gap-2 mt-3',
      
      items: [
        { icon: 'User', tooltip: 'Assign', type: 'user-select' },
        { icon: 'Calendar', tooltip: 'Due date', type: 'date-picker' },
        { icon: 'Flag', tooltip: 'Priority', type: 'priority-select' },
        { icon: 'Tag', tooltip: 'Labels', type: 'label-select' },
      ],
    },
    
    actions: {
      container: 'flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700',
      
      hints: {
        enter: 'Enter to create',
        shiftEnter: 'Shift+Enter to create and add another',
        escape: 'Esc to cancel',
      },
      
      buttons: {
        cancel: { text: 'Cancel', variant: 'ghost' },
        create: { text: 'Create', variant: 'primary' },
      },
    },
  },
  
  modal: {
    trigger: 'Cmd/Ctrl + Enter from inline',
    opens: 'Full card detail modal with all fields',
  },
};
```

---

## PART 5: ANIMATION SPECIFICATIONS

### 5.1 GLOBAL ANIMATION PRINCIPLES

```tsx
// File: src/lib/animations.ts

const AnimationPrinciples = {
  philosophy: {
    subtle: 'Animations should enhance, not distract',
    fast: 'Keep durations short (150-300ms max for UI elements)',
    purposeful: 'Every animation should have a reason',
    consistent: 'Same types of actions = same types of animations',
  },
  
  durations: {
    instant: 100,      // tooltips, hover states
    fast: 150,         // buttons, small elements
    normal: 200,       // cards, panels
    slow: 300,         // modals, page transitions
    emphasis: 500,     // celebrations, important feedback
  },
  
  easings: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',     // ease-out
    enter: 'cubic-bezier(0, 0, 0.2, 1)',          // decelerate
    exit: 'cubic-bezier(0.4, 0, 1, 1)',           // accelerate
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    spring: { stiffness: 300, damping: 30 },
  },
  
  reducedMotion: {
    respect: 'prefers-reduced-motion',
    fallback: 'opacity only, no transforms',
  },
};
```

### 5.2 COMPONENT ANIMATIONS

```tsx
// File: src/lib/component-animations.ts

const ComponentAnimations = {
  // Button press
  buttonPress: {
    whileTap: { scale: 0.98 },
    transition: { duration: 0.1 },
  },
  
  // Button hover
  buttonHover: {
    whileHover: { scale: 1.02 },
    transition: { duration: 0.15 },
  },
  
  // Card hover
  cardHover: {
    whileHover: { y: -4, boxShadow: 'var(--shadow-lg)' },
    transition: { duration: 0.2 },
  },
  
  // Fade in up (for lists)
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2 },
  },
  
  // Stagger children
  staggerContainer: {
    animate: { transition: { staggerChildren: 0.05 } },
  },
  
  // Scale in (for modals, dropdowns)
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.15 },
  },
  
  // Slide in from right (for sidebars, panels)
  slideInRight: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  
  // Slide in from left
  slideInLeft: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  
  // Dropdown appear
  dropdownAppear: {
    initial: { opacity: 0, y: -8, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, scale: 0.96 },
    transition: { duration: 0.15 },
  },
  
  // Toast slide in
  toastSlideIn: {
    initial: { opacity: 0, x: 100, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 100, scale: 0.95 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  
  // Checkbox check
  checkboxCheck: {
    initial: { pathLength: 0 },
    animate: { pathLength: 1 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  
  // Progress bar
  progressBar: {
    initial: { scaleX: 0, originX: 0 },
    animate: { scaleX: 1 },
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  
  // Skeleton shimmer
  skeletonShimmer: {
    animate: {
      backgroundPosition: ['200% 0', '-200% 0'],
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
  
  // Spin (for loading)
  spin: {
    animate: { rotate: 360 },
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
  
  // Pulse (for notifications)
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
```

### 5.3 CELEBRATION ANIMATIONS

```tsx
// File: src/lib/celebration-animations.ts

const CelebrationAnimations = {
  // Task completion confetti
  confetti: {
    trigger: 'task marked as done',
    particles: 50,
    colors: ['#6366F1', '#8B5CF6', '#A855F7', '#22C55E', '#FBBF24'],
    spread: 60,
    duration: 2000,
    gravity: 1,
    origin: 'checkbox position',
  },
  
  // Task completion checkmark
  checkmarkDraw: {
    type: 'SVG path animation',
    pathLength: { from: 0, to: 1 },
    duration: 300,
    easing: 'easeOut',
    stroke: '#22C55E',
    strokeWidth: 2,
  },
  
  // Project completion burst
  projectComplete: {
    type: 'radial burst from center',
    particles: 100,
    duration: 3000,
    sound: 'optional celebration sound',
  },
  
  // Streak celebration
  streakCelebration: {
    trigger: '3+ tasks completed in a row',
    animation: 'flame icon appears with glow',
    badge: 'You are on fire! 🔥',
  },
  
  // Level up
  levelUp: {
    animation: 'full screen overlay with badge reveal',
    duration: 2000,
    dismissible: true,
  },
};
```

### 5.4 PAGE TRANSITIONS

```tsx
// File: src/lib/page-transitions.ts

const PageTransitions = {
  default: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  
  slide: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3 },
  },
  
  scale: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.2 },
  },
  
  sidebar: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { duration: 0.3, staggerChildren: 0.05 },
  },
};
```

---

*Continue to PART 5 in UI_REPLACEMENT_MASTERPLAN_PART5.md*
