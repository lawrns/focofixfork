'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import { MobileAgentCard } from './mobile-agent-card'
import { SwarmFlowDiagram } from '../diagram/swarm-flow-diagram'
import { usePacketAnimationBridge } from '../diagram/packet-animation-bridge'
import type { UnifiedAgent } from '@/lib/command-center/types'

export function MobileCommandView() {
  const store = useCommandCenterStore()
  const lanes = store.toFlowLanes()
  const moves = usePacketAnimationBridge(store.agents)
  const [diagramExpanded, setDiagramExpanded] = useState(false)

  const handleTap = (agent: UnifiedAgent) => {
    store.selectAgent(agent.id)
  }

  const handleContextMenu = (agent: UnifiedAgent, e: React.MouseEvent) => {
    e.preventDefault()
    store.selectAgent(agent.id)
  }

  return (
    <div className="space-y-4">
      {/* Mini / expanded diagram */}
      <div className="rounded-lg border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wide">
            Swarm view
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setDiagramExpanded(v => !v)}
          >
            {diagramExpanded
              ? <Minimize2 className="h-3.5 w-3.5" />
              : <Maximize2 className="h-3.5 w-3.5" />
            }
          </Button>
        </div>
        <div
          className="transition-all duration-300 overflow-hidden"
          style={{ height: diagramExpanded ? 'auto' : '250px' }}
        >
          <SwarmFlowDiagram
            lanes={lanes}
            moves={moves}
            selectedAgentId={store.selectedAgentId}
            onNodeClick={handleTap}
            onNodeContextMenu={handleContextMenu}
          />
        </div>
      </div>

      {/* Agent card list */}
      <div className="space-y-2">
        {store.agents.map(agent => (
          <MobileAgentCard key={agent.id} agent={agent} onTap={handleTap} />
        ))}
        {store.agents.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No agents online</p>
        )}
      </div>
    </div>
  )
}
