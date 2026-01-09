# FOCO UI/UX REPLACEMENT MASTERPLAN - PART 2

## COMPONENT SPECIFICATIONS

---

## PART 2: COMPONENT LIBRARY

### 2.1 BUTTON COMPONENT

#### Variants

| Variant | Usage | Styling |
|---------|-------|---------|
| **Primary** | Main CTAs, submit actions | Solid indigo background, white text, gradient on hover |
| **Secondary** | Secondary actions | White/dark bg, indigo border, indigo text |
| **Ghost** | Tertiary actions, navigation | Transparent, subtle hover background |
| **Danger** | Delete, destructive actions | Red background or outline |
| **Success** | Confirm, complete actions | Green background |
| **Link** | Inline text actions | Text only, underline on hover |

#### Sizes

| Size | Height | Padding X | Font Size | Icon Size |
|------|--------|-----------|-----------|-----------|
| **xs** | 28px | 10px | 12px | 14px |
| **sm** | 32px | 12px | 13px | 16px |
| **md** | 40px | 16px | 14px | 18px |
| **lg** | 48px | 20px | 16px | 20px |
| **xl** | 56px | 24px | 18px | 24px |

#### States

```tsx
// Implementation File: src/components/ui/button.tsx

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'link';
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// Styling Specifications:
const buttonStyles = {
  primary: {
    base: 'bg-indigo-500 text-white border-transparent',
    hover: 'hover:bg-indigo-600 hover:shadow-primary',
    active: 'active:bg-indigo-700 active:scale-[0.98]',
    focus: 'focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2',
    disabled: 'disabled:bg-indigo-300 disabled:cursor-not-allowed',
  },
  secondary: {
    base: 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300',
    active: 'active:bg-indigo-100 active:scale-[0.98]',
    focus: 'focus-visible:ring-2 focus-visible:ring-indigo-500/50',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  },
  ghost: {
    base: 'bg-transparent text-gray-700 dark:text-gray-300 border-transparent',
    hover: 'hover:bg-gray-100 dark:hover:bg-gray-800',
    active: 'active:bg-gray-200 dark:active:bg-gray-700',
    focus: 'focus-visible:ring-2 focus-visible:ring-gray-500/50',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  },
};

// Animation: 150ms ease-out for all state transitions
// Transform: scale(0.98) on active press
// Loading: Spinner replaces content, maintain button width
```

#### Button Micro-Interactions

```tsx
// Framer Motion animations for buttons
const buttonAnimations = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.15, ease: 'easeOut' },
};

// Loading spinner animation
const spinnerAnimation = {
  animate: { rotate: 360 },
  transition: { duration: 0.8, repeat: Infinity, ease: 'linear' },
};

// Success checkmark animation (after form submit)
const successAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring', stiffness: 300, damping: 20 },
};
```

---

### 2.2 INPUT COMPONENT

#### Variants

| Variant | Usage |
|---------|-------|
| **Default** | Standard text input |
| **Filled** | Input with subtle background |
| **Flushed** | Underline only, minimal |
| **Unstyled** | No borders, for inline editing |

#### Anatomy

```
┌─────────────────────────────────────────────────────────┐
│ [Label]                                    [Helper Icon]│
├─────────────────────────────────────────────────────────┤
│ [Prefix] [Input Field........................] [Suffix] │
├─────────────────────────────────────────────────────────┤
│ [Helper Text / Error Message]              [Char Count] │
└─────────────────────────────────────────────────────────┘
```

#### Implementation

```tsx
// Implementation File: src/components/ui/input.tsx

interface InputProps {
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size: 'sm' | 'md' | 'lg';
  variant: 'default' | 'filled' | 'flushed' | 'unstyled';
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
}

// Styling Specifications:
const inputStyles = {
  default: {
    container: 'relative flex flex-col gap-1.5',
    label: 'text-sm font-medium text-gray-700 dark:text-gray-300',
    inputWrapper: 'relative flex items-center',
    input: `
      w-full px-3 py-2 
      bg-white dark:bg-gray-900 
      border border-gray-300 dark:border-gray-700 
      rounded-lg 
      text-gray-900 dark:text-gray-100 
      placeholder:text-gray-400 dark:placeholder:text-gray-500
      transition-all duration-150
      focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500
    `,
    error: 'border-red-500 focus:ring-red-500/30 focus:border-red-500',
    disabled: 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60',
    helperText: 'text-xs text-gray-500 dark:text-gray-400',
    errorText: 'text-xs text-red-500',
  },
};

// Focus animation: Ring appears with 200ms fade
// Error shake animation: horizontal shake 3 times over 400ms
```

