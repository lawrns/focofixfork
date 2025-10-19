'use client'

import { Label as LabelModel } from '@/lib/models/labels'
import { cn } from '@/lib/utils'

interface LabelBadgeProps {
  label: LabelModel
  onClick?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'compact' | 'outline'
}

export function LabelBadge({
  label,
  onClick,
  className,
  size = 'md',
  variant = 'default'
}: LabelBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  }

  const variantClasses = {
    default: 'text-white',
    compact: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800',
    outline: 'text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-colors',
        sizeClasses[size],
        variantClasses[variant],
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      style={variant === 'default' ? { backgroundColor: label.color } : {}}
      onClick={onClick}
      title={label.name}
    >
      {variant !== 'default' && (
        <div
          className="w-2 h-2 rounded-full mr-1.5"
          style={{ backgroundColor: label.color }}
        />
      )}
      {label.name}
    </span>
  )
}

interface LabelBadgeListProps {
  labels: LabelModel[]
  onLabelClick?: (label: LabelModel) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'compact' | 'outline'
  maxVisible?: number
}

export function LabelBadgeList({
  labels,
  onLabelClick,
  className,
  size = 'md',
  variant = 'default',
  maxVisible = 3
}: LabelBadgeListProps) {
  if (labels.length === 0) return null

  const visibleLabels = labels.slice(0, maxVisible)
  const remainingCount = labels.length - maxVisible

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visibleLabels.map((label) => (
        <LabelBadge
          key={label.id}
          label={label}
          onClick={onLabelClick ? () => onLabelClick(label) : undefined}
          size={size}
          variant={variant}
        />
      ))}
      {remainingCount > 0 && (
        <span className={cn(
          'inline-flex items-center rounded-full font-medium text-gray-500 dark:text-gray-400',
          sizeClasses[size]
        )}>
          +{remainingCount}
        </span>
      )}
    </div>
  )
}

// Helper for size classes
const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-3 py-1.5'
}
