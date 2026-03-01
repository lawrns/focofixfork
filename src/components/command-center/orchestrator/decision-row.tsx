'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, X } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { CommandDecision } from '@/lib/command-center/types'
import { cn } from '@/lib/utils'

const SEVERITY_TIPS: Record<string, string> = {
  P0: 'P0: Destructive action',
  P1: 'P1: Structural change',
  P2: 'P2: Write operation',
  P3: 'P3: Read-only',
}

const SEVERITY_COLORS: Record<string, string> = {
  P0: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
  P1: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
  P2: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  P3: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
}

interface DecisionRowProps {
  decision: CommandDecision
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onDefer: (id: string) => Promise<void>
}

export function DecisionRow({ decision, onApprove, onReject, onDefer }: DecisionRowProps) {
  const timeAgo = new Date(decision.createdAt)
  const now = new Date()
  const diffMs = now.getTime() - timeAgo.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const timeStr = diffMins < 1 ? 'now' : diffMins === 1 ? '1m ago' : `${diffMins}m ago`

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 rounded-md border bg-card p-3 text-[11px] sm:text-sm"
    >
      {/* Severity pill */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Badge
              variant="outline"
              className={cn('mt-0.5 whitespace-nowrap text-xs font-bold', SEVERITY_COLORS[decision.severity])}
            >
              {decision.severity}
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{SEVERITY_TIPS[decision.severity] ?? decision.severity}</TooltipContent>
      </Tooltip>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-foreground truncate">{decision.title}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                  {decision.system}
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Source system for this action</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{timeStr}</span>
          <span>•</span>
          <span>{decision.actionHint}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="xs"
              variant="default"
              className="bg-teal-600 hover:bg-teal-700 text-white h-7 px-2 text-[10px]"
              onClick={() => onApprove(decision.id)}
            >
              Approve
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Approve and execute this action</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="xs"
              variant="outline"
              className="h-7 px-2 text-[10px]"
              onClick={() => onReject(decision.id)}
            >
              Reject
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Reject and block this action</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="xs"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onDefer(decision.id)}
            >
              <Clock className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Defer — revisit later</TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  )
}