#### Input Animation Specs

```tsx
// Error shake animation
const shakeAnimation = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
  },
  transition: { duration: 0.4 },
};

// Focus ring animation
const focusRingAnimation = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.15 },
};

// Label float animation (for floating labels)
const labelFloatAnimation = {
  initial: { y: 0, scale: 1 },
  animate: { y: -24, scale: 0.85 },
  transition: { duration: 0.2, ease: 'easeOut' },
};
```

---

### 2.3 CARD COMPONENT

#### Variants

| Variant | Usage | Styling |
|---------|-------|---------|
| **Default** | Standard content container | White bg, subtle border, small shadow |
| **Elevated** | Emphasized content | Larger shadow, no border |
| **Outlined** | Secondary containers | Border only, no shadow |
| **Ghost** | Minimal separation | No border, no shadow, subtle bg |
| **Interactive** | Clickable cards | Hover effects, cursor pointer |
| **Gradient** | Featured content | Subtle gradient background |

#### Anatomy

```
┌──────────────────────────────────────────────────────────┐
│ [Card Header]                                            │
│   - Title (required)                                     │
│   - Subtitle (optional)                                  │
│   - Action buttons (optional, top-right)                 │
├──────────────────────────────────────────────────────────┤
│ [Card Body]                                              │
│   - Primary content area                                 │
│   - Flexible padding options                             │
├──────────────────────────────────────────────────────────┤
│ [Card Footer] (optional)                                 │
│   - Actions, metadata, or navigation                     │
└──────────────────────────────────────────────────────────┘
```

#### Implementation

```tsx
// Implementation File: src/components/ui/card.tsx

interface CardProps {
  variant: 'default' | 'elevated' | 'outlined' | 'ghost' | 'interactive' | 'gradient';
  padding: 'none' | 'sm' | 'md' | 'lg';
  radius: 'sm' | 'md' | 'lg' | 'xl';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

// Styling Specifications:
const cardStyles = {
  base: 'overflow-hidden',
  
  default: `
    bg-white dark:bg-gray-900 
    border border-gray-200 dark:border-gray-800 
    shadow-sm
  `,
  
  elevated: `
    bg-white dark:bg-gray-900 
    shadow-lg dark:shadow-dark-lg
  `,
  
  outlined: `
    bg-transparent 
    border border-gray-200 dark:border-gray-800
  `,
  
  ghost: `
    bg-gray-50 dark:bg-gray-900/50
  `,
  
  interactive: `
    bg-white dark:bg-gray-900 
    border border-gray-200 dark:border-gray-800 
    shadow-sm
    cursor-pointer
    transition-all duration-200
    hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700
    hover:-translate-y-0.5
    active:scale-[0.99]
  `,
  
  gradient: `
    bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950
    border border-gray-200/50 dark:border-gray-800/50
    shadow-sm
  `,
  
  padding: {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  },
  
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
  },
};
```

#### Card Hover Animation

```tsx
// Framer Motion for interactive cards
const cardHoverAnimation = {
  whileHover: {
    y: -4,
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  whileTap: { scale: 0.99 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

// Subtle glow on hover for premium feel
const glowAnimation = {
  initial: { boxShadow: 'none' },
  whileHover: {
    boxShadow: '0 0 40px -10px rgb(99 102 241 / 0.3)',
  },
};
```

---

### 2.4 BADGE COMPONENT

#### Variants & Colors

| Variant | Usage |
|---------|-------|
| **Solid** | Strong emphasis |
| **Soft** | Subtle emphasis |
| **Outline** | Minimal emphasis |
| **Dot** | With status indicator dot |

| Color | Semantic Usage |
|-------|----------------|
| **Gray** | Default, neutral |
| **Indigo** | Primary, links |
| **Green** | Success, complete, active |
| **Yellow** | Warning, pending |
| **Red** | Error, urgent, blocked |
| **Blue** | Info, in progress |
| **Purple** | Special, premium |
| **Pink** | Accent, new |

#### Implementation

