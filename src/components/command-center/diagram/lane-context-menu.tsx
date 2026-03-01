'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Eye, Square, Pause, Play, ClipboardList, Activity } from 'lucide-react'
import type { UnifiedAgent } from '@/lib/command-center/types'

interface LaneContextMenuProps {
  agent: UnifiedAgent | null
  open: boolean
  position: { x: number; y: number }
  onClose: () => void
  onInspect: (agent: UnifiedAgent) => void
  onStop: (agent: UnifiedAgent) => void
  onPauseResume: (agent: UnifiedAgent) => void
  onViewRuns: (agent: UnifiedAgent) => void
}

const STOP_SUPPORTED: string[] = ['crico', 'bosun', 'clawdbot']
const PAUSE_SUPPORTED: string[] = ['bosun']

export function LaneContextMenu({
  agent,
  open,
  position,
  onClose,
  onInspect,
  onStop,
  onPauseResume,
  onViewRuns,
}: LaneContextMenuProps) {
  if (!agent) return null

  const canStop  = STOP_SUPPORTED.includes(agent.backend)
  const canPause = PAUSE_SUPPORTED.includes(agent.backend)
  const isPaused = agent.status === 'paused'

  return (
    <DropdownMenu open={open} onOpenChange={v => !v && onClose()}>
      <DropdownMenuContent
        style={{ position: 'fixed', left: position.x, top: position.y }}
        className="z-50 w-44"
      >
        <DropdownMenuItem onClick={() => { onInspect(agent); onClose() }}>
          <Eye className="h-3.5 w-3.5 mr-2" />
          Inspect
        </DropdownMenuItem>

        {canStop && (
          <DropdownMenuItem
            onClick={() => { onStop(agent); onClose() }}
            className="text-rose-600 dark:text-rose-400"
          >
            <Square className="h-3.5 w-3.5 mr-2" />
            Stop
          </DropdownMenuItem>
        )}

        {canPause && (
          <DropdownMenuItem onClick={() => { onPauseResume(agent); onClose() }}>
            {isPaused
              ? <><Play className="h-3.5 w-3.5 mr-2" />Resume</>
              : <><Pause className="h-3.5 w-3.5 mr-2" />Pause</>
            }
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => { onViewRuns(agent); onClose() }}>
          <Activity className="h-3.5 w-3.5 mr-2" />
          View Runs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
