'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Activity, AlertCircle, Clock3, Gauge, ShieldCheck, Workflow } from 'lucide-react'

const SHARED_SPRING = { type: 'spring', stiffness: 300, damping: 30 }

type StatPillsBarProps = {
  runningCount: number
  pendingCount: number
  doneCount: number
  failedCount: number
  staleCount: number
  fleetPaused: boolean
  pendingFlash: boolean
}

export function StatPillsBar({
  runningCount,
  pendingCount,
  doneCount,
  failedCount,
  staleCount,
  fleetPaused,
  pendingFlash,
}: StatPillsBarProps) {
  const router = useRouter()

  const stats = [
    { label: 'Running', value: runningCount, icon: Activity, color: runningCount > 0 ? 'text-emerald-500' : undefined },
    { label: 'Pending', value: pendingCount, icon: Clock3, color: undefined },
    { label: 'Done', value: doneCount, icon: Workflow, color: undefined },
    { label: 'Blocked', value: fleetPaused ? 1 : 0, icon: ShieldCheck, color: (fleetPaused ? 1 : 0) > 0 ? 'text-amber-500' : undefined },
    { label: 'Failed', value: failedCount, icon: AlertCircle, color: failedCount > 0 ? 'text-rose-500' : undefined },
    { label: 'Stale', value: staleCount, icon: Gauge, color: undefined },
  ]

  return (
    <div className="rounded-xl border p-2">
      <div className="flex flex-wrap items-center gap-2">
        {stats.map((stat) => (
          <Tooltip key={stat.label}>
            <TooltipTrigger asChild>
              <motion.button
                whileHover={{ scaleX: 1.06 }}
                transition={SHARED_SPRING}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1 text-xs',
                  stat.label === 'Pending' && pendingFlash && 'border-amber-400 bg-amber-400/20'
                )}
                onClick={() => {
                  if (stat.label === 'Running') router.push('/runs?status=running')
                  if (stat.label === 'Pending') router.push('/runs?status=pending')
                  if (stat.label === 'Done') router.push('/runs?status=completed')
                  if (stat.label === 'Failed') router.push('/runs?status=failed')
                }}
              >
                <stat.icon className="h-3.5 w-3.5" />
                <span>{stat.label}</span>
                <span className={cn('font-mono', stat.color)}>{stat.value}</span>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{stat.label} agents or items</TooltipContent>
          </Tooltip>
        ))}

        <div className="ml-auto inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            className={cn('h-2 w-2 rounded-full', fleetPaused ? 'bg-rose-500' : 'bg-emerald-500')}
          />
          Fleet {fleetPaused ? 'paused' : 'running'}
        </div>
      </div>
    </div>
  )
}
