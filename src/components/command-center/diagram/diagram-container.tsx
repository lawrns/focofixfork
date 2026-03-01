'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SwarmFlowDiagram } from './swarm-flow-diagram'
import { LaneContextMenu } from './lane-context-menu'
import { usePacketAnimationBridge } from './packet-animation-bridge'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import type { UnifiedAgent } from '@/lib/command-center/types'

interface DiagramContainerProps {
  className?: string
}

export function DiagramContainer({ className }: DiagramContainerProps) {
  const store = useCommandCenterStore()
  const lanes = store.toFlowLanes()
  const moves = usePacketAnimationBridge(store.agents)
  const router = useRouter()

  const [contextMenu, setContextMenu] = useState<{
    agent: UnifiedAgent
    x: number
    y: number
  } | null>(null)

  const handleNodeClick = useCallback((agent: UnifiedAgent) => {
    store.selectAgent(agent.id)
  }, [store])

  const handleNodeContextMenu = useCallback((agent: UnifiedAgent, e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ agent, x: e.clientX, y: e.clientY })
  }, [])

  const handleStop = useCallback(async (agent: UnifiedAgent) => {
    await store.stopAgent(agent.backend, agent.nativeId)
  }, [store])

  const handlePauseResume = useCallback(async (agent: UnifiedAgent) => {
    if (agent.status === 'paused') {
      await fetch('/api/command-center/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume', backend: agent.backend, nativeId: agent.nativeId }),
      })
    } else {
      await store.pauseAgent(agent.backend, agent.nativeId)
    }
  }, [store])

  const handleViewRuns = useCallback((agent: UnifiedAgent) => {
    router.push(`/runs?runner=${encodeURIComponent(agent.name)}`)
  }, [router])

  return (
    <>
      <SwarmFlowDiagram
        lanes={lanes}
        moves={moves}
        selectedAgentId={store.selectedAgentId}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        className={className}
      />

      <LaneContextMenu
        agent={contextMenu?.agent ?? null}
        open={!!contextMenu}
        position={{ x: contextMenu?.x ?? 0, y: contextMenu?.y ?? 0 }}
        onClose={() => setContextMenu(null)}
        onInspect={(agent) => store.selectAgent(agent.id)}
        onStop={handleStop}
        onPauseResume={handlePauseResume}
        onViewRuns={handleViewRuns}
      />
    </>
  )
}
