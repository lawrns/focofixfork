'use client'

import React from 'react'
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import { IconButton } from './accessible-button'
import { cn } from '@/lib/utils'

interface HelpTooltipProps {
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
  children?: React.ReactNode
}

export function HelpTooltip({ 
  content, 
  side = 'top', 
  className,
  children 
}: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <IconButton
              icon={<HelpCircle className="h-4 w-4" />}
              label="Help"
              className={className}
            />
          )}
        </TooltipTrigger>
        <TooltipContent side={side}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface ContextualHelpProps {
  title: string
  content: React.ReactNode
  trigger?: React.ReactNode
  className?: string
}

export function ContextualHelp({ 
  title, 
  content, 
  trigger,
  className 
}: ContextualHelpProps) {
  return (
    <HelpTooltip
      content={
        <div className="max-w-xs space-y-2">
          <h4 className="font-semibold text-sm">{title}</h4>
          <div className="text-sm text-muted-foreground">
            {content}
          </div>
        </div>
      }
      className={className}
    >
      {trigger}
    </HelpTooltip>
  )
}

interface FeatureHighlightProps {
  feature: string
  description: string
  children: React.ReactNode
  className?: string
}

export function FeatureHighlight({ 
  feature, 
  description, 
  children,
  className 
}: FeatureHighlightProps) {
  return (
    <div className={cn("relative group", className)}>
      {children}
      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ContextualHelp
          title={feature}
          content={description}
          trigger={
            <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs text-primary-foreground">?</span>
            </div>
          }
        />
      </div>
    </div>
  )
}
