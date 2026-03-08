'use client'

import { Bot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { AvailablePlanningAgent } from './use-planning-agents'

interface PlanningAgentsPickerProps {
  agents: AvailablePlanningAgent[]
  selectedIds: string[]
  selectedAgents: AvailablePlanningAgent[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggleAgent: (agentId: string, enabled: boolean) => void
  onClear: () => void
  onSaveDefaults?: () => void
  saveLabel?: string
  isSaving?: boolean
  canSaveDefaults?: boolean
  emptyMessage?: string
  helperText?: string
  compact?: boolean
}

export function PlanningAgentsPicker({
  agents,
  selectedIds,
  selectedAgents,
  open,
  onOpenChange,
  onToggleAgent,
  onClear,
  onSaveDefaults,
  saveLabel = 'Save workspace default',
  isSaving = false,
  canSaveDefaults = true,
  emptyMessage = 'Using the system planning roster unless workspace defaults are saved.',
  helperText = 'Combine persona advisors and custom specialists. Leave empty to use the default system roster.',
  compact = false,
}: PlanningAgentsPickerProps) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl border border-border/50 bg-background/40 ${compact ? 'p-3' : 'p-3'}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Planning Agents</p>
          <p className="text-[11px] text-muted-foreground">{helperText}</p>
        </div>
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
              <Bot className="h-3.5 w-3.5" />
              {selectedAgents.length > 0 ? `${selectedAgents.length} selected` : 'Select agents'}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[360px] p-0">
            <div className="border-b px-3 py-2">
              <p className="text-sm font-medium">Choose planning agents</p>
              <p className="text-xs text-muted-foreground">{helperText}</p>
            </div>
            <div className="max-h-80 space-y-2 overflow-auto p-3">
              {agents.length === 0 && (
                <p className="text-xs text-muted-foreground">No selectable agents available.</p>
              )}
              {agents.map((agent) => {
                const checked = selectedIds.includes(agent.id)
                return (
                  <label key={agent.id} className="flex cursor-pointer items-start gap-3 rounded-md border p-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => onToggleAgent(agent.id, next === true)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium">{agent.name}</span>
                        <Badge variant="outline" className="text-[10px]">{agent.kind}</Badge>
                        {agent.active === false && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{agent.role}</p>
                      {agent.expertise.length > 0 && (
                        <p className="mt-1 text-[11px] text-muted-foreground">{agent.expertise.slice(0, 4).join(' · ')}</p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {selectedAgents.length > 0 ? selectedAgents.map((agent) => (
            <Badge key={agent.id} variant="secondary" className="gap-1 text-[10px]">
              {agent.name}
            </Badge>
          )) : (
            <span className="text-[11px] text-muted-foreground">{emptyMessage}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-[11px]"
            disabled={isSaving || selectedIds.length === 0}
            onClick={onClear}
          >
            Clear
          </Button>
          {onSaveDefaults && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[11px]"
              disabled={isSaving || !canSaveDefaults}
              onClick={onSaveDefaults}
            >
              {isSaving ? 'Saving…' : saveLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
