'use client'

import { Brain, Cpu, ScanSearch } from 'lucide-react'
import type { PipelineStatus } from '@/lib/pipeline/types'

interface OrchestrationGraphProps {
  status: PipelineStatus | null
  plannerModel: string
  executorModel: string
  reviewerModel: string
  hasTask?: boolean
}

type NodeState = 'idle' | 'active' | 'done' | 'failed'

function getNodeStates(status: PipelineStatus | null): [NodeState, NodeState, NodeState] {
  if (!status) return ['idle', 'idle', 'idle']
  switch (status) {
    case 'planning':  return ['active', 'idle',   'idle']
    case 'executing': return ['done',   'active',  'idle']
    case 'reviewing': return ['done',   'done',    'active']
    case 'complete':  return ['done',   'done',    'done']
    case 'failed':    return ['failed', 'failed',  'failed']
    case 'cancelled': return ['failed', 'failed',  'failed']
    default:          return ['idle',   'idle',    'idle']
  }
}

function getEdgeActive(status: PipelineStatus | null): [boolean, boolean] {
  if (!status) return [false, false]
  return [
    ['executing', 'reviewing', 'complete'].includes(status),
    ['reviewing', 'complete'].includes(status),
  ]
}

// Clearer sublabels shown inside each node
const MODEL_SUBLABEL: Record<string, string> = {
  'claude-opus-4-6':  'Opus 4.6',
  'kimi-k2-standard': 'K2 Standard',
  'kimi-k2-fast':     'K2 Fast',
  'kimi-k2-max':      'K2 Max',
  'codex-standard':   'Standard',
  'codex-mini':       'Mini',
  'codex-fast':       'Fast',
  'codex-pro':        'Pro',
  'codex-max':        'Max',
}

interface AgentNodeProps {
  icon: React.ReactNode
  label: string
  sublabel: string
  state: NodeState
  color: string
  glowColor: string
  x: number
  nodeW: number
  nodeH: number
  y: number
}

function statusText(s: NodeState) {
  if (s === 'active') return 'Running'
  if (s === 'done')   return 'Done'
  if (s === 'failed') return 'Failed'
  return null
}

function AgentNode({ icon, label, sublabel, state, color, glowColor, x, nodeW, nodeH, y }: AgentNodeProps) {
  const borderColor =
    state === 'active' ? color :
    state === 'done'   ? '#10b981' :
    state === 'failed' ? '#ef4444' :
    'hsl(var(--border))'

  const bgColor =
    state === 'active' ? `${color}15` :
    state === 'done'   ? '#10b98115' :
    state === 'failed' ? '#ef444415' :
    'transparent'

  const badgeColor =
    state === 'active' ? color :
    state === 'done'   ? '#10b981' :
    state === 'failed' ? '#ef4444' :
    'hsl(var(--muted-foreground))'

  const nodeStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: '10px',
    border: `2px solid ${borderColor}`,
    backgroundColor: bgColor,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    padding: '10px 8px',
    boxSizing: 'border-box',
    boxShadow: state === 'active' ? `0 0 14px ${glowColor}` : undefined,
    transition: 'border-color 0.3s, background-color 0.3s, box-shadow 0.3s',
    position: 'relative',
  }

  const iconBoxStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '7px',
    color,
    backgroundColor: `${color}20`,
    flexShrink: 0,
  }

  const txt = statusText(state)

  return (
    <foreignObject x={x} y={y} width={nodeW} height={nodeH}>
      <div style={{ width: '100%', height: '100%' }}>
        {state === 'active' && (
          <div
            className="animate-ping absolute inset-0 opacity-20"
            style={{ border: `2px solid ${color}`, pointerEvents: 'none', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '10px', boxSizing: 'border-box' }}
          />
        )}
        <div style={nodeStyle}>
          <div style={iconBoxStyle}>{icon}</div>
          <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: state === 'idle' ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
            }}>
              {label}
            </div>
            <div style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', fontFamily: 'monospace', marginTop: '1px' }}>
              {sublabel}
            </div>
          </div>
          {txt && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '9px',
              fontWeight: 700,
              color: badgeColor,
              backgroundColor: `${badgeColor}18`,
              borderRadius: '999px',
              padding: '2px 7px',
            }}>
              {state === 'done' && <span>✔</span>}
              {state === 'failed' && <span>✕</span>}
              <span>{txt}</span>
            </div>
          )}
        </div>
      </div>
    </foreignObject>
  )
}

