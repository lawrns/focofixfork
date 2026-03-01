'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ServiceStatus {
  name: string
  status: 'up' | 'down' | 'degraded'
  latencyMs?: number
  detail?: string
  url: string
}

interface EmpireHealthGridProps {
  services: ServiceStatus[]
  loading?: boolean
}

export function EmpireHealthGrid({ services, loading }: EmpireHealthGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 flex flex-col gap-2 animate-pulse">
            <div className="h-3 bg-muted rounded w-2/3" />
            <div className="h-5 bg-muted rounded w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {services.map(svc => (
        <ServiceTile key={svc.name} service={svc} />
      ))}
    </div>
  )
}

function ServiceTile({ service }: { service: ServiceStatus }) {
  const { name, status, latencyMs, detail } = service

  const Icon = status === 'up' ? CheckCircle2 : status === 'degraded' ? AlertCircle : XCircle

  const colorClass = {
    up:       'text-emerald-500',
    degraded: 'text-amber-500',
    down:     'text-rose-500',
  }[status]

  const bgClass = {
    up:       'border-emerald-500/20 bg-emerald-500/5',
    degraded: 'border-amber-500/20 bg-amber-500/5',
    down:     'border-rose-500/20 bg-rose-500/5',
  }[status]

  return (
    <div className={cn('rounded-lg border p-4 flex flex-col gap-1', bgClass)}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', colorClass)} />
        <span className="text-[11px] font-mono-display text-muted-foreground uppercase tracking-wide truncate">
          {name}
        </span>
      </div>
      <span className={cn('text-[13px] font-semibold capitalize', colorClass)}>
        {status}
      </span>
      {latencyMs !== undefined && status === 'up' && (
        <span className="text-[11px] text-muted-foreground">{latencyMs}ms</span>
      )}
      {detail && status !== 'up' && (
        <span className="text-[11px] text-muted-foreground truncate" title={detail}>
          {detail}
        </span>
      )}
    </div>
  )
}
