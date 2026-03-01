'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { AGENT_STATUS_DOT, AGENT_STATUS_COLORS, BACKEND_LABELS } from '@/lib/command-center/types'
import type { UnifiedAgent } from '@/lib/command-center/types'

interface MobileAgentCardProps {
  agent: UnifiedAgent
  onTap: (agent: UnifiedAgent) => void
}

export function MobileAgentCard({ agent, onTap }: MobileAgentCardProps) {
  return (
    <button
      onClick={() => onTap(agent)}
      className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors"
    >
      <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', AGENT_STATUS_DOT[agent.status])} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">{agent.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{agent.role}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {agent.model && (
          <Badge variant="outline" className="text-[9px]">{agent.model}</Badge>
        )}
        <Badge className={cn('text-[10px] border-0', AGENT_STATUS_COLORS[agent.status])}>
          {agent.status}
        </Badge>
        <Badge variant="outline" className="text-[9px] hidden sm:inline-flex">
          {BACKEND_LABELS[agent.backend]}
        </Badge>
      </div>
    </button>
  )
}
