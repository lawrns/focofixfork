'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Square, Pause, Play, Loader2 } from 'lucide-react'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import type { UnifiedAgent } from '@/lib/command-center/types'

const STOP_SUPPORTED  = new Set(['crico', 'bosun', 'clawdbot'])
const PAUSE_SUPPORTED = new Set(['bosun'])

interface AgentControlsProps {
  agent: UnifiedAgent
}

export function AgentControls({ agent }: AgentControlsProps) {
  const [stoppingId, setStoppingId]  = useState<string | null>(null)
  const [pausingId, setPausingId]    = useState<string | null>(null)
  const store = useCommandCenterStore()

  const canStop  = STOP_SUPPORTED.has(agent.backend)
  const canPause = PAUSE_SUPPORTED.has(agent.backend)
  const isPaused = agent.status === 'paused'

  const handleStop = async () => {
    setStoppingId(agent.id)
    try { await store.stopAgent(agent.backend, agent.nativeId) } finally { setStoppingId(null) }
  }

  const handlePause = async () => {
    setPausingId(agent.id)
    try {
      if (isPaused) {
        await fetch('/api/command-center/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resume', backend: agent.backend, nativeId: agent.nativeId }),
        })
      } else {
        await store.pauseAgent(agent.backend, agent.nativeId)
      }
    } finally {
      setPausingId(null)
    }
  }

  if (!canStop && !canPause) {
    return (
      <p className="text-[11px] text-muted-foreground italic">
        No controls available for {agent.backend}.
      </p>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {canStop && (
        <Button
          variant="destructive"
          size="sm"
          onClick={handleStop}
          disabled={!!stoppingId || agent.status === 'done'}
          className="gap-1.5"
        >
          {stoppingId === agent.id
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Square className="h-3.5 w-3.5" />
          }
          Stop
        </Button>
      )}
      {canPause && (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePause}
          disabled={!!pausingId || agent.status === 'done'}
          className="gap-1.5"
        >
          {pausingId === agent.id
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : isPaused
              ? <Play className="h-3.5 w-3.5" />
              : <Pause className="h-3.5 w-3.5" />
          }
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
      )}
    </div>
  )
}
