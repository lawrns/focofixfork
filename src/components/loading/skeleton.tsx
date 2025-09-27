import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
      {...props}
    />
  )
}

// Specialized skeleton components for different content types

interface SkeletonTextProps {
  lines?: number
  className?: string
}

const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 1, className }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        className={cn(
          'h-4',
          index === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
        )}
      />
    ))}
  </div>
)

interface SkeletonCardProps {
  showAvatar?: boolean
  showActions?: boolean
  className?: string
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showAvatar = false,
  showActions = false,
  className
}) => (
  <div className={cn('rounded-lg border p-4', className)}>
    <div className="flex items-start space-x-4">
      {showAvatar && (
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
      )}
      <div className="flex-1 space-y-3">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
        </div>
        <SkeletonText lines={2} />
        {showActions && (
          <div className="flex space-x-2 pt-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        )}
      </div>
    </div>
  </div>
)

interface SkeletonTableProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
}

const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className
}) => (
  <div className={cn('space-y-4', className)}>
    {showHeader && (
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
    )}
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                'h-4 flex-1',
                colIndex === columns - 1 ? 'w-1/2' : ''
              )}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
)

interface SkeletonProjectCardProps {
  className?: string
}

const SkeletonProjectCard: React.FC<SkeletonProjectCardProps> = ({ className }) => (
  <div className={cn('rounded-lg border p-6 space-y-4', className)}>
    <div className="flex items-center space-x-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
    <Skeleton className="h-32 w-full rounded-lg" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
    <div className="flex space-x-2">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-16" />
    </div>
  </div>
)

interface SkeletonMilestoneProps {
  className?: string
}

const SkeletonMilestone: React.FC<SkeletonMilestoneProps> = ({ className }) => (
  <div className={cn('flex items-center space-x-4 p-4 border rounded-lg', className)}>
    <Skeleton className="h-8 w-8 rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-48" />
    </div>
    <div className="flex items-center space-x-2">
      <Skeleton className="h-6 w-12" />
      <Skeleton className="h-6 w-12" />
    </div>
  </div>
)

interface SkeletonDashboardProps {
  className?: string
}

const SkeletonDashboard: React.FC<SkeletonDashboardProps> = ({ className }) => (
  <div className={cn('space-y-6', className)}>
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>

    {/* Stats grid skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="p-6 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-6" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>

    {/* Content skeleton */}
    <div className="border rounded-lg p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <SkeletonTable rows={5} columns={4} />
      </div>
    </div>
  </div>
)

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonProjectCard,
  SkeletonMilestone,
  SkeletonDashboard
}


