'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BaseEmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  primaryAction?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  illustration?: ReactNode
  className?: string
  children?: ReactNode
}

export function BaseEmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  illustration,
  className,
  children
}: BaseEmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-8 text-center',
      'animate-fade-in',
      className
    )}>
      {/* Illustration or Icon */}
      <div className="mb-8">
        {illustration ? (
          <div className="w-48 h-48 mx-auto mb-6">
            {illustration}
          </div>
        ) : icon ? (
          <div className="w-16 h-16 mx-auto mb-6 text-gray-400">
            {icon}
          </div>
        ) : (
          <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {title}
        </h3>
        <p className="text-gray-600 mb-8 leading-relaxed">
          {description}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              variant={primaryAction.variant || 'default'}
              className="min-w-[140px]"
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              className="min-w-[140px]"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>

      {/* Additional content */}
      {children}
    </div>
  )
}