```tsx
// Implementation File: src/components/ui/badge.tsx

interface BadgeProps {
  variant: 'solid' | 'soft' | 'outline' | 'dot';
  color: 'gray' | 'indigo' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'pink';
  size: 'xs' | 'sm' | 'md';
  children: React.ReactNode;
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
}

// Size specifications
const badgeSizes = {
  xs: 'px-1.5 py-0.5 text-[10px] leading-none',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

// Color specifications (soft variant example)
const badgeColors = {
  soft: {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  },
};

// Dot indicator animation
const dotPulseAnimation = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};
```

---

### 2.5 AVATAR COMPONENT

#### Variants

| Variant | Usage |
|---------|-------|
| **Image** | User photo |
| **Initials** | Fallback with user initials |
| **Icon** | Generic user icon |

#### Sizes

| Size | Dimensions | Font Size | Border Width |
|------|------------|-----------|--------------|
| **xs** | 24px | 10px | 1px |
| **sm** | 32px | 12px | 1.5px |
| **md** | 40px | 14px | 2px |
| **lg** | 48px | 16px | 2px |
| **xl** | 64px | 20px | 2px |
| **2xl** | 96px | 28px | 3px |

#### Implementation

```tsx
// Implementation File: src/components/ui/avatar.tsx

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape: 'circle' | 'square';
  status?: 'online' | 'offline' | 'busy' | 'away';
  showBorder?: boolean;
  borderColor?: string;
}

// Avatar group for stacking
interface AvatarGroupProps {
  avatars: AvatarProps[];
  max?: number;
  size?: AvatarProps['size'];
  spacing?: 'tight' | 'normal' | 'loose';
}

// Styling
const avatarStyles = {
  base: 'relative inline-flex items-center justify-center flex-shrink-0 overflow-hidden',
  
  sizes: {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-24 h-24 text-2xl',
  },
  
  shape: {
    circle: 'rounded-full',
    square: 'rounded-lg',
  },
  
  fallback: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium',
  
  status: {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500',
    away: 'bg-yellow-500',
  },
  
  statusPosition: 'absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-gray-900',
};

// Avatar group overlap
const groupSpacing = {
  tight: '-ml-3',
  normal: '-ml-2',
  loose: '-ml-1',
};
```

---

### 2.6 DROPDOWN / SELECT COMPONENT

#### Features

- **Search/filter** for long lists
- **Multi-select** option
- **Grouped options**
- **Custom option rendering**
- **Keyboard navigation** (↑↓ to navigate, Enter to select, Esc to close)

#### Implementation

```tsx
// Implementation File: src/components/ui/select.tsx

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  size: 'sm' | 'md' | 'lg';
  maxHeight?: number;
  renderOption?: (option: SelectOption) => React.ReactNode;
}

// Dropdown animation
const dropdownAnimation = {
  initial: { opacity: 0, y: -8, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.96 },
  transition: { duration: 0.15, ease: 'easeOut' },
};

// Styling
const selectStyles = {
  trigger: `
    w-full flex items-center justify-between gap-2
    px-3 py-2
    bg-white dark:bg-gray-900
    border border-gray-300 dark:border-gray-700
    rounded-lg
    text-gray-900 dark:text-gray-100
    cursor-pointer
    transition-all duration-150
    hover:border-gray-400 dark:hover:border-gray-600
    focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500
  `,
  
  content: `
    absolute z-dropdown w-full mt-1
    bg-white dark:bg-gray-900
    border border-gray-200 dark:border-gray-700
    rounded-xl
    shadow-lg dark:shadow-dark-lg
    overflow-hidden
  `,
  
  option: `
    px-3 py-2
    text-sm
    cursor-pointer
    transition-colors duration-100
    hover:bg-gray-100 dark:hover:bg-gray-800
    data-[selected]:bg-indigo-50 dark:data-[selected]:bg-indigo-900/30
    data-[selected]:text-indigo-600 dark:data-[selected]:text-indigo-400
    data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-800
  `,
  
  optionDisabled: 'opacity-50 cursor-not-allowed',
};
```

---

### 2.7 MODAL / DIALOG COMPONENT

#### Sizes

| Size | Max Width | Padding |
|------|-----------|---------|
| **sm** | 400px | 24px |
| **md** | 500px | 24px |
| **lg** | 640px | 32px |
| **xl** | 768px | 32px |
| **full** | 90vw | 32px |

#### Implementation

