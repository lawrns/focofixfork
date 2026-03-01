'use client'

import { Brain, Cpu, ScanSearch, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import type { PipelineStatus } from '@/lib/pipeline/types'

interface OrchestrationGraphProps {
  status: PipelineStatus | null
  plannerModel: string
  executorModel: string
  reviewerModel: string
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

const MODEL_ABBREV: Record<string, string> = {
  'claude-opus-4-6':  'Opus 4.6',
  'kimi-k2-standard': 'K2 Std',
  'kimi-k2-fast':     'K2 Fast',
  'kimi-k2-max':      'K2 Max',
  'codex-standard':   'Std',
  'codex-mini':       'Mini',
  'codex-fast':       'Fast',
  'codex-pro':        'Pro',
}

interface AgentNodeProps {
  icon: React.ReactNode
  label: string
  sublabel: string
  state: NodeState
  color: string
  glowColor: string
  x: number
}

function statusText(s: NodeState) {
  if (s === 'active') return 'Running'
  if (s === 'done')   return 'Done'
  if (s === 'failed') return 'Failed'
  return null
}

function AgentNode({ icon, label, sublabel, state, color, glowColor, x }: AgentNodeProps) {
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
    borderRadius: '12px',
    border: `2px solid ${borderColor}`,
    backgroundColor: bgColor,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '12px',
    boxSizing: 'border-box',
    boxShadow: state === 'active' ? `0 0 16px ${glowColor}` : undefined,
    transition: 'border-color 0.3s, background-color 0.3s, box-shadow 0.3s',
    position: 'relative',
  }

  const iconBoxStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    color,
    backgroundColor: `${color}20`,
    flexShrink: 0,
  }

  const txt = statusText(state)

  return (
    <foreignObject x={x} y={10} width={130} height={120}>
      {/* @ts-ignore – xmlns required for SVG foreignObject HTML content */}
      <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100%', height: '100%' }}>
        {/* Ping ring for active */}
        {state === 'active' && (
          <div
            className="animate-ping absolute inset-0 rounded-xl opacity-20"
            style={{ border: `2px solid ${color}`, pointerEvents: 'none', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '12px', boxSizing: 'border-box' }}
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
            <div style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', fontFamily: 'monospace' }}>
              {sublabel}
            </div>
          </div>

          {txt && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '9px',
              fontWeight: 700,
              color: badgeColor,
              backgroundColor: `${badgeColor}18`,
              borderRadius: '999px',
              padding: '2px 8px',
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
}

function Edge({ x1, x2, y, color, active }: EdgeProps) {
  const mid = (x1 + x2) / 2
  const d = `M ${x1} ${y} C ${mid - 10} ${y} ${mid + 10} ${y} ${x2} ${y}`

  return (
    <g>
      {/* Static dashed line */}
      <path d={d} stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" strokeDasharray="4 4" />

      {/* Active: animated fill line + particles */}
      {active && (
        <>
          <path d={d} stroke={color} strokeWidth="2" fill="none" strokeDasharray="8 6">
            <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="0.8s" repeatCount="indefinite" />
          </path>

          {/* Particle 1 */}
          <circle r="3.5" fill={color} opacity="0.9">
            <animateMotion dur="1.2s" repeatCount="indefinite" begin="0s">
              <mpath xlinkHref={`#edge-${x1}-${x2}`} />
            </animateMotion>
          </circle>

          {/* Particle 2 */}
          <circle r="3" fill={color} opacity="0.6">
            <animateMotion dur="1.2s" repeatCount="indefinite" begin="0.4s">
              <mpath xlinkHref={`#edge-${x1}-${x2}`} />
            </animateMotion>
          </circle>

          {/* Particle 3 */}
          <circle r="2.5" fill={color} opacity="0.4">
            <animateMotion dur="1.2s" repeatCount="indefinite" begin="0.8s">
              <mpath xlinkHref={`#edge-${x1}-${x2}`} />
            </animateMotion>
          </circle>

          {/* Hidden path for animateMotion reference */}
          <defs>
            <path id={`edge-${x1}-${x2}`} d={d} />
          </defs>
        </>
      )}
    </g>
  )
}

export function OrchestrationGraph({
  status,
  plannerModel,
  executorModel,
  reviewerModel,
}: OrchestrationGraphProps) {
  const [plannerState, executorState, reviewerState] = getNodeStates(status)
  const [edge1Active, edge2Active] = getEdgeActive(status)

  const NODE_W  = 130
  const TOTAL_W = 700
  const N1_X    = 20
  const N2_X    = Math.round((TOTAL_W - NODE_W) / 2) - 15
  const N3_X    = TOTAL_W - NODE_W - 20

  const EDGE1_Y = 70
  // Edge x coords: right edge of node 1, left edge of node 2
  const E1_X1 = N1_X + NODE_W
  const E1_X2 = N2_X
  const E2_X1 = N2_X + NODE_W
  const E2_X2 = N3_X

  return (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Orchestration Graph
        </span>
      </div>

      <div className="w-full overflow-x-auto p-2">
        <svg viewBox="0 0 700 140" className="w-full" style={{ minWidth: '480px' }}>
          <Edge x1={E1_X1} x2={E1_X2} y={EDGE1_Y} color="#6366f1" active={edge1Active} />
          <Edge x1={E2_X1} x2={E2_X2} y={EDGE1_Y} color="var(--foco-teal, #00c8aa)" active={edge2Active} />

          <AgentNode
            icon={<Brain className="h-4 w-4" />}
            label="Claude"
            sublabel={MODEL_ABBREV[plannerModel] ?? plannerModel}
            state={plannerState}
            color="#6366f1"
            glowColor="rgba(99,102,241,0.35)"
            x={N1_X}
          />
          <AgentNode
            icon={<Cpu className="h-4 w-4" />}
            label="Kimi"
            sublabel={MODEL_ABBREV[executorModel] ?? executorModel}
            state={executorState}
            color="var(--foco-teal, #00c8aa)"
            glowColor="rgba(0,200,170,0.35)"
            x={N2_X}
          />
          <AgentNode
            icon={<ScanSearch className="h-4 w-4" />}
            label="Codex"
            sublabel={MODEL_ABBREV[reviewerModel] ?? reviewerModel}
            state={reviewerState}
            color="#f59e0b"
            glowColor="rgba(245,158,11,0.35)"
            x={N3_X}
          />
        </svg>
      </div>
    </div>
  )
}
