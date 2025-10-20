import React from 'react'
import { Button } from './button'
import { Card, CardContent } from './card'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16'
  }

  const iconSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  return (
    <Card className={className}>
      <CardContent className={cn(
        "flex flex-col items-center justify-center text-center",
        sizeClasses[size]
      )}>
        {icon && (
          <div className={cn(
            "mb-4 text-muted-foreground",
            iconSizeClasses[size]
          )}>
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {description}
        </p>
        {action}
      </CardContent>
    </Card>
  )
}

interface OnboardingStepProps {
  step: number
  totalSteps: number
  title: string
  description: string
  children: React.ReactNode
  onNext?: () => void
  onPrevious?: () => void
  onSkip?: () => void
  nextLabel?: string
  previousLabel?: string
  skipLabel?: string
  showProgress?: boolean
}

export function OnboardingStep({
  step,
  totalSteps,
  title,
  description,
  children,
  onNext,
  onPrevious,
  onSkip,
  nextLabel = 'Next',
  previousLabel = 'Previous',
  skipLabel = 'Skip',
  showProgress = true
}: OnboardingStepProps) {
  const progress = (step / totalSteps) * 100

  return (
    <div className="space-y-6">
      {showProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-4">
        {children}
      </div>

      <div className="flex justify-between items-center">
        <div>
          {onPrevious && (
            <Button variant="outline" onClick={onPrevious}>
              {previousLabel}
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              {skipLabel}
            </Button>
          )}
          {onNext && (
            <Button onClick={onNext}>
              {nextLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
