import { useRef, useEffect, useState } from 'react'
import type { UnifiedAgent, FlowMove } from '@/lib/command-center/types'

const MAX_MOVES = 24

export function usePacketAnimationBridge(agents: UnifiedAgent[]): FlowMove[] {
  const prevAgentsRef = useRef<UnifiedAgent[]>([])
  const [moves, setMoves] = useState<FlowMove[]>([])

  useEffect(() => {
    const prev = prevAgentsRef.current
    const newMoves: FlowMove[] = []

    for (const agent of agents) {
      const prevAgent = prev.find(a => a.id === agent.id)
      if (!prevAgent) {
        // New agent spawned
        newMoves.push({
          from: agent.backend,
          to: agent.id,
          type: 'spawn',
          ts: Date.now(),
        })
      } else if (prevAgent.status !== agent.status) {
        // Status transition
        const type: FlowMove['type'] =
          agent.status === 'done'    ? 'complete' :
          agent.status === 'blocked' ? 'block'    :
          agent.status === 'working' ? 'progress' : 'progress'

        newMoves.push({
          from: prevAgent.id,
          to: agent.id,
          type,
          ts: Date.now(),
        })
      }
    }

    if (newMoves.length > 0) {
      setMoves(prev => [...prev.slice(-(MAX_MOVES - newMoves.length)), ...newMoves])
    }

    prevAgentsRef.current = agents
  }, [agents])

  return moves
}
