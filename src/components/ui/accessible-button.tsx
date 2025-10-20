'use client'

import React from 'react'
import { Button, ButtonProps } from './button'
import { cn } from '@/lib/utils'

interface AccessibleButtonProps extends ButtonProps {
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-controls'?: string
  'aria-pressed'?: boolean
  'aria-current'?: boolean
  tooltip?: string
  loading?: boolean
  loadingText?: string
}

export const AccessibleButton = React.forwardRef<
  HTMLButtonElement,
  AccessibleButtonProps
>(({
  children,
  className,
  disabled,
  loading = false,
  loadingText = 'Loading...',
  tooltip,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
  'aria-pressed': ariaPressed,
  'aria-current': ariaCurrent,
  ...props
}, ref) => {
  const isDisabled = disabled || loading

  return (
    <Button
      ref={ref}
      className={cn(className)}
      disabled={isDisabled}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-pressed={ariaPressed}
      aria-current={ariaCurrent}
      title={tooltip}
      {...props}
    >
      {loading ? (
        <>
          <span className="sr-only">{loadingText}</span>
          <span aria-hidden="true">{loadingText}</span>
        </>
      ) : (
        children
      )}
    </Button>
  )
})

AccessibleButton.displayName = 'AccessibleButton'

interface IconButtonProps extends Omit<AccessibleButtonProps, 'children'> {
  icon: React.ReactNode
  label: string
}

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  IconButtonProps
>(({ icon, label, ...props }, ref) => {
  return (
    <AccessibleButton
      ref={ref}
      variant="ghost"
      size="compact"
      aria-label={label}
      {...props}
    >
      {icon}
    </AccessibleButton>
  )
})

IconButton.displayName = 'IconButton'
