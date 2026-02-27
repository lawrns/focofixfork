'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wifi, WifiOff, RefreshCw, CircleDot, Unplug, Globe,
  Terminal, Shield, AlertTriangle, Wrench, CheckCircle2, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface TabRecord {
  id: string
  title: string
  url: string
  attached: boolean
  profile?: string
  last_seen?: string
}

interface OpenClawStatus {
  relay: { reachable: boolean; url: string; port: number }
  token: { configured: boolean; valid: boolean }
  profiles: Array<{ name: string; active: boolean }>
  tabs: TabRecord[]
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

  // Blocking banner conditions
  const bannerMessages: string[] = []
  if (relay && relay.reachable) {
    if (tabs.length === 0) {
      bannerMessages.push('No tabs attached — open a browser tab and attach it via the OpenClaw extension.')
    }
    if (!token?.configured) {
      bannerMessages.push('Token not configured — run `foco init` to set your OpenClaw token.')
    } else if (!token?.valid) {
      bannerMessages.push('Token invalid — check FOCO_OPENCLAW_TOKEN in your config.')
    }
  }

  // Effective profile: first profile with active=true, or "none"
  const effectiveProfile = profiles.find(p => p.active)?.name ?? 'none'

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Critter</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            OpenClaw relay · attached tabs · browser profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TroubleshootDrawer status={status} />
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Blocking banners */}
      {bannerMessages.length > 0 && (
        <div className="rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500/40 px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Action required
          </div>
          {bannerMessages.map((msg, i) => (
            <p key={i} className="text-sm text-amber-700 dark:text-amber-400 pl-6">{msg}</p>
          ))}
        </div>
      )}

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
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className="text-sm text-muted-foreground w-16">Profile</span>
          <Badge variant={effectiveProfile === 'none' ? 'secondary' : 'outline'} className="text-[11px]">
            {effectiveProfile}
          </Badge>
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
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">URL</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Profile</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden lg:table-cell">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tabs.map(tab => (
                  <tr key={tab.id} className="bg-card hover:bg-accent/30 transition-colors">
                    <td className="px-3 py-2 max-w-[160px]">
                      <span className="block truncate font-medium" title={tab.title || '(untitled)'}>
                        {tab.title || '(untitled)'}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[200px] hidden sm:table-cell">
                      <span
                        className="block truncate text-[11px] text-muted-foreground font-mono"
                        title={tab.url}
                      >
                        {tab.url}
                      </span>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <span className="text-[11px] text-muted-foreground">{tab.profile ?? 'default'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        <StatusDot ok={tab.attached} />
                        <span className="text-[11px]">{tab.attached ? 'attached' : 'detached'}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      <span className="text-[11px] text-muted-foreground">
                        {tab.last_seen
                          ? new Date(tab.last_seen).toLocaleTimeString()
                          : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

// ─── Troubleshoot Drawer ───────────────────────────────────────────────────────

interface TroubleshootCheck {
  label: string
  ok: boolean
  hint: string
}

function TroubleshootDrawer({ status }: { status: OpenClawStatus | null }) {
  const checks: TroubleshootCheck[] = [
    {
      label: 'Relay reachable',
      ok: status?.relay?.reachable ?? false,
      hint: 'Start OpenClaw gateway: openclaw start',
    },
    {
      label: 'Token configured',
      ok: status?.token?.configured ?? false,
      hint: 'Run: foco init',
    },
    {
      label: 'Token valid',
      ok: status?.token?.valid ?? false,
      hint: 'Check FOCO_OPENCLAW_TOKEN in ~/.foco/config.json',
    },
    {
      label: 'At least 1 tab attached',
      ok: (status?.tabs?.length ?? 0) > 0,
      hint: 'Open browser and use OpenClaw extension to attach a tab',
    },
    {
      label: 'Active profile found',
      ok: (status?.profiles ?? []).some(p => p.active),
      hint: 'Set profile in OpenClaw settings',
    },
  ]

  const failCount = checks.filter(c => !c.ok).length

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
          <Wrench className="h-3.5 w-3.5" />
          Troubleshoot
          {failCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">
              {failCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            Troubleshoot OpenClaw
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {checks.map(check => (
            <div
              key={check.label}
              className={cn(
                'rounded-lg border px-4 py-3',
                check.ok
                  ? 'border-[color:var(--foco-teal)]/30 bg-[color:var(--foco-teal)]/5'
                  : 'border-red-400/40 bg-red-50 dark:bg-red-950/20'
              )}
            >
              <div className="flex items-center gap-2">
                {check.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-[color:var(--foco-teal)] flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                <span className={cn(
                  'text-sm font-medium',
                  check.ok ? 'text-foreground' : 'text-red-700 dark:text-red-400'
                )}>
                  {check.label}
                </span>
              </div>
              {!check.ok && (
                <p className="mt-1.5 pl-6 text-[11px] text-red-600 dark:text-red-400/80">
                  {check.hint}
                </p>
              )}
            </div>
          ))}
        </div>
        {failCount === 0 && (
          <p className="mt-6 text-sm text-center text-muted-foreground">
            All checks passed. OpenClaw is ready.
          </p>
        )}
      </SheetContent>
    </Sheet>
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
      ok ? 'bg-[color:var(--foco-teal)] shadow-[0_0_4px_var(--foco-teal)]' : 'bg-muted-foreground/40',
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
