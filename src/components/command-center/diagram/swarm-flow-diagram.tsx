'use client'

import { memo } from 'react'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Bot } from 'lucide-react'
import type { FlowLane, FlowMove, UnifiedAgent, AgentNodeStatus } from '@/lib/command-center/types'
import { AGENT_STATUS_DOT, BACKEND_LABELS } from '@/lib/command-center/types'

// ── Status dot ────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: AgentNodeStatus }) {
  return (
    <span className={cn('inline-block h-2 w-2 rounded-full flex-shrink-0', AGENT_STATUS_DOT[status])} />
  )
}

// ── Agent node card ───────────────────────────────────────────────────────────

const MODEL_COLORS: Record<string, string> = {
  OPUS:    'bg-purple-500/10 text-purple-600 border-purple-400/40',
  SONNET:  'bg-blue-500/10 text-blue-600 border-blue-400/40',
  KIMI:    'bg-teal-500/10 text-teal-600 border-teal-400/40',
  'GLM-5': 'bg-amber-500/10 text-amber-600 border-amber-400/40',
}

interface AgentNodeCardProps {
  agent: UnifiedAgent
  selected: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

const AgentNodeCard = memo(
  React.forwardRef<HTMLDivElement, AgentNodeCardProps>(function AgentNodeCard(
    { agent, selected, onClick, onContextMenu },
    ref,
  ) {
    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={onClick}
        onContextMenu={onContextMenu}
        className={cn(
        'group relative flex flex-col gap-1 rounded-lg border px-3 py-2.5 cursor-pointer',
        'bg-card hover:bg-accent/40 transition-colors text-left',
        selected && 'border-[color:var(--foco-teal)] bg-[color:var(--foco-teal)]/5 ring-1 ring-[color:var(--foco-teal)]/30',
        !selected && 'border-border',
      )}
    >
      <div className="flex items-center gap-2">
        <StatusDot status={agent.status} />
        <span className="text-[12px] font-medium leading-tight truncate max-w-[120px]">
          {agent.name}
        </span>
        {agent.model && (
          <span className={cn(
            'ml-auto text-[9px] font-mono border rounded px-1 py-px flex-shrink-0',
            MODEL_COLORS[agent.model] ?? 'bg-zinc-500/10 text-zinc-500 border-zinc-400/40'
          )}>
            {agent.model}
          </span>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground truncate">{agent.role}</span>
      {agent.status === 'working' && (
        <motion.div
          className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-400/60"
          animate={{ scaleX: [0.2, 1, 0.2] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
    )
  }),
)

// ── Lane column ───────────────────────────────────────────────────────────────

interface LaneColumnProps {
  lane: FlowLane
  selectedAgentId: string | null
  onNodeClick: (agent: UnifiedAgent) => void
  onNodeContextMenu: (agent: UnifiedAgent, e: React.MouseEvent) => void
}

const LANE_ACCENTS: Record<string, string> = {
  crico:    'border-purple-400/30',
  clawdbot: 'border-teal-400/30',
  bosun:    'border-amber-400/30',
  openclaw: 'border-blue-400/30',
}

function LaneColumn({ lane, selectedAgentId, onNodeClick, onNodeContextMenu }: LaneColumnProps) {
  return (
    <div className="flex flex-col gap-2 min-w-[180px] max-w-[220px]">
      {/* Lane header */}
      <div className={cn(
        'rounded-md border px-3 py-1.5 flex items-center gap-2',
        'bg-muted/40',
        LANE_ACCENTS[lane.backend] ?? 'border-border'
      )}>
        <Bot className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
          {BACKEND_LABELS[lane.backend]}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {lane.agents.length}
        </span>
      </div>

      {/* Agent cards */}
      <AnimatePresence mode="popLayout">
        {lane.agents.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-md border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground"
          >
            No agents
          </motion.div>
        ) : (
          lane.agents.map(agent => (
            <AgentNodeCard
              key={agent.id}
              agent={agent}
              selected={selectedAgentId === agent.id}
              onClick={() => onNodeClick(agent)}
              onContextMenu={(e) => onNodeContextMenu(agent, e)}
            />
          ))
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main SwarmFlowDiagram ─────────────────────────────────────────────────────

export interface SwarmFlowDiagramProps {
  lanes: FlowLane[]
  moves: FlowMove[]
  selectedAgentId: string | null
  onNodeClick: (agent: UnifiedAgent) => void
  onNodeContextMenu: (agent: UnifiedAgent, e: React.MouseEvent) => void
  className?: string
}

export const SwarmFlowDiagram = memo(function SwarmFlowDiagram({
  lanes,
  moves,
  selectedAgentId,
  onNodeClick,
  onNodeContextMenu,
  className,
}: SwarmFlowDiagramProps) {
  return (
    <div className={cn('relative overflow-x-auto', className)}>
      {/* Packet animations overlay — decorative dots travelling horizontally */}
      <AnimatePresence>
        {moves.slice(-8).map(move => (
          <motion.div
            key={`${move.from}-${move.to}-${move.ts}`}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full pointer-events-none z-10',
              move.type === 'complete' && 'bg-emerald-400',
              move.type === 'block'    && 'bg-amber-400',
              move.type === 'progress' && 'bg-teal-400',
              move.type === 'spawn'    && 'bg-purple-400',
            )}
            initial={{ x: '0%', opacity: 1 }}
            animate={{ x: '100%', opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeIn' }}
          />
        ))}
      </AnimatePresence>

      {/* Lanes */}
      <div className="flex gap-4 p-4 min-w-max">
        {lanes.map((lane, i) => (
          <div key={lane.id} className="flex items-start gap-4">
            <LaneColumn
              lane={lane}
              selectedAgentId={selectedAgentId}
              onNodeClick={onNodeClick}
              onNodeContextMenu={onNodeContextMenu}
            />
            {i < lanes.length - 1 && (
              <div className="self-stretch flex items-center">
                <div className="w-px h-full bg-border/60" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
})
