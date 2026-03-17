'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Cpu, HardDrive, Radio, Timer, Zap } from 'lucide-react'
import { MODEL_CATALOG } from '@/lib/ai/model-catalog'

interface SystemHealth {
  gateway: { healthy: boolean; version: string | null; model: string | null }
  crons: { total: number; enabled: number; failing: number; healthy: boolean }
  stream: { connected: boolean }
  system: { cpuPercent: number; memUsedGb: number; memTotalGb: number; memPercent: number }
  signalStrength: number
}

interface SystemRibbonProps {
  onModelChange?: (model: string) => void
}

// Models available in the switcher: non-pipelineOnly catalog entries + OpenClaw native Kimi
const KIMI_K25 = { value: 'kimi-coding/k2p5', label: 'Kimi K2.5', provider: 'clawdbot' as const }
const SWITCHER_MODELS = [
  KIMI_K25,
  ...MODEL_CATALOG.filter((m) => !m.pipelineOnly).map((m) => ({ value: m.value, label: m.label, provider: m.provider })),
]

const POLL_INTERVAL_ACTIVE = 15_000  // 15s when gateway has activity
const POLL_INTERVAL_IDLE = 30_000    // 30s when idle

function providerDot(provider: string) {
  const colors: Record<string, string> = {
    anthropic: 'bg-violet-400',
    openai: 'bg-emerald-400',
    clawdbot: 'bg-cyan-400',
    glm: 'bg-sky-400',
    deepseek: 'bg-orange-400',
    ollama: 'bg-zinc-400',
  }
  return colors[provider] ?? 'bg-zinc-500'
}

function Dot({ on, warn, label }: { on: boolean; warn?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          on && !warn && 'bg-emerald-400',
          on && warn && 'bg-amber-400',
          !on && 'bg-rose-500',
        )}
      />
      <span className="text-[11px] text-zinc-400 font-mono whitespace-nowrap">{label}</span>
    </div>
  )
}

function Divider() {
  return <span className="text-zinc-800 select-none">│</span>
}

export function SystemRibbon({ onModelChange }: SystemRibbonProps) {
  const [mounted, setMounted] = useState(false)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [preferredModel, setPreferredModel] = useState('')

  // Hydration-safe mount: read localStorage only after mount
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('cockpit_preferred_model') ?? ''
    if (stored) {
      setPreferredModel(stored)
      onModelChange?.(stored)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/cockpit/system-health', { cache: 'no-store' })
      if (res.ok) setHealth(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchHealth()
    // Adaptive polling: faster when there's activity
    const id = setInterval(fetchHealth, POLL_INTERVAL_IDLE)
    return () => clearInterval(id)
  }, [fetchHealth])

  // Bootstrap model from gateway when no localStorage preference exists
  useEffect(() => {
    if (!mounted) return
    const gwModel = health?.gateway.model
    if (gwModel && !preferredModel) {
      setPreferredModel(gwModel)
      localStorage.setItem('cockpit_preferred_model', gwModel)
      onModelChange?.(gwModel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [health?.gateway.model, mounted])

  function handleModelChange(model: string) {
    setPreferredModel(model)
    localStorage.setItem('cockpit_preferred_model', model)
    onModelChange?.(model)
    fetch('/api/openclaw/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    }).catch(() => {})
  }

  const gw = health?.gateway
  const sys = health?.system
  const crons = health?.crons
  const activeEntry = SWITCHER_MODELS.find((m) => m.value === preferredModel)

  // Render a stable skeleton on server / before mount to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="h-8 bg-[#0d0d0f] border-b border-zinc-800/70 flex items-center px-4 gap-3 flex-shrink-0 overflow-x-hidden">
        <div className="flex items-center gap-1.5 mr-1">
          <Radio className="w-3 h-3 text-teal-400" />
          <span className="text-[11px] font-semibold text-teal-400 tracking-wide font-mono">OPS</span>
        </div>
        <Divider />
        <span className="text-[11px] text-zinc-600 font-mono">loading...</span>
      </div>
    )
  }

  return (
    <div className="h-8 bg-[#0d0d0f] border-b border-zinc-800/70 flex items-center px-4 gap-3 flex-shrink-0 overflow-x-hidden">
      {/* Brand */}
      <div className="flex items-center gap-1.5 mr-1">
        <Radio className="w-3 h-3 text-teal-400" />
        <span className="text-[11px] font-semibold text-teal-400 tracking-wide font-mono">OPS</span>
      </div>

      <Divider />

      {/* Gateway */}
      <div className="flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-zinc-600" />
        <Dot
          on={gw?.healthy ?? false}
          label={gw?.healthy ? `Gateway ${gw?.version ?? ''}`.trim() : 'Gateway offline'}
        />
      </div>

      <Divider />

      {/* Crons */}
      <div className="flex items-center gap-1.5">
        <Timer className="w-3 h-3 text-zinc-600" />
        <Dot
          on={!!crons && crons.failing === 0}
          warn={!!crons && crons.failing > 0 && crons.failing < crons.enabled}
          label={
            crons
              ? crons.failing === 0
                ? `Crons ${crons.enabled}/${crons.total}`
                : `Crons ${crons.failing} failing`
              : 'Crons —'
          }
        />
      </div>

      <Divider />

      {/* Stream */}
      <Dot
        on={health?.stream.connected ?? false}
        label={health?.stream.connected ? 'Stream live' : 'Stream off'}
      />

      <Divider />

      {/* System metrics */}
      {sys && (
        <>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-zinc-600" />
            <span
              className={cn(
                'text-[11px] font-mono',
                sys.cpuPercent > 80 ? 'text-rose-400' : sys.cpuPercent > 60 ? 'text-amber-400' : 'text-zinc-400',
              )}
            >
              CPU {sys.cpuPercent}%
            </span>
          </div>
          <Divider />
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3 h-3 text-zinc-600" />
            <span
              className={cn(
                'text-[11px] font-mono',
                sys.memPercent > 85 ? 'text-rose-400' : sys.memPercent > 70 ? 'text-amber-400' : 'text-zinc-400',
              )}
            >
              RAM {sys.memUsedGb}/{sys.memTotalGb}GB
            </span>
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Model switcher */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {activeEntry && (
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', providerDot(activeEntry.provider))} />
        )}
        <select
          value={preferredModel}
          onChange={(e) => handleModelChange(e.target.value)}
          className={cn(
            'bg-transparent border border-zinc-700/50 rounded px-1.5 py-0.5',
            'text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-teal-500/60',
            'appearance-none cursor-pointer max-w-[160px]',
          )}
          title="Active model"
        >
          {!preferredModel && <option value="">— model —</option>}
          {SWITCHER_MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
