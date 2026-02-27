'use client'

import React, { useRef, useEffect } from 'react'
import { useSwarm } from './swarm-context'

interface SwarmDockTargetProps {
  children: React.ReactNode
  className?: string
}

export function SwarmDockTarget({ children, className }: SwarmDockTargetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { dockTargetRef } = useSwarm()

  useEffect(() => {
    // Register this element's ref into the context so SwarmProvider can read its rect
    if (ref.current) {
      // dockTargetRef is a MutableRefObject; assign current
      ;(dockTargetRef as React.MutableRefObject<HTMLDivElement | null>).current = ref.current
    }
    return () => {
      // Clean up only if this element is still the registered one
      if ((dockTargetRef as React.MutableRefObject<HTMLDivElement | null>).current === ref.current) {
        ;(dockTargetRef as React.MutableRefObject<HTMLDivElement | null>).current = null
      }
    }
  }, [dockTargetRef])

  return (
    <div ref={ref} data-swarm-target="true" className={className}>
      {children}
    </div>
  )
}
