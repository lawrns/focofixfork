'use client'

import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useSwarm } from './swarm-context'

export interface CritterLaunchPadButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string
  runId?: string
  runner?: string
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-xs'
  children?: React.ReactNode
}

export function CritterLaunchPadButton({
  label,
  runId,
  runner,
  variant = 'default',
  size = 'md',
  onClick,
  children,
  ...rest
}: CritterLaunchPadButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const { dispatchSwarm } = useSwarm()

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (ref.current) {
      const sourceRect = ref.current.getBoundingClientRect()
      dispatchSwarm({
        sourceRect,
        label: label ?? 'Launching critters…',
        runId,
        runner,
      })
    }
    if (onClick) {
      onClick(e)
    }
  }

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Button>
  )
}