interface EdgeProps {
  x1: number; x2: number; y: number
  color: string
  active: boolean
  markerId: string
}

function Edge({ x1, x2, y, color, active, markerId }: EdgeProps) {
  const mid = (x1 + x2) / 2
  const arrowOffset = 10 // pull end back so arrow tip sits on x2
  const d = `M ${x1} ${y} C ${mid - 10} ${y} ${mid + 10} ${y} ${x2 - arrowOffset} ${y}`
  const dFull = `M ${x1} ${y} C ${mid - 10} ${y} ${mid + 10} ${y} ${x2} ${y}`

  return (
    <g>
      {/* Static dashed base line */}
      <path
        d={dFull}
        stroke="hsl(var(--border))"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="4 4"
        opacity="0.7"
      />

      {/* Active: animated fill line */}
      {active && (
        <>
          <path d={d} stroke={color} strokeWidth="2" fill="none" strokeDasharray="8 6" markerEnd={`url(#${markerId})`}>
            <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="0.8s" repeatCount="indefinite" />
          </path>

          {/* Particles */}
          <circle r="3.5" fill={color} opacity="0.9">
            <animateMotion dur="1.2s" repeatCount="indefinite" begin="0s">
              <mpath xlinkHref={`#anim-${markerId}`} />
            </animateMotion>
          </circle>
          <circle r="2.5" fill={color} opacity="0.55">
            <animateMotion dur="1.2s" repeatCount="indefinite" begin="0.4s">
              <mpath xlinkHref={`#anim-${markerId}`} />
            </animateMotion>
          </circle>
          <circle r="2" fill={color} opacity="0.3">
            <animateMotion dur="1.2s" repeatCount="indefinite" begin="0.8s">
              <mpath xlinkHref={`#anim-${markerId}`} />
            </animateMotion>
          </circle>

          <defs>
            <path id={`anim-${markerId}`} d={dFull} />
          </defs>
        </>
      )}

      {/* Static arrowhead when not active */}
      {!active && (
        <path
          d={`M ${x2 - 8} ${y - 4} L ${x2} ${y} L ${x2 - 8} ${y + 4}`}
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
          fill="none"
          opacity="0.7"
        />
      )}
    </g>
  )
}

