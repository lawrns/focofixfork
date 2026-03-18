'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MissionControlMachineSnapshot } from '@/features/mission-control/types'
import type { OpenClawRuntimeSnapshot } from '@/lib/openclaw/types'
import { Activity, Cpu, HardDrive, Radio, Server, TriangleAlert, Wifi } from 'lucide-react'

function strengthLabel(strength: number): string {
  if (strength >= 5) return 'strong'
  if (strength >= 3) return 'degraded'
  if (strength >= 1) return 'fragile'
  return 'offline'
}

export function MachinePanel({
  machine,
  runtime,
  streamState,
  loading,
}: {
  machine: MissionControlMachineSnapshot
  runtime: OpenClawRuntimeSnapshot | null
  streamState: 'idle' | 'loading' | 'live' | 'degraded'
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
          <div className="h-5 w-16 animate-pulse rounded bg-zinc-800/60" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-800/40" />
          ))}
        </div>
        <div className="mt-3 h-16 animate-pulse rounded-xl bg-zinc-800/40" />
        <div className="mt-3 h-20 animate-pulse rounded-xl bg-zinc-800/40" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Machine Layer</h2>
          <p className="mt-1 text-[11px] text-zinc-600">Runtime, gateway, crons, and workstation health in one pane.</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'border-zinc-700 text-[10px] uppercase',
            streamState === 'live' ? 'text-emerald-300' : 'text-amber-300'
          )}
        >
          {streamState}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1"><Wifi className="h-3 w-3" /> gateway</span>
            <motion.span
              className={cn('h-2 w-2 rounded-full', machine.gatewayHealthy ? 'bg-emerald-400' : 'bg-rose-500')}
              animate={machine.gatewayHealthy ? { scale: [1, 1.3, 1], opacity: [0.85, 1, 0.85] } : {}}
              transition={machine.gatewayHealthy ? { repeat: Infinity, duration: 1.8 } : {}}
            />
          </div>
          <div className="mt-2 text-lg font-semibold text-zinc-100">{strengthLabel(machine.signalStrength)}</div>
          <div className="mt-1 text-[11px] text-zinc-600">{machine.attachedTabs} attached tabs • {machine.cronSummary.enabled} active crons</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="text-[11px] text-zinc-500">model</div>
          <div className="mt-2 text-sm font-semibold text-zinc-100">{machine.primaryModel ?? runtime?.modelAlias ?? 'inherited'}</div>
          <div className="mt-1 text-[11px] text-zinc-600">{runtime?.relayReachable ? 'relay reachable' : 'relay unavailable'}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="flex items-center gap-1 text-[11px] text-zinc-500"><Cpu className="h-3 w-3" /> cpu</div>
          <div className="mt-2 text-lg font-semibold text-zinc-100">{machine.cpuPercent}%</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="flex items-center gap-1 text-[11px] text-zinc-500"><HardDrive className="h-3 w-3" /> memory</div>
          <div className="mt-2 text-lg font-semibold text-zinc-100">{machine.memPercent}%</div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          <Server className="h-3.5 w-3.5" />
          Runtime Path
        </div>
        <p className="mt-2 break-all font-mono text-[11px] text-zinc-300">
          {machine.workspacePath ?? runtime?.workspacePath ?? 'No workspace path configured'}
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">ACP / Codex</div>
          <Badge
            variant="outline"
            className={cn(
              'border-zinc-700 text-[10px]',
              runtime?.codexConfigured ? 'text-emerald-300' : 'text-rose-300'
            )}
          >
            {runtime?.codexConfigured ? 'codex ready' : 'codex missing'}
          </Badge>
        </div>
        <p className="mt-2 text-[11px] text-zinc-300">
          ACP {runtime?.acpEnabled ? 'enabled' : 'disabled'}{runtime?.acpBackend ? ` • backend ${runtime.acpBackend}` : ''}
        </p>
        <p className="mt-1 text-[11px] text-zinc-600">
          {runtime?.configuredAgents?.length
            ? `${runtime.configuredAgents.length} configured gateway agents`
            : 'No explicit agents.list entries in openclaw.json'}
        </p>
      </div>

      <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
        {(machine.alerts ?? []).length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 text-xs text-zinc-600">
            Machine layer is currently calm.
          </div>
        ) : null}

        {(machine.alerts ?? []).map((alert) => (
          <div
            key={`${alert.source}-${alert.at}`}
            className={cn(
              'rounded-xl border p-3 text-[11px]',
              alert.level === 'critical' && 'border-rose-500/30 bg-rose-500/8 text-rose-200',
              alert.level === 'warning' && 'border-amber-500/30 bg-amber-500/8 text-amber-200',
              alert.level === 'info' && 'border-zinc-800 bg-zinc-950/70 text-zinc-300'
            )}
          >
            <div className="flex items-start gap-2">
              {alert.level === 'critical' ? (
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              ) : alert.level === 'warning' ? (
                <Activity className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <Radio className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              )}
              <div>
                <div className="font-semibold">{alert.source}</div>
                <div className="mt-1 text-[11px] opacity-90">{alert.message}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
