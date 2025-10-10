import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

// Standardized spacing utilities
export const spacing = {
  xs: 'var(--spacing-xs)',
  sm: 'var(--spacing-sm)',
  md: 'var(--spacing-md)',
  lg: 'var(--spacing-lg)',
  xl: 'var(--spacing-xl)',
  '2xl': 'var(--spacing-2xl)',
  '3xl': 'var(--spacing-3xl)',
} as const

// Standardized padding utilities
export const padding = {
  xs: 'p-xs',
  sm: 'p-sm',
  md: 'p-md',
  lg: 'p-lg',
  xl: 'p-xl',
  '2xl': 'p-2xl',
} as const

// Standardized margin utilities
export const margin = {
  xs: 'm-xs',
  sm: 'm-sm',
  md: 'm-md',
  lg: 'm-lg',
  xl: 'm-xl',
  '2xl': 'm-2xl',
} as const

// Standardized gap utilities
export const gap = {
  xs: 'gap-xs',
  sm: 'gap-sm',
  md: 'gap-md',
  lg: 'gap-lg',
  xl: 'gap-xl',
  '2xl': 'gap-2xl',
} as const

// Standardized border radius
export const radius = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
} as const

// Standardized shadows
export const shadow = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
} as const

// Standardized border widths
export const borderWidth = {
  thin: 'border',
  medium: 'border-2',
  thick: 'border-4',
} as const

// Consistent Card component with standardized styling
interface CardProps {
  children: ReactNode
  className?: string
  padding?: keyof typeof padding
  shadow?: keyof typeof shadow
  borderRadius?: keyof typeof radius
}

export function ConsistentCard({
  children,
  className,
  padding = 'md',
  shadow = 'md',
  borderRadius = 'lg'
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-card border border-border',
        padding,
        shadow,
        borderRadius,
        className
      )}
    >
      {children}
    </div>
  )
}

// Consistent Button component with standardized styling
interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  disabled?: boolean
}

export function ConsistentButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  onClick,
  disabled = false
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-hover focus:ring-primary',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:ring-accent',
    ghost: 'hover:bg-accent hover:text-accent-foreground focus:ring-accent'
  }

  const sizeClasses = {
    sm: 'h-9 px-3 text-sm rounded-md',
    md: 'h-11 px-4 text-base rounded-md',
    lg: 'h-12 px-6 text-lg rounded-lg'
  }

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

// Consistent spacing container
interface ContainerProps {
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: keyof typeof padding
  margin?: keyof typeof margin
}

export function ConsistentContainer({
  children,
  className,
  maxWidth = 'full',
  padding = 'md',
  margin
}: ContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  }

  return (
    <div
      className={cn(
        'w-full mx-auto',
        maxWidthClasses[maxWidth],
        padding,
        margin && margin,
        className
      )}
    >
      {children}
    </div>
  )
}

// Consistent flex layout utilities
interface FlexProps {
  children: ReactNode
  direction?: 'row' | 'col'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  gap?: keyof typeof gap
  className?: string
}

export function ConsistentFlex({
  children,
  direction = 'row',
  justify = 'start',
  align = 'center',
  gap = 'md',
  className
}: FlexProps) {
  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col'
  }

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  }

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline'
  }

  return (
    <div
      className={cn(
        'flex',
        directionClasses[direction],
        justifyClasses[justify],
        alignClasses[align],
        gap,
        className
      )}
    >
      {children}
    </div>
  )
}

// Consistent spacing stack (vertical layout)
interface StackProps {
  children: ReactNode
  gap?: keyof typeof gap
  className?: string
}

export function ConsistentStack({
  children,
  gap = 'md',
  className
}: StackProps) {
  return (
    <div className={cn('flex flex-col', gap, className)}>
      {children}
    </div>
  )
}

// Consistent text styles
export const textStyles = {
  h1: 'text-3xl font-bold tracking-tight',
  h2: 'text-2xl font-semibold tracking-tight',
  h3: 'text-xl font-semibold tracking-tight',
  h4: 'text-lg font-semibold tracking-tight',
  body: 'text-base',
  small: 'text-sm text-muted-foreground',
  caption: 'text-xs text-muted-foreground',
} as const

interface TextProps {
  children: ReactNode
  variant?: keyof typeof textStyles
  className?: string
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export function ConsistentText({
  children,
  variant = 'body',
  className,
  as: Component = 'p'
}: TextProps) {
  return (
    <Component className={cn(textStyles[variant], className)}>
      {children}
    </Component>
  )
}
