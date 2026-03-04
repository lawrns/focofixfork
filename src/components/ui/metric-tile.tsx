import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type MetricTileProps = {
  label: string
  value: ReactNode
  subtitle?: ReactNode
  valueClassName?: string
  className?: string
  onClick?: () => void
}

export function MetricTile({
  label,
  value,
  subtitle,
  valueClassName,
  className,
  onClick,
}: MetricTileProps) {
  const baseClassName =
    'rounded-lg border bg-card p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--foco-teal)]'

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(baseClassName, 'cursor-pointer hover:bg-secondary/40', className)}
      >
        <div className="text-[10px] text-muted-foreground font-mono">{label}</div>
        <div className={cn('text-2xl font-bold', valueClassName)}>{value}</div>
        {subtitle ? <div className="text-[9px] text-muted-foreground">{subtitle}</div> : null}
      </button>
    )
  }

  return (
    <div className={cn(baseClassName, 'cursor-default', className)} aria-disabled="true">
      <div className="text-[10px] text-muted-foreground font-mono">{label}</div>
      <div className={cn('text-2xl font-bold', valueClassName)}>{value}</div>
      {subtitle ? <div className="text-[9px] text-muted-foreground">{subtitle}</div> : null}
    </div>
  )
}
