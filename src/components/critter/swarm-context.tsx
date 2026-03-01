'use client'

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamic import breaks framer-motion out of the initial layout bundle.
// Without this, the Server Component boundary in layout.tsx tries to
// statically resolve framer-motion's ESM conditional exports, which
// produces an undefined webpack module factory and crashes all pages.
const CritterSwarmOverlay = dynamic(
  () => import('./critter-swarm-overlay').then(m => ({ default: m.CritterSwarmOverlay })),
  { ssr: false }
)

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

const NO_OP_REF = { current: null } as React.MutableRefObject<HTMLDivElement | null>

const NO_OP_CONTEXT: SwarmContextValue = {
  dispatchSwarm: () => undefined,
  dockTargetRef: NO_OP_REF,
}

export function useSwarm(): SwarmContextValue {
  const ctx = useContext(SwarmContext)
  // Return a no-op implementation if called outside SwarmProvider
  // (e.g. during SSR or before the provider has mounted)
  return ctx ?? NO_OP_CONTEXT
}

export function SwarmProvider({ children }: { children: React.ReactNode }) {
  const [swarms, setSwarms] = useState<SwarmRecord[]>([])
  const [mounted, setMounted] = useState(false)
  const dockTargetRef = useRef<HTMLDivElement | null>(null)
  const idCounterRef = useRef(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  const dispatchSwarm = useCallback((params: Omit<SwarmRecord, 'id'>) => {
    idCounterRef.current += 1
    const id = `swarm-${Date.now()}-${idCounterRef.current}`
    setSwarms(prev => [...prev, { ...params, id }])
  }, [])

  const handleComplete = useCallback((swarm: SwarmRecord) => {
    setSwarms(prev => prev.filter(s => s.id !== swarm.id))

    // Fire-and-forget ledger event (routed via server-side proxy to avoid exposing service token)
    fetch('/api/critter/swarm-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      {mounted && swarms.map(swarm => {
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