```tsx
// Implementation File: src/components/ui/modal.tsx

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Animation specifications
const backdropAnimation = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

const modalAnimation = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
};

// Styling
const modalStyles = {
  overlay: `
    fixed inset-0 z-modal-backdrop
    bg-black/60 dark:bg-black/80
    backdrop-blur-sm
    flex items-center justify-center
    p-4
  `,
  
  content: `
    relative z-modal
    w-full
    bg-white dark:bg-gray-900
    rounded-2xl
    shadow-2xl dark:shadow-dark-lg
    overflow-hidden
    max-h-[85vh]
    flex flex-col
  `,
  
  header: `
    flex items-start justify-between
    p-6 pb-4
    border-b border-gray-100 dark:border-gray-800
  `,
  
  body: `
    flex-1 overflow-y-auto
    p-6
  `,
  
  footer: `
    flex items-center justify-end gap-3
    p-6 pt-4
    border-t border-gray-100 dark:border-gray-800
    bg-gray-50 dark:bg-gray-900/50
  `,
  
  closeButton: `
    absolute top-4 right-4
    p-1.5
    text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
    rounded-lg
    hover:bg-gray-100 dark:hover:bg-gray-800
    transition-colors
  `,
  
  sizes: {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-[90vw]',
  },
};
```

---

### 2.8 TOOLTIP COMPONENT

```tsx
// Implementation File: src/components/ui/tooltip.tsx

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side: 'top' | 'right' | 'bottom' | 'left';
  align: 'start' | 'center' | 'end';
  delayDuration?: number;
  sideOffset?: number;
}

// Animation
const tooltipAnimation = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.1 },
};

// Styling
const tooltipStyles = `
  z-tooltip
  px-3 py-1.5
  bg-gray-900 dark:bg-gray-100
  text-white dark:text-gray-900
  text-xs font-medium
  rounded-lg
  shadow-lg
  max-w-[200px]
`;
```

---

### 2.9 TOAST / NOTIFICATION COMPONENT

#### Variants

| Variant | Icon | Color |
|---------|------|-------|
| **Default** | Info icon | Gray |
| **Success** | Check icon | Green |
| **Error** | X icon | Red |
| **Warning** | Warning icon | Yellow |
| **Loading** | Spinner | Indigo |

```tsx
// Implementation File: src/components/ui/toast.tsx

interface ToastProps {
  variant: 'default' | 'success' | 'error' | 'warning' | 'loading';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

// Animation (slides in from right)
const toastAnimation = {
  initial: { opacity: 0, x: 100, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 100, scale: 0.95 },
  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
};

// Progress bar animation for auto-dismiss
const progressAnimation = {
  initial: { scaleX: 1 },
  animate: { scaleX: 0 },
  transition: { duration: 5, ease: 'linear' }, // matches toast duration
};

// Styling
const toastStyles = {
  container: `
    fixed bottom-4 right-4 z-toast
    flex flex-col gap-2
    max-w-sm w-full
  `,
  
  toast: `
    flex items-start gap-3
    p-4
    bg-white dark:bg-gray-800
    border border-gray-200 dark:border-gray-700
    rounded-xl
    shadow-lg dark:shadow-dark-lg
  `,
  
  icons: {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    default: 'text-gray-500',
    loading: 'text-indigo-500 animate-spin',
  },
  
  progressBar: `
    absolute bottom-0 left-0 right-0
    h-1
    bg-indigo-500
    origin-left
  `,
};
```

---

### 2.10 SKELETON LOADER COMPONENT

```tsx
// Implementation File: src/components/ui/skeleton.tsx

interface SkeletonProps {
  variant: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animation: 'pulse' | 'wave' | 'none';
}

// Pulse animation
const pulseAnimation = `
  animate-pulse
  bg-gray-200 dark:bg-gray-800
`;

// Wave animation (shimmer effect)
const waveAnimation = `
  relative overflow-hidden
  bg-gray-200 dark:bg-gray-800
  after:absolute after:inset-0
  after:translate-x-[-100%]
  after:animate-[shimmer_1.5s_infinite]
  after:bg-gradient-to-r
  after:from-transparent
  after:via-white/20
  after:to-transparent
`;

// Keyframe definition
const shimmerKeyframe = `
  @keyframes shimmer {
    100% { transform: translateX(100%); }
  }
`;
```

---

*Continue to PART 3 in UI_REPLACEMENT_MASTERPLAN_PART3.md*
