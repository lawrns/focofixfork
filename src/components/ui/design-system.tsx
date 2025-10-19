'use client'

import { cn } from '@/lib/utils'

// Enterprise color palette
export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712'
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d'
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d'
  }
}

// Typography scale
export const typography = {
  display: {
    fontSize: '3.75rem', // 60px
    lineHeight: '1',
    fontWeight: '700',
    letterSpacing: '-0.025em'
  },
  h1: {
    fontSize: '3rem', // 48px
    lineHeight: '1.1',
    fontWeight: '700',
    letterSpacing: '-0.025em'
  },
  h2: {
    fontSize: '2.25rem', // 36px
    lineHeight: '1.2',
    fontWeight: '600',
    letterSpacing: '-0.025em'
  },
  h3: {
    fontSize: '1.875rem', // 30px
    lineHeight: '1.3',
    fontWeight: '600',
    letterSpacing: '-0.025em'
  },
  h4: {
    fontSize: '1.5rem', // 24px
    lineHeight: '1.4',
    fontWeight: '600',
    letterSpacing: '-0.025em'
  },
  h5: {
    fontSize: '1.25rem', // 20px
    lineHeight: '1.5',
    fontWeight: '600',
    letterSpacing: '-0.025em'
  },
  h6: {
    fontSize: '1.125rem', // 18px
    lineHeight: '1.5',
    fontWeight: '600',
    letterSpacing: '-0.025em'
  },
  body: {
    fontSize: '1rem', // 16px
    lineHeight: '1.6',
    fontWeight: '400'
  },
  bodySmall: {
    fontSize: '0.875rem', // 14px
    lineHeight: '1.5',
    fontWeight: '400'
  },
  caption: {
    fontSize: '0.75rem', // 12px
    lineHeight: '1.4',
    fontWeight: '400'
  }
}

// Spacing system (4px base unit)
export const spacing = {
  0: '0',
  1: '0.25rem', // 4px
  2: '0.5rem',  // 8px
  3: '0.75rem', // 12px
  4: '1rem',    // 16px
  5: '1.25rem', // 20px
  6: '1.5rem',  // 24px
  8: '2rem',    // 32px
  10: '2.5rem', // 40px
  12: '3rem',   // 48px
  16: '4rem',   // 64px
  20: '5rem',   // 80px
  24: '6rem',   // 96px
  32: '8rem'    // 128px
}

// Elevation system (5 shadow levels)
export const elevation = {
  0: 'none',
  1: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
  2: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
  3: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
  4: '0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)',
  5: '0 19px 38px rgba(0, 0, 0, 0.30), 0 15px 12px rgba(0, 0, 0, 0.22)'
}

// Border radius system
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',     // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px'
}

// Focus states
export const focusStates = {
  ring: 'focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2',
  ringOffset: 'focus-visible:outline-offset-2'
}

// Component variants
export const componentVariants = {
  button: {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300',
    outline: 'border border-primary-600 text-primary-600 hover:bg-primary-50',
    ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
    destructive: 'bg-error-600 hover:bg-error-700 text-white'
  },
  card: {
    default: 'bg-white border border-gray-200 shadow-sm',
    elevated: 'bg-white border border-gray-200 shadow-md',
    flat: 'bg-gray-50 border border-gray-200'
  },
  input: {
    default: 'border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
    error: 'border border-error-500 focus:border-error-500 focus:ring-1 focus:ring-error-500',
    success: 'border border-success-500 focus:border-success-500 focus:ring-1 focus:ring-success-500'
  }
}

// Utility components
export function DesignSystemProvider({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {children}
    </div>
  )
}

// Typography components
export function Display({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h1 className={cn('text-6xl font-bold leading-none tracking-tight', className)}>
      {children}
    </h1>
  )
}

export function Heading1({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h1 className={cn('text-5xl font-bold leading-tight tracking-tight', className)}>
      {children}
    </h1>
  )
}

export function Heading2({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-4xl font-semibold leading-tight tracking-tight', className)}>
      {children}
    </h2>
  )
}

export function Heading3({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-3xl font-semibold leading-snug tracking-tight', className)}>
      {children}
    </h3>
  )
}

export function Heading4({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h4 className={cn('text-2xl font-semibold leading-snug tracking-tight', className)}>
      {children}
    </h4>
  )
}

export function Heading5({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h5 className={cn('text-xl font-semibold leading-normal tracking-tight', className)}>
      {children}
    </h5>
  )
}

export function Heading6({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h6 className={cn('text-lg font-semibold leading-normal tracking-tight', className)}>
      {children}
    </h6>
  )
}

export function Body({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-base leading-relaxed', className)}>
      {children}
    </p>
  )
}

export function BodySmall({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-sm leading-normal', className)}>
      {children}
    </p>
  )
}

export function Caption({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-xs leading-normal', className)}>
      {children}
    </p>
  )
}

// Card component with enterprise styling
export function Card({ 
  children, 
  className, 
  variant = 'default',
  elevation = 1,
  onClick,
  ...props
}: { 
  children: React.ReactNode
  className?: string
  variant?: keyof typeof componentVariants.card
  elevation?: 0 | 1 | 2 | 3 | 4 | 5
  onClick?: () => void
} & React.HTMLAttributes<HTMLDivElement>) {
  const baseClasses = 'rounded-lg p-6 transition-all duration-200 ease-in-out'
  const variantClasses = componentVariants.card[variant]
  const elevationClasses = elevation === 0 ? '' : 'shadow-md hover:shadow-lg'
  
  return (
    <div 
      className={cn(baseClasses, variantClasses, elevationClasses, className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

// Button component with enterprise styling
export function Button({ 
  children, 
  className, 
  variant = 'primary',
  size = 'md',
  ...props 
}: { 
  children: React.ReactNode
  className?: string
  variant?: keyof typeof componentVariants.button
  size?: 'sm' | 'md' | 'lg'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  const variantClasses = componentVariants.button[variant]
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  
  return (
    <button 
      className={cn(baseClasses, variantClasses, sizeClasses[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}