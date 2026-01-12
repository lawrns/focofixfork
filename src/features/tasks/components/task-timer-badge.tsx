'use client'

import { useTaskTimer } from '../hooks/use-task-timer'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TaskTimerBadgeProps {
  taskId: string
  showLabel?: boolean
  className?: string
}

export function TaskTimerBadge({
  taskId,
  showLabel = true,
  className = ''
}: TaskTimerBadgeProps) {
  const timer = useTaskTimer(taskId)

  if (timer.totalSeconds === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={`font-mono gap-1 cursor-help ${className}`}
          >
            <Clock className="h-3 w-3" />
            {timer.formatTime(timer.totalSeconds)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-sm">
            <div>
              <strong>Total Time Logged:</strong> {timer.formatTime(timer.totalSeconds)}
            </div>
            <div>
              <strong>Entries:</strong> {timer.entries.length}
            </div>
            {timer.entries.length > 0 && (
              <>
                <div className="border-t pt-1 mt-1">
                  {timer.entries.slice(0, 3).map((entry, idx) => (
                    <div key={entry.id} className="text-xs">
                      {idx + 1}. {timer.formatTime(entry.durationSeconds)}
                      {entry.notes && ` - ${entry.notes}`}
                    </div>
                  ))}
                  {timer.entries.length > 3 && (
                    <div className="text-xs opacity-75">
                      +{timer.entries.length - 3} more entries
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
