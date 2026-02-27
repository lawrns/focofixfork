'use client'

import React, { createContext, useContext, useRef, useState, useCallback } from 'react'
import { CritterSwarmOverlay } from './critter-swarm-overlay'

export interface SwarmRecord {
  id: string
  sourceRect: DOMRect
  label: string
  runId?: string
  runner?: string
}

export interface SwarmContextValue {
  dispatchSwarm: (params: Omit<SwarmRecord, 'id'>) => void
  dockTargetRef: React.RefObject<HTMLDivElement | null>
}

const SwarmContext = createContext<SwarmContextValue | null>(null)

export function useSwarm(): SwarmContextValue {
  const ctx = useContext(SwarmContext)
  if (!ctx) {
    throw new Error('useSwarm must be used within a SwarmProvider')
  }
  return ctx
}

export function SwarmProvider({ children }: { children: React.ReactNode }) {
  const [swarms, setSwarms] = useState<SwarmRecord[]>([])
  const dockTargetRef = useRef<HTMLDivElement | null>(null)

  const dispatchSwarm = useCallback((params: Omit<SwarmRecord, 'id'>) => {
    const id = `swarm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setSwarms(prev => [...prev, { ...params, id }])
  }, [])

  const handleComplete = useCallback((swarm: SwarmRecord) => {
    setSwarms(prev => prev.filter(s => s.id !== swarm.id))

    // Fire-and-forget ledger event
    fetch('/api/openclaw/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENCLAW_TOKEN ?? ''}`,
      },
      body: JSON.stringify({
        type: 'ui.critter.swarm.completed',
        source: 'foco-ui',
        context_id: swarm.runId ?? null,
        payload: {
          swarm_id: swarm.id,
          label: swarm.label,
          runner: swarm.runner,
        },
      }),
    }).catch(() => {
      // silently ignore
    })
  }, [])

  return (
    <SwarmContext.Provider value={{ dispatchSwarm, dockTargetRef }}>
      {children}
      {swarms.map(swarm => {
        const targetRect = dockTargetRef.current?.getBoundingClientRect() ?? null
        return (
          <CritterSwarmOverlay
            key={swarm.id}
            swarmId={swarm.id}
            sourceRect={swarm.sourceRect}
            targetRect={targetRect}
            label={swarm.label}
            onComplete={() => handleComplete(swarm)}
          />
        )
      })}
    </SwarmContext.Provider>
  )
}
