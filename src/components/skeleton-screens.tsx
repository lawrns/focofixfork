'use client'

import React from 'react'
import { cn } from '@/lib/utils'

/**
 * Base Skeleton Component
 * Provides the foundation for all skeleton screens with animation
 */
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

/**
 * ProjectCardSkeleton - Matches ProjectCard layout
 * Used in project lists to show loading state while fetching project data
 */
export function ProjectCardSkeleton() {
  return (
    <div
      className="rounded-lg border bg-card p-6 space-y-4"
      data-testid="project-card-skeleton"
    >
      {/* Header with title and status badge */}
      <div className="flex items-center justify-between">
        <Skeleton
          className="h-5 w-48"
          data-testid="project-title-skeleton"
        />
        <Skeleton
          className="h-6 w-16 rounded-full"
          data-testid="project-status-skeleton"
        />
      </div>

      {/* Description lines */}
      <div className="space-y-2">
        <Skeleton
          className="h-4 w-full"
          data-testid="project-desc-skeleton"
        />
        <Skeleton
          className="h-4 w-3/4"
          data-testid="project-desc-skeleton"
        />
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Skeleton
          className="h-2 w-full rounded"
          data-testid="project-progress-skeleton"
        />
        <div className="flex items-center justify-between">
          <Skeleton
            className="h-3 w-12"
            data-testid="project-meta-skeleton"
          />
          <Skeleton
            className="h-3 w-16"
            data-testid="project-meta-skeleton"
          />
        </div>
      </div>

      {/* Footer metadata */}
      <div className="flex gap-4 pt-2">
        <Skeleton
          className="h-4 w-20"
          data-testid="project-meta-skeleton"
        />
        <Skeleton
          className="h-4 w-24"
          data-testid="project-meta-skeleton"
        />
      </div>
    </div>
  )
}

/**
 * ProjectListSkeleton - Renders multiple project skeleton cards
 * Shows a list of loading project cards
 */
interface ProjectListSkeletonProps {
  itemCount?: number
  className?: string
}

export function ProjectListSkeleton({
  itemCount = 5,
  className
}: ProjectListSkeletonProps) {
  return (
    <div
      className={cn('space-y-4', className)}
      data-testid="project-list-skeleton-wrapper"
    >
      {Array.from({ length: itemCount }).map((_, index) => (
        <ProjectCardSkeleton key={index} />
      ))}
    </div>
  )
}

/**
 * TaskCardSkeleton - Matches TaskCard layout
 * Shows loading state for individual task cards
 */
export function TaskCardSkeleton() {
  return (
    <div
      className="flex items-center space-x-4 p-4 rounded-lg border bg-card"
      data-testid="task-card-skeleton"
    >
      {/* Checkbox placeholder */}
      <Skeleton
        className="h-4 w-4 rounded"
        data-testid="task-checkbox-skeleton"
      />

      {/* Task content area */}
      <div className="flex-1 space-y-2">
        {/* Task title */}
        <Skeleton
          className="h-4 w-3/4"
          data-testid="task-title-skeleton"
        />
        {/* Task subtitle/description */}
        <Skeleton
          className="h-3 w-1/2"
          data-testid="task-desc-skeleton"
        />
      </div>

      {/* Right side metadata */}
      <div className="flex items-center gap-2">
        {/* Priority indicator */}
        <Skeleton
          className="h-5 w-8 rounded"
          data-testid="task-priority-skeleton"
        />

        {/* Due date */}
        <Skeleton
          className="h-4 w-16"
          data-testid="task-due-date-skeleton"
        />

        {/* Assignee avatar */}
        <Skeleton
          className="h-6 w-6 rounded-full"
          data-testid="task-assignee-skeleton"
        />
      </div>
    </div>
  )
}

/**
 * TaskListSkeleton - Renders multiple task skeleton cards
 * Shows a list of loading task cards
 */
interface TaskListSkeletonProps {
  itemCount?: number
  className?: string
}

export function TaskListSkeleton({
  itemCount = 5,
  className
}: TaskListSkeletonProps) {
  return (
    <div
      className={cn('space-y-3', className)}
      data-testid="task-list-skeleton-wrapper"
    >
      {Array.from({ length: itemCount }).map((_, index) => (
        <TaskCardSkeleton key={index} />
      ))}
    </div>
  )
}

/**
 * DashboardWidgetSkeleton - Generic widget loading state
 * Used for stat cards, charts, and other dashboard widgets
 */
interface DashboardWidgetSkeletonProps {
  className?: string
}

export function DashboardWidgetSkeleton({ className }: DashboardWidgetSkeletonProps) {
  return (
    <div
      className={cn('rounded-lg border bg-card p-6 space-y-4', className)}
      data-testid="dashboard-widget-skeleton"
    >
      {/* Widget title */}
      <Skeleton
        className="h-5 w-40"
        data-testid="widget-title-skeleton"
      />

      {/* Widget content area */}
      <div className="space-y-3">
        <Skeleton
          className="h-8 w-24"
          data-testid="widget-content-skeleton"
        />
        <Skeleton
          className="h-12 w-full rounded-lg"
          data-testid="widget-content-skeleton"
        />
      </div>

      {/* Widget footer */}
      <div className="flex justify-between pt-2">
        <Skeleton
          className="h-3 w-16"
          data-testid="widget-footer-skeleton"
        />
        <Skeleton
          className="h-3 w-16"
          data-testid="widget-footer-skeleton"
        />
      </div>
    </div>
  )
}

/**
 * DashboardSkeleton - Full dashboard loading state
 * Renders the complete dashboard skeleton with header, stats, and content sections
 */
interface DashboardSkeletonProps {
  className?: string
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div
      className={cn('space-y-6', className)}
      data-testid="dashboard-skeleton"
    >
      {/* Header section */}
      <div
        className="flex items-center justify-between"
        data-testid="dashboard-header-skeleton"
      >
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* Stats cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border bg-card p-6 space-y-3"
            data-testid="dashboard-stat-card-skeleton"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-6" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Main content section */}
      <div
        className="rounded-lg border bg-card p-6"
        data-testid="dashboard-main-content-skeleton"
      >
        <div className="space-y-4">
          {/* Content header */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Content table/list */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex gap-4 py-2">
                {Array.from({ length: 4 }).map((_, colIndex) => (
                  <Skeleton
                    key={colIndex}
                    className={cn(
                      'h-4 flex-1',
                      colIndex === 3 ? 'w-1/2' : ''
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * StatCardSkeleton - Minimal stat card loading state
 * For quick stat display in dashboards
 */
export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-6" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

/**
 * ChartSkeleton - Loading state for chart widgets
 */
export function ChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-64 w-full rounded-lg" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  )
}

/**
 * TableSkeleton - Loading state for data tables
 */
interface TableSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className
}: TableSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 w-20" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * PageLoadingSkeleton - Full page loading state
 * Shows a minimal loading skeleton for full page transitions
 */
export function PageLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  )
}

/**
 * InlineLoadingSkeleton - Small loading state for buttons or inline content
 */
export function InlineLoadingSkeleton({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <Skeleton className={`rounded-full ${sizeClasses[size]}`} />
  )
}

export { Skeleton }
