'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import { AGENT_STATUS_DOT, BACKEND_LABELS } from '@/lib/command-center/types'

interface AssignAgentDialogProps {
  open: boolean
  missionId: string | null
  onClose: () => void
}

export function AssignAgentDialog({ open, missionId, onClose }: AssignAgentDialogProps) {
  const store = useCommandCenterStore()
  const [selected, setSelected] = useState<string[]>([])

  const mission = missionId ? store.missions.find(m => m.id === missionId) : null

  const toggle = (agentId: string) => {
    setSelected(prev =>
      prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]
    )
  }

  const handleAssign = () => {
    // Optimistic update — in a real system this would PATCH the mission
    store.setMissions(store.missions.map(m =>
      m.id === missionId
        ? { ...m, assignedAgentIds: [...new Set([...m.assignedAgentIds, ...selected])] }
        : m
    ))
    setSelected([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Agents</DialogTitle>
        </DialogHeader>

        {mission && (
          <p className="text-sm text-muted-foreground -mt-2">Mission: <strong>{mission.title}</strong></p>
        )}

        <div className="max-h-[300px] overflow-y-auto space-y-1 py-2">
          {store.agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => toggle(agent.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md border text-left transition-colors',
                selected.includes(agent.id)
                  ? 'border-[color:var(--foco-teal)] bg-[color:var(--foco-teal)]/5'
                  : 'border-border hover:bg-accent/40'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', AGENT_STATUS_DOT[agent.status])} />
              <span className="flex-1 text-sm truncate">{agent.name}</span>
              <Badge variant="outline" className="text-[9px]">{BACKEND_LABELS[agent.backend]}</Badge>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={selected.length === 0}>
            Assign {selected.length > 0 ? `(${selected.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
