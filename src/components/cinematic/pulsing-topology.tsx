'use client'

import { memo, useCallback, useId, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bot,
  Brain,
  Cog,
  Globe,
  Minus,
  Network,
  Plus,
  RotateCcw,
  Server,
  ShieldCheck,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Types ─────────────────────────────────────────────────────────────────── */

export type NodeStatus = 'healthy' | 'degraded' | 'down' | 'idle'

export interface TopoNode {
  id: string
  label: string
  icon?: string        // legacy emoji fallback (ignored if iconType is set)
  iconType?: string    // key into ICON_MAP — renders as lucide SVG
  status: NodeStatus
  x: number
  y: number
}

export interface TopoEdge {
  from: string
  to: string
  animated?: boolean
}

export interface PulsingTopologyProps {
  nodes: TopoNode[]
  edges: TopoEdge[]
  className?: string
  width?: number
  height?: number
  initialZoom?: number
}

/* ── Icon map ──────────────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, LucideIcon> = {
  bot: Bot,
  brain: Brain,
  cog: Cog,
  globe: Globe,
  network: Network,
  server: Server,
  shield: ShieldCheck,
  wifi: Wifi,
  zap: Zap,
}

/* ── Color mapping ─────────────────────────────────────────────────────────── */

const STATUS_STROKE: Record<NodeStatus, string> = {
  healthy: 'var(--foco-teal)',
  degraded: '#f59e0b',
  down: '#ef4444',
  idle: '#52525b',
}

const STATUS_FILL: Record<NodeStatus, string> = {
  healthy: 'rgba(0,212,170,0.08)',
  degraded: 'rgba(245,158,11,0.08)',
  down: 'rgba(239,68,68,0.08)',
  idle: 'rgba(82,82,91,0.06)',
}

const STATUS_DOT: Record<NodeStatus, string> = {
  healthy: '#00d4aa',
  degraded: '#f59e0b',
  down: '#ef4444',
  idle: '#52525b',
}

/* ── Edge path helper ──────────────────────────────────────────────────────── */

function edgePath(from: TopoNode, to: TopoNode): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const cx1 = from.x + dx * 0.4
  const cy1 = from.y + dy * 0.1
  const cx2 = from.x + dx * 0.6
  const cy2 = to.y - dy * 0.1
  return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`
}

/* ── Travelling dot ────────────────────────────────────────────────────────── */

function TravellingDot({ path, color, delay }: { path: string; color: string; delay: number }) {
  return (
    <circle r="3" fill={color} opacity="0.9">
      <animateMotion dur="2.4s" repeatCount="indefinite" begin={`${delay}s`} path={path} />
      <animate attributeName="opacity" values="0;0.9;0.9;0" dur="2.4s" repeatCount="indefinite" begin={`${delay}s`} />
    </circle>
  )
}

/* ── Node component ────────────────────────────────────────────────────────── */

const NODE_RADIUS = 22
const ICON_SIZE = 15

function TopoNodeG({ node }: { node: TopoNode }) {
  const status = node.status
  const Icon = node.iconType ? ICON_MAP[node.iconType] : null

  return (
    <g>
      {status === 'healthy' && (
        <circle
          cx={node.x} cy={node.y} r={NODE_RADIUS}
          fill="none" stroke={STATUS_STROKE[status]}
          strokeWidth="1" className="topology-node-pulse" opacity="0.3"
        />
      )}

      <circle
        cx={node.x} cy={node.y} r={NODE_RADIUS}
        fill={STATUS_FILL[status]} stroke={STATUS_STROKE[status]} strokeWidth="1.5"
      />

      {/* Lucide icon via foreignObject */}
      {Icon && (
        <foreignObject
          x={node.x - ICON_SIZE / 2}
          y={node.y - ICON_SIZE / 2}
          width={ICON_SIZE}
          height={ICON_SIZE}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: '100%', color: STATUS_STROKE[status],
            }}
          >
            <Icon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={1.5} />
          </div>
        </foreignObject>
      )}

      {/* Status dot */}
      <circle
        cx={node.x + NODE_RADIUS * 0.7} cy={node.y - NODE_RADIUS * 0.7}
        r="4" fill={STATUS_DOT[status]} stroke="#0e0f11" strokeWidth="1.5"
      />

      {/* Label */}
      <text
        x={node.x} y={node.y + NODE_RADIUS + 14}
        textAnchor="middle" fontSize="10" fill="#a1a1aa"
        fontFamily="DM Sans, system-ui, sans-serif" fontWeight="500"
      >
        {node.label}
      </text>
    </g>
  )
}

/* ── Main component ────────────────────────────────────────────────────────── */

export const PulsingTopology = memo(function PulsingTopology({
  nodes,
  edges,
  className,
  width = 500,
  height = 300,
  initialZoom = 0.85,
}: PulsingTopologyProps) {
  const uid = useId()
  const [zoom, setZoom] = useState(initialZoom)

  const MIN_ZOOM = 0.3
  const MAX_ZOOM = 3

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)))
  }, [])

  // Zoom via viewBox: smaller viewBox = zoomed in; larger = zoomed out
  const vbW = width / zoom
  const vbH = height / zoom
  const vbX = (width - vbW) / 2
  const vbY = (height - vbH) / 2

  const nodeMap = useMemo(() => {
    const m = new Map<string, TopoNode>()
    nodes.forEach(n => m.set(n.id, n))
    return m
  }, [nodes])

  const resolvedEdges = useMemo(() => {
    return edges
      .map(e => {
        const from = nodeMap.get(e.from)
        const to = nodeMap.get(e.to)
        if (!from || !to) return null
        const path = edgePath(from, to)
        const edgeStatus: NodeStatus =
          from.status === 'down' || to.status === 'down' ? 'down'
          : from.status === 'degraded' || to.status === 'degraded' ? 'degraded'
          : 'healthy'
        return { ...e, from, to, path, edgeStatus }
      })
      .filter(Boolean) as Array<{
        from: TopoNode; to: TopoNode; path: string; animated?: boolean; edgeStatus: NodeStatus
      }>
  }, [edges, nodeMap])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn('relative w-full', className)}
    >
      <div className="relative" onWheel={handleWheel}>
        <svg
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          className="w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
          style={{ cursor: 'crosshair' }}
        >
          <defs>
            <radialGradient id={`${uid}-bg`} cx="30%" cy="20%" r="70%">
              <stop offset="0%" stopColor="rgba(0,212,170,0.04)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          <rect width={width} height={height} fill={`url(#${uid}-bg)`} />

          {resolvedEdges.map((edge, i) => (
            <g key={`edge-${i}`}>
              <path
                d={edge.path}
                className={cn('topology-line', edge.animated !== false && 'topology-line-active')}
                stroke={STATUS_STROKE[edge.edgeStatus]}
                opacity="0.4"
              />
              <path
                d={edge.path} fill="none"
                stroke={STATUS_STROKE[edge.edgeStatus]}
                strokeWidth="4" opacity="0.06" strokeLinecap="round"
              />
              {edge.animated !== false && edge.edgeStatus !== 'down' && (
                <TravellingDot path={edge.path} color={STATUS_STROKE[edge.edgeStatus]} delay={i * 0.6} />
              )}
            </g>
          ))}

          {nodes.map(node => (
            <TopoNodeG key={node.id} node={node} />
          ))}
        </svg>

        {/* Zoom controls */}
        <div className="absolute bottom-2 right-2 flex items-center gap-0.5">
          <button
            onClick={() => setZoom(z => Math.max(MIN_ZOOM, +(z - 0.2).toFixed(2)))}
            className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800/80 text-zinc-500 hover:text-zinc-200 transition-colors"
            title="Zoom out"
          >
            <Minus className="h-2.5 w-2.5" />
          </button>
          <span className="w-8 text-center text-[10px] font-mono text-zinc-600 tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(MAX_ZOOM, +(z + 0.2).toFixed(2)))}
            className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800/80 text-zinc-500 hover:text-zinc-200 transition-colors"
            title="Zoom in"
          >
            <Plus className="h-2.5 w-2.5" />
          </button>
          {zoom !== initialZoom && (
            <button
              onClick={() => setZoom(initialZoom)}
              className="ml-0.5 flex h-5 w-5 items-center justify-center rounded bg-zinc-800/80 text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Reset zoom"
            >
              <RotateCcw className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
})

/* ── Default topology preset (static fallback) ─────────────────────────────── */

export function defaultSystemTopology(
  agentNodes?: Array<{ id: string; label: string; status: NodeStatus }>,
): { nodes: TopoNode[]; edges: TopoEdge[] } {
  const baseNodes: TopoNode[] = [
    { id: 'gateway', label: 'Gateway', iconType: 'wifi', status: 'healthy', x: 80, y: 150 },
    { id: 'automation', label: 'Automation', iconType: 'cog', status: 'healthy', x: 240, y: 150 },
  ]

  const agents = agentNodes ?? [
    { id: 'agent-1', label: 'Agent 1', status: 'healthy' as NodeStatus },
    { id: 'agent-2', label: 'Agent 2', status: 'healthy' as NodeStatus },
    { id: 'agent-3', label: 'Agent 3', status: 'idle' as NodeStatus },
  ]

  const agentTopoNodes: TopoNode[] = agents.map((a, i) => ({
    ...a,
    iconType: 'bot',
    x: 400,
    y: 60 + i * 80,
  }))

  const reliabilityNode: TopoNode = {
    id: 'reliability', label: 'Reliability', iconType: 'shield',
    status: 'healthy', x: 240, y: 260,
  }

  const nodes = [...baseNodes, ...agentTopoNodes, reliabilityNode]
  const edges: TopoEdge[] = [
    { from: 'gateway', to: 'automation', animated: true },
    ...agents.map(a => ({ from: 'automation', to: a.id, animated: true })),
    { from: 'gateway', to: 'reliability', animated: true },
  ]

  return { nodes, edges }
}
