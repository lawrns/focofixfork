'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface AttentionCountBadgeProps {
  count: number
  className?: string
}

export function AttentionCountBadge({ count, className }: AttentionCountBadgeProps) {
  if (count === 0) return null

  return (
    <Badge
      variant="outline"
      className={cn(
        'h-6 gap-1 text-xs font-medium animate-in fade-in-0 zoom-in-95',
        count >= 3 ? 'text-rose-500 border-rose-500/30 bg-rose-500/5' :
        count >= 1 ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' :
        'text-muted-foreground',
        className
      )}
    >
      {count} need{count === 1 ? 's' : ''} attention
    </Badge>
  )
}
