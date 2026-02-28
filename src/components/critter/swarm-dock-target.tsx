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
    // Capture ref.current in a local variable so the cleanup function references
    // the same element that was registered (avoids the stale-ref-in-cleanup lint warning)
    const el = ref.current
    const mutableDockRef = dockTargetRef as React.MutableRefObject<HTMLDivElement | null>
    if (el) {
      mutableDockRef.current = el
    }
    return () => {
      // Clean up only if this element is still the registered one
      if (mutableDockRef.current === el) {
        mutableDockRef.current = null
      }
    }
  }, [dockTargetRef])

  return (
    <div ref={ref} data-swarm-target="true" className={className}>
      {children}
    </div>
  )
}
