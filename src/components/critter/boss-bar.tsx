'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, Wifi, WifiOff, PauseCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { SwarmDockTarget } from './swarm-dock-target'

interface LedgerEvent {
  id: string
  type: string
  source: string
  timestamp: string
}

interface OpenClawStatus {
  relay: { reachable: boolean }
  tabs: Array<{ id: string; attached: boolean }>
}

interface BossBarProps {
  className?: string
  sidebarCollapsed?: boolean
}

export function BossBar({ className, sidebarCollapsed = false }: BossBarProps) {
  const [recentEvents, setRecentEvents] = useState<LedgerEvent[]>([])
  const [paused, setPaused] = useState(false)
  const [relayConnected, setRelayConnected] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [openclawStatus, setOpenclawStatus] = useState<OpenClawStatus | null>(null)
  const [apiAvailability, setApiAvailability] = useState({
    fleet: true,
    ledger: true,
    openclaw: true,
  })

  const pollFleetStatus = useCallback(async () => {
    if (!apiAvailability.fleet) return
    try {
      const res = await fetch('/api/policies/fleet-status')
      if (res.status === 404) {
        setApiAvailability(prev => ({ ...prev, fleet: false }))
        return
      }
      if (res.ok) {
        const json = await res.json()
        if (typeof json.paused === 'boolean') setPaused(json.paused)
      }
    } catch {
      // ignore
    }
  }, [apiAvailability.fleet])

  const pollEvents = useCallback(async () => {
    if (!apiAvailability.ledger) return
    try {
      const res = await fetch('/api/ledger?limit=5')
      if (res.status === 404) {
        setApiAvailability(prev => ({ ...prev, ledger: false }))
        setRelayConnected(false)
        return
      }
      if (res.ok) {
        const json = await res.json()
        setRecentEvents(json.data ?? [])
        setRelayConnected(true)
      } else {
        setRelayConnected(false)
      }
      setLastRefreshed(new Date())
    } catch {
      setRelayConnected(false)
    }
  }, [apiAvailability.ledger])

  const pollOpenClaw = useCallback(async () => {
    if (!apiAvailability.openclaw) return
    try {
      const res = await fetch('/api/openclaw/status')
      if (res.status === 404) {
        setApiAvailability(prev => ({ ...prev, openclaw: false }))
        return
      }
      if (res.ok) {
        const json = await res.json()
        setOpenclawStatus(json)
      }
    } catch {
      // ignore — OpenClaw is optional
    }
  }, [apiAvailability.openclaw])

  useEffect(() => {
    pollFleetStatus()
    pollEvents()
    pollOpenClaw()
    const fleetInterval = apiAvailability.fleet ? setInterval(pollFleetStatus, 30_000) : null
    const ledgerInterval = apiAvailability.ledger ? setInterval(pollEvents, 15_000) : null
    const openclawInterval = apiAvailability.openclaw ? setInterval(pollOpenClaw, 5_000) : null
    return () => {
      if (fleetInterval) clearInterval(fleetInterval)
      if (ledgerInterval) clearInterval(ledgerInterval)
      if (openclawInterval) clearInterval(openclawInterval)
    }
  }, [apiAvailability, pollFleetStatus, pollEvents, pollOpenClaw])

  async function toggleFleet() {
    const action = paused ? 'resume' : 'pause'
    try {
      const res = await fetch('/api/policies/pause-fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setPaused(!paused)
        if (action === 'pause') {
          toast.warning('Fleet paused — all agents stopped')
        } else {
          toast.success('Fleet resumed')
        }
      }
    } catch {
      toast.error('Failed to update fleet status')
    }
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 h-9',
        'md:pl-56 lg:pl-60',
        sidebarCollapsed && 'md:pl-[52px]',
        'flex items-center gap-3 px-4',
        'border-t border-[var(--foco-rail-border)]',
        'bg-background/95 backdrop-blur-sm',
        'text-[11px] font-mono-display',
        className
      )}
    >
      {/* Fleet status indicator */}
      <div className="flex items-center gap-1.5 flex-shrink-0" title={paused ? 'Fleet is paused — all agents halted' : 'All autonomous agents are active'}>
        <div className={cn(
          'h-1.5 w-1.5 rounded-full',
          paused ? 'bg-red-500' : 'bg-[color:var(--foco-teal)] animate-pulse'
        )} />
        <span className={cn('text-muted-foreground', paused && 'text-red-500')}>
          {paused ? 'PAUSED' : 'FLEET OK'}
        </span>
      </div>

      <div className="h-3 w-px bg-border flex-shrink-0" />

      {/* Critter relay */}
      <div className="flex items-center gap-1.5 flex-shrink-0" title="Chrome relay connection status">
        {relayConnected
          ? <Wifi className="h-3 w-3 text-[color:var(--foco-teal)]" />
          : <WifiOff className="h-3 w-3 text-muted-foreground" />}
        <span className="text-muted-foreground">
          {relayConnected ? 'relay' : 'offline'}
        </span>
      </div>

      <div className="h-3 w-px bg-border flex-shrink-0" />

      {/* OpenClaw gateway health + tab count */}
      <SwarmDockTarget>
        <div className="flex items-center gap-1.5 flex-shrink-0" title={`${openclawStatus?.tabs.filter(t => t.attached).length ?? 0} browser tabs attached to Critter`}>
          <span className={cn(
            'h-1.5 w-1.5 rounded-full flex-shrink-0',
            openclawStatus?.relay.reachable
              ? 'bg-[color:var(--foco-teal)]'
              : 'bg-muted-foreground/40'
          )} />
          <span className="text-muted-foreground">critter</span>
          {openclawStatus && openclawStatus.relay.reachable && (
            <span className="text-[color:var(--foco-teal)]">
              {openclawStatus.tabs.filter(t => t.attached).length} tabs
            </span>
          )}
        </div>
      </SwarmDockTarget>

      <div className="h-3 w-px bg-border flex-shrink-0" />

      {/* Recent ledger events rolling ticker */}
      <div className="flex-1 overflow-hidden flex items-center gap-2 min-w-0" title="Audit log events in last 24h">
        <Activity className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        {recentEvents.length === 0 ? (
          <span className="text-muted-foreground">no recent events</span>
        ) : (
          <span className="text-muted-foreground/70">
            {recentEvents.length} recent event{recentEvents.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Last refreshed */}
      {lastRefreshed && (
        <span className="text-muted-foreground/50 flex-shrink-0 hidden lg:block">
          {lastRefreshed.toLocaleTimeString()}
        </span>
      )}

      <div className="h-3 w-px bg-border flex-shrink-0" />

      {/* Pause Fleet kill switch — icon only */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-6 w-6 flex-shrink-0',
          paused
            ? 'text-red-500 hover:text-red-400'
            : 'text-muted-foreground hover:text-destructive'
        )}
        onClick={toggleFleet}
        title={paused ? 'Fleet paused — click to resume' : 'Pause Fleet — halt all autonomous agents'}
      >
        <PauseCircle className="h-3 w-3" />
      </Button>
    </div>
  )
}
