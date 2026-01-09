import * as React from 'react'
import { memo } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'soft' | 'outline' | 'dot' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'muted' | 'glass' | 'default'
  color?: 'gray' | 'indigo' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'pink'
  size?: 'xs' | 'sm' | 'md'
}

const badgeStyles = {
  solid: {
    gray: 'bg-gray-900 text-white',
    indigo: 'bg-primary-500 text-white',
    green: 'bg-green-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    red: 'bg-red-500 text-white',
    blue: 'bg-blue-500 text-white',
    purple: 'bg-purple-500 text-white',
    pink: 'bg-pink-500 text-white',
  },
  soft: {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    indigo: 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  },
  outline: {
    gray: 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
    indigo: 'border border-primary-300 text-primary-700 dark:border-primary-700 dark:text-primary-300',
    green: 'border border-green-300 text-green-700 dark:border-green-700 dark:text-green-300',
    yellow: 'border border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300',
    red: 'border border-red-300 text-red-700 dark:border-red-700 dark:text-red-300',
    blue: 'border border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300',
    purple: 'border border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300',
    pink: 'border border-pink-300 text-pink-700 dark:border-pink-700 dark:text-pink-300',
  },
  dot: {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    indigo: 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  },
}

const sizes = {
  xs: 'px-1.5 py-0.5 text-[10px] leading-none',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

const legacyVariantMap: Record<string, { variant: keyof typeof badgeStyles; color: keyof typeof badgeStyles.soft }> = {
  secondary: { variant: 'soft', color: 'gray' },
  destructive: { variant: 'solid', color: 'red' },
  success: { variant: 'soft', color: 'green' },
  warning: { variant: 'soft', color: 'yellow' },
  info: { variant: 'soft', color: 'blue' },
  muted: { variant: 'soft', color: 'gray' },
  glass: { variant: 'soft', color: 'gray' },
  default: { variant: 'solid', color: 'indigo' },
}

const BadgeComponent = ({
  className,
  variant = 'soft',
  color = 'gray',
  size = 'sm',
  ...props
}: BadgeProps) => {
  let finalVariant = variant as keyof typeof badgeStyles
  let finalColor = color as keyof typeof badgeStyles.soft

  if (variant && variant in legacyVariantMap) {
    const mapped = legacyVariantMap[variant]
    finalVariant = mapped.variant
    finalColor = mapped.color
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        badgeStyles[finalVariant][finalColor],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}

const Badge = memo(BadgeComponent)

export { Badge }


