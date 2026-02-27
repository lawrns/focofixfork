'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wifi, WifiOff, RefreshCw, CircleDot, Unplug, Globe, Terminal, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface OpenClawStatus {
  relay: { reachable: boolean; url: string; port: number }
  token: { configured: boolean; valid: boolean }
  profiles: Array<{ name: string; active: boolean }>
  tabs: Array<{ id: string; title: string; url: string; attached: boolean }>
}

const POLL_INTERVAL = 5_000

export default function OpenClawPage() {
  const [status, setStatus] = useState<OpenClawStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/status')
      if (res.ok) {
        const json = await res.json()
        setStatus(json)
        setLastUpdated(new Date())
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [refresh])

  const relay = status?.relay
  const token = status?.token
  const profiles = status?.profiles ?? []
  const tabs = status?.tabs ?? []

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Critter</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            OpenClaw relay · attached tabs · browser profiles
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Gateway section */}
      <Section icon={<Wifi className="h-4 w-4" />} title="Gateway">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusDot ok={relay?.reachable ?? false} />
          <span className="font-mono text-sm">{relay?.url ?? '—'}</span>
          <Badge variant={relay?.reachable ? 'default' : 'destructive'} className="text-[11px]">
            {relay?.reachable ? 'reachable' : 'offline'}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className="text-sm text-muted-foreground w-16">Token</span>
          {token?.configured ? (
            <Badge variant={token.valid ? 'default' : 'destructive'} className="text-[11px]">
              {token.valid ? 'valid' : 'invalid'}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[11px]">not configured</Badge>
          )}
        </div>
        {lastUpdated && (
          <p className="text-[11px] text-muted-foreground/60 mt-2">
            Last polled {lastUpdated.toLocaleTimeString()} · auto-refresh every 5 s
          </p>
        )}
      </Section>

      {/* Attached Tabs */}
      <Section icon={<Globe className="h-4 w-4" />} title={`Attached Tabs (${tabs.length})`}>
        {tabs.length === 0 ? (
          <EmptyState text="No tabs attached — start OpenClaw and attach a browser tab." />
        ) : (
          <ul className="divide-y divide-border rounded-md border overflow-hidden">
            {tabs.map(tab => (
              <li key={tab.id} className="flex items-start gap-3 px-3 py-2.5 bg-card hover:bg-accent/30 transition-colors">
                <StatusDot ok={tab.attached} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tab.title || '(untitled)'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{tab.url}</p>
                </div>
                <Badge variant="outline" className="text-[10px] flex-shrink-0 mt-0.5">
                  {tab.attached ? 'attached' : 'detached'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Profiles */}
      <Section icon={<Shield className="h-4 w-4" />} title="Profiles">
        {profiles.length === 0 ? (
          <EmptyState text="No profiles reported by gateway." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {profiles.map(p => (
              <Badge
                key={p.name}
                variant={p.active ? 'default' : 'secondary'}
                className="text-[11px] gap-1"
              >
                {p.active && <CircleDot className="h-2.5 w-2.5" />}
                {p.name}
              </Badge>
            ))}
          </div>
        )}
      </Section>

      {/* Connection config hint */}
      <Section icon={<Terminal className="h-4 w-4" />} title="Configuration">
        <div className="rounded-md bg-muted/50 px-3 py-3 font-mono text-[12px] space-y-1 text-muted-foreground">
          <p className="text-foreground/80 font-medium mb-2 font-sans text-[11px]">
            Environment variables / foco init
          </p>
          <p>FOCO_OPENCLAW_RELAY=http://127.0.0.1:18792</p>
          <p>FOCO_OPENCLAW_TOKEN=&lt;your-token&gt;</p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Run <code className="bg-muted px-1 rounded">foco init</code> to configure interactively, or set env vars directly.
        </p>
      </Section>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ icon, title, children }: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  )
}

function StatusDot({ ok, className }: { ok: boolean; className?: string }) {
  return (
    <span className={cn(
      'inline-block h-2 w-2 rounded-full flex-shrink-0',
      ok ? 'bg-[color:var(--foco-teal)] shadow-[0_0_4px_var(--foco-teal)]' : 'bg-red-500',
      className
    )} />
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
      <Unplug className="h-4 w-4 flex-shrink-0" />
      <span>{text}</span>
    </div>
  )
}
