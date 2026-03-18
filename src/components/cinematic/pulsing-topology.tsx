'use client'

import { memo, useId, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ── Types ─────────────────────────────────────────────────────────────────── */

export type NodeStatus = 'healthy' | 'degraded' | 'down' | 'idle'

export interface TopoNode {
  id: string
  label: string
  icon?: string // lucide icon name or emoji fallback
  status: NodeStatus
  x: number // viewBox x coordinate
  y: number // viewBox y coordinate
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
  // Use a gentle cubic bezier for organic curves
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
      <animateMotion
        dur="2.4s"
        repeatCount="indefinite"
        begin={`${delay}s`}
        path={path}
      />
      <animate
        attributeName="opacity"
        values="0;0.9;0.9;0"
        dur="2.4s"
        repeatCount="indefinite"
        begin={`${delay}s`}
      />
    </circle>
  )
}

/* ── Node component ────────────────────────────────────────────────────────── */

const NODE_RADIUS = 22
const ICON_SIZE = 16

function TopoNodeG({ node, gradientId }: { node: TopoNode; gradientId: string }) {
  const status = node.status
  return (
    <g>
      {/* Ambient pulse ring */}
      {status === 'healthy' && (
        <circle
          cx={node.x}
          cy={node.y}
          r={NODE_RADIUS}
          fill="none"
          stroke={STATUS_STROKE[status]}
          strokeWidth="1"
          className="topology-node-pulse"
          opacity="0.3"
        />
      )}

      {/* Main circle */}
      <circle
        cx={node.x}
        cy={node.y}
        r={NODE_RADIUS}
        fill={STATUS_FILL[status]}
        stroke={STATUS_STROKE[status]}
        strokeWidth="1.5"
      />

      {/* Icon placeholder - emoji fallback */}
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={ICON_SIZE}
        fill="currentColor"
        className="select-none"
      >
        {node.icon ?? '⬡'}
      </text>

      {/* Status dot */}
      <circle
        cx={node.x + NODE_RADIUS * 0.7}
        cy={node.y - NODE_RADIUS * 0.7}
        r="4"
        fill={STATUS_DOT[status]}
        stroke="#0e0f11"
        strokeWidth="1.5"
      />

      {/* Label */}
      <text
        x={node.x}
        y={node.y + NODE_RADIUS + 14}
        textAnchor="middle"
        fontSize="10"
        fill="#a1a1aa"
        fontFamily="DM Sans, system-ui, sans-serif"
        fontWeight="500"
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
  width = 600,
  height = 280,
}: PulsingTopologyProps) {
  const uid = useId()

  const nodeMap = useMemo(() => {
    const m = new Map<string, TopoNode>()
    nodes.forEach((n) => m.set(n.id, n))
    return m
  }, [nodes])

  const resolvedEdges = useMemo(() => {
    return edges
      .map((e) => {
        const from = nodeMap.get(e.from)
        const to = nodeMap.get(e.to)
        if (!from || !to) return null
        const path = edgePath(from, to)
        const edgeStatus = from.status === 'down' || to.status === 'down' ? 'down'
          : from.status === 'degraded' || to.status === 'degraded' ? 'degraded'
          : 'healthy'
        return { ...e, from: from, to: to, path, edgeStatus }
      })
      .filter(Boolean) as Array<{
        from: TopoNode
        to: TopoNode
        path: string
        animated?: boolean
        edgeStatus: NodeStatus
      }>
  }, [edges, nodeMap])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn('w-full', className)}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`${uid}-bg`} cx="30%" cy="20%" r="70%">
            <stop offset="0%" stopColor="rgba(0,212,170,0.04)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Subtle background glow */}
        <rect width={width} height={height} fill={`url(#${uid}-bg)`} />

        {/* Edges */}
        {resolvedEdges.map((edge, i) => (
          <g key={`edge-${i}`}>
            {/* Base line */}
            <path
              d={edge.path}
              className={cn(
                'topology-line',
                (edge.animated !== false) && 'topology-line-active',
              )}
              stroke={STATUS_STROKE[edge.edgeStatus]}
              opacity="0.4"
            />
            {/* Glow line behind */}
            <path
              d={edge.path}
              fill="none"
              stroke={STATUS_STROKE[edge.edgeStatus]}
              strokeWidth="4"
              opacity="0.06"
              strokeLinecap="round"
            />
            {/* Travelling dot */}
            {edge.animated !== false && edge.edgeStatus !== 'down' && (
              <TravellingDot
                path={edge.path}
                color={STATUS_STROKE[edge.edgeStatus]}
                delay={i * 0.6}
              />
            )}
          </g>
        ))}

        {/* Nodes */}
        {nodes.map((node) => (
          <TopoNodeG key={node.id} node={node} gradientId={uid} />
        ))}
      </svg>
    </motion.div>
  )
})

/* ── Default topology preset ───────────────────────────────────────────────── */

export function defaultSystemTopology(
  agentNodes?: Array<{ id: string; label: string; status: NodeStatus }>,
): { nodes: TopoNode[]; edges: TopoEdge[] } {
  const baseNodes: TopoNode[] = [
    { id: 'gateway', label: 'Gateway', icon: '⚡', status: 'healthy', x: 60, y: 140 },
    { id: 'automation', label: 'Automation', icon: '⚙️', status: 'healthy', x: 220, y: 140 },
  ]

  const agents = agentNodes ?? [
    { id: 'agent-1', label: 'Agent 1', status: 'healthy' as NodeStatus },
    { id: 'agent-2', label: 'Agent 2', status: 'healthy' as NodeStatus },
    { id: 'agent-3', label: 'Agent 3', status: 'idle' as NodeStatus },
  ]

  const agentTopoNodes: TopoNode[] = agents.map((a, i) => ({
    ...a,
    icon: '🤖',
    x: 400,
    y: 60 + i * 70,
  }))

  // Add reliability node at bottom
  const reliabilityNode: TopoNode = {
    id: 'reliability',
    label: 'Reliability',
    icon: '🛡️',
    status: 'healthy',
    x: 220,
    y: 250,
  }

  const nodes = [...baseNodes, ...agentTopoNodes, reliabilityNode]

  const edges: TopoEdge[] = [
    { from: 'gateway', to: 'automation', animated: true },
    ...agents.map((a) => ({ from: 'automation', to: a.id, animated: true })),
    { from: 'gateway', to: 'reliability', animated: true },
  ]

  return { nodes, edges }
}
