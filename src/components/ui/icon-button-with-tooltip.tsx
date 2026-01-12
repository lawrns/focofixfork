'use client'

import React from 'react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip'
import { IconButton, IconButtonProps } from './accessible-button'
import { cn } from '@/lib/utils'

interface IconButtonWithTooltipProps extends Omit<IconButtonProps, 'label'> {
  icon: React.ReactNode
  label: string
  tooltipContent?: React.ReactNode
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
  tooltipDelayMs?: number
  showTooltip?: boolean
}

/**
 * IconButton with integrated Tooltip
 *
 * Provides accessible icon buttons with automatic tooltip display on hover/focus
 * with configurable positioning and delay.
 *
 * @example
 * <IconButtonWithTooltip
 *   icon={<Trash2 className="h-4 w-4" />}
 *   label="Delete task"
 *   tooltipContent="Delete this task permanently"
 *   tooltipSide="right"
 * />
 */
export const IconButtonWithTooltip = React.forwardRef<
  HTMLButtonElement,
  IconButtonWithTooltipProps
>(({
  icon,
  label,
  tooltipContent,
  tooltipSide = 'auto',
  tooltipDelayMs = 500,
  showTooltip = true,
  className,
  ...props
}, ref) => {
  // If no tooltip content provided, use label as fallback
  const content = tooltipContent || label

  // Return just icon button if tooltips are disabled
  if (!showTooltip) {
    return (
      <IconButton
        ref={ref}
        icon={icon}
        label={label}
        className={className}
        {...props}
      />
    )
  }

  return (
    <TooltipProvider delayDuration={tooltipDelayMs}>
      <Tooltip>
        <TooltipTrigger asChild>
          <IconButton
            ref={ref}
            icon={icon}
            label={label}
            className={cn('relative', className)}
            {...props}
          />
        </TooltipTrigger>
        <TooltipContent side={tooltipSide as any}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})

IconButtonWithTooltip.displayName = 'IconButtonWithTooltip'

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
