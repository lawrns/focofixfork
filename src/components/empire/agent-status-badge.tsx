'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type EmpireAgentStatus = 'IDLE' | 'WORKING' | 'ERROR' | 'UNREACHABLE' | 'PAUSED'

const STATUS_STYLE: Record<EmpireAgentStatus, string> = {
  IDLE: 'bg-teal-500/15 text-teal-600 border-teal-400/40',
  WORKING: 'bg-blue-500/15 text-blue-600 border-blue-400/40',
  ERROR: 'bg-rose-500/15 text-rose-600 border-rose-400/40',
  UNREACHABLE: 'bg-zinc-500/15 text-zinc-600 border-zinc-400/40',
  PAUSED: 'bg-amber-500/15 text-amber-600 border-amber-400/40',
}

interface AgentStatusBadgeProps {
  status: EmpireAgentStatus
  backend?: string
  lastActivity?: string | null
  className?: string
}

export function AgentStatusBadge({ status, backend, lastActivity, className }: AgentStatusBadgeProps) {
  const detail = [
    backend ? `Backend: ${backend}` : null,
    lastActivity ? `Last activity: ${new Date(lastActivity).toLocaleString()}` : 'No recent activity',
  ].filter(Boolean).join(' • ')
  const pulse = status === 'WORKING' ? { scale: [1, 1.04, 1] } : undefined

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            animate={pulse}
            transition={pulse ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
          >
            <Badge variant="outline" className={cn('text-[10px] border font-mono-display', STATUS_STYLE[status], className)}>
              {status}
            </Badge>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          <p>{detail}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