export function OrchestrationGraph({
  status,
  plannerModel,
  executorModel,
  reviewerModel,
  hasTask = false,
}: OrchestrationGraphProps) {
  const [plannerState, executorState, reviewerState] = getNodeStates(status)
  const [edge1Active, edge2Active] = getEdgeActive(status)

  // Compact layout optimised for ~420–560px rendered width
  const TOTAL_W = 660
  const TOTAL_H = 148
  const EDGE_Y  = 74   // vertical midpoint of nodes

  // Task input node
  const TASK_W = 76
  const TASK_H = 56
  const TASK_X = 8
  const TASK_Y = (TOTAL_H - TASK_H) / 2   // ~46

  // Agent nodes
  const NODE_W = 130
  const NODE_H = 116
  const NODE_Y = (TOTAL_H - NODE_H) / 2   // ~16

  // Evenly space 3 nodes after task block + gap
  const NODES_START = TASK_X + TASK_W + 24
  const NODES_SPAN  = TOTAL_W - NODES_START - 8
  const NODE_GAP    = Math.round((NODES_SPAN - 3 * NODE_W) / 2)

  const N1_X = NODES_START
  const N2_X = NODES_START + NODE_W + NODE_GAP
  const N3_X = NODES_START + 2 * (NODE_W + NODE_GAP)

  // Edge anchors
  const TASK_RIGHT = TASK_X + TASK_W
  const E0_X2 = N1_X
  const E1_X1 = N1_X + NODE_W
  const E1_X2 = N2_X
  const E2_X1 = N2_X + NODE_W
  const E2_X2 = N3_X

  const taskEdgeActive  = hasTask || status === 'planning'
  const taskBorderColor = hasTask ? 'var(--foco-teal, #00c8aa)' : 'hsl(var(--border))'
  const taskFill        = hasTask ? 'rgba(0,200,170,0.08)' : 'transparent'
  const taskTextColor   = hasTask ? 'var(--foco-teal, #00c8aa)' : 'hsl(var(--muted-foreground))'

  return (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Orchestration Graph
        </span>
      </div>

      <div className="w-full overflow-x-auto p-2">
        <svg
          viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
          className="w-full"
          style={{ minWidth: '420px', maxHeight: '160px' }}
        >
          <defs>
            {/* Arrowhead markers */}
            <marker id="arrow-teal" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M 0 0 L 7 3.5 L 0 7 z" fill="var(--foco-teal, #00c8aa)" />
            </marker>
            <marker id="arrow-indigo" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M 0 0 L 7 3.5 L 0 7 z" fill="#6366f1" />
            </marker>
          </defs>

          {/* Task entry node */}
          <rect
            x={TASK_X} y={TASK_Y} width={TASK_W} height={TASK_H}
            rx="8"
            fill={taskFill}
            stroke={taskBorderColor}
            strokeWidth="2"
            style={{ transition: 'stroke 0.3s, fill 0.3s' }}
          />
          {hasTask && (
            <rect
              x={TASK_X} y={TASK_Y} width={TASK_W} height={TASK_H}
              rx="8" fill="none"
              stroke="var(--foco-teal, #00c8aa)"
              strokeWidth="2" opacity="0.3"
              className="animate-ping"
              style={{ transformOrigin: `${TASK_X + TASK_W / 2}px ${TASK_Y + TASK_H / 2}px` }}
            />
          )}
          <text
            x={TASK_X + TASK_W / 2} y={TASK_Y + TASK_H / 2 - 6}
            textAnchor="middle"
            style={{ fontSize: '11px', fontWeight: 600, fill: taskTextColor, transition: 'fill 0.3s' }}
          >
            Task
          </text>
          <text
            x={TASK_X + TASK_W / 2} y={TASK_Y + TASK_H / 2 + 9}
            textAnchor="middle"
            style={{ fontSize: '9px', fill: 'hsl(var(--muted-foreground))', fontFamily: 'monospace' }}
          >
            input
          </text>

          {/* Edges */}
          <Edge
            x1={TASK_RIGHT} x2={E0_X2} y={EDGE_Y}
            color="var(--foco-teal, #00c8aa)"
            active={taskEdgeActive}
            markerId="task-claude"
          />
          <Edge x1={E1_X1} x2={E1_X2} y={EDGE_Y} color="#6366f1" active={edge1Active} markerId="claude-kimi" />
          <Edge x1={E2_X1} x2={E2_X2} y={EDGE_Y} color="var(--foco-teal, #00c8aa)" active={edge2Active} markerId="kimi-codex" />

          {/* Agent nodes */}
          <AgentNode
            icon={<Brain className="h-4 w-4" />}
            label="Claude"
            sublabel={MODEL_SUBLABEL[plannerModel] ?? plannerModel}
            state={plannerState}
            color="#6366f1"
            glowColor="rgba(99,102,241,0.35)"
            x={N1_X} y={NODE_Y} nodeW={NODE_W} nodeH={NODE_H}
          />
          <AgentNode
            icon={<Cpu className="h-4 w-4" />}
            label="Kimi"
            sublabel={MODEL_SUBLABEL[executorModel] ?? executorModel}
            state={executorState}
            color="var(--foco-teal, #00c8aa)"
            glowColor="rgba(0,200,170,0.35)"
            x={N2_X} y={NODE_Y} nodeW={NODE_W} nodeH={NODE_H}
          />
          <AgentNode
            icon={<ScanSearch className="h-4 w-4" />}
            label="Codex"
            sublabel={MODEL_SUBLABEL[reviewerModel] ?? reviewerModel}
            state={reviewerState}
            color="#f59e0b"
            glowColor="rgba(245,158,11,0.35)"
            x={N3_X} y={NODE_Y} nodeW={NODE_W} nodeH={NODE_H}
          />
        </svg>
      </div>
    </div>
  )
}
