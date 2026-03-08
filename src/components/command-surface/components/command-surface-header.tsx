'use client'

import { motion } from 'framer-motion'
import { Bot, GitBranch, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CustomAgentModal } from '@/components/agent-ops/custom-agent-modal'
import { PlanningAgentsPicker } from '@/components/planning-agents/planning-agents-picker'
import type { CommandMode } from '../types'
import type { AvailablePlanningAgent } from '@/components/planning-agents/use-planning-agents'
import { RuntimeProfileCard } from './runtime-profile-card'

type ExecutionPolicy = {
  mode: 'auto' | 'semi_auto'
  confidenceMinForAuto: number
  requireApprovalForChanges: boolean
}

type RuntimeProfileSummary = {
  workspaceId: string | null
  planModel: string | null
  executeModel: string | null
  reviewModel: string | null
  customAgentOverrides: number
  toolMode: string | null
}

export function CommandSurfaceHeader({
  mode,
  modeConfig,
  runningCount,
  selectedProjectId,
  setSelectedProjectId,
  projects,
  projectRequiredError,
  isSyncingGit,
  handleSyncGit,
  executionPolicy,
  runtimeProfile,
  agents,
  selectedIds,
  selectedAgents,
  agentPickerOpen,
  setAgentPickerOpen,
  setSelectedIds,
  saveWorkspaceAgentDefaults,
  savingAgentDefaults,
  workspaceId,
  setMode,
}: {
  mode: CommandMode
  modeConfig: Record<CommandMode, {
    label: string
    icon: React.ReactNode
    color: string
    bgColor: string
    borderColor: string
    ringColor: string
    description: string
    placeholder: string
    examples: string[]
  }>
  runningCount: number
  selectedProjectId: string | null
  setSelectedProjectId: (value: string | null) => void
  projects: { id: string; name: string }[]
  projectRequiredError: string | null
  isSyncingGit: boolean
  handleSyncGit: () => void
  executionPolicy: ExecutionPolicy
  runtimeProfile: RuntimeProfileSummary
  agents: AvailablePlanningAgent[]
  selectedIds: string[]
  selectedAgents: AvailablePlanningAgent[]
  agentPickerOpen: boolean
  setAgentPickerOpen: (open: boolean) => void
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>
  saveWorkspaceAgentDefaults: () => void
  savingAgentDefaults: boolean
  workspaceId: string | null
  setMode: (mode: CommandMode) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Command Surface</h2>
            <p className="text-xs text-muted-foreground">Your AI-powered workspace assistant</p>
          </div>
          {runningCount > 0 && (
            <Badge variant="secondary" className="gap-1.5 border-teal-500/20 bg-teal-500/10 px-2.5 py-1 text-teal-600">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
              </span>
              {runningCount} running
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedProjectId ?? 'none'}
            onValueChange={(v) => setSelectedProjectId(v === 'none' ? null : v)}
          >
            <SelectTrigger className={cn('h-9 w-[160px] bg-background/50 text-sm', projectRequiredError && 'border-rose-500 focus-visible:ring-rose-500')}>
              <SelectValue placeholder="Select project..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="block max-w-[140px] truncate">{p.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={handleSyncGit} disabled={isSyncingGit} title="Sync git repos as projects">
            {isSyncingGit ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
          </Button>
          <CustomAgentModal />
        </div>
      </div>

      <div className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/50 p-1.5">
        {(Object.keys(modeConfig) as CommandMode[]).map((itemMode) => (
          <button
            key={itemMode}
            type="button"
            onClick={() => setMode(itemMode)}
            className={cn(
              'group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
              modeConfig[itemMode].ringColor,
              mode === itemMode
                ? cn(modeConfig[itemMode].bgColor, modeConfig[itemMode].color, 'border shadow-sm', modeConfig[itemMode].borderColor)
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <span className={cn('transition-transform duration-200', mode === itemMode ? 'scale-110' : 'group-hover:scale-105')}>
              {modeConfig[itemMode].icon}
            </span>
            <span className="hidden sm:inline">{modeConfig[itemMode].label}</span>
            {mode === itemMode && <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-current opacity-20" />}
          </button>
        ))}
      </div>

      <RuntimeProfileCard executionPolicy={executionPolicy} runtimeProfile={runtimeProfile} />

      <PlanningAgentsPicker
        agents={agents}
        selectedIds={selectedIds}
        selectedAgents={selectedAgents}
        open={agentPickerOpen}
        onOpenChange={setAgentPickerOpen}
        onToggleAgent={(agentId, enabled) => setSelectedIds((prev) => (enabled ? [...prev, agentId] : prev.filter((value) => value !== agentId)))}
        onClear={() => setSelectedIds([])}
        onSaveDefaults={saveWorkspaceAgentDefaults}
        isSaving={savingAgentDefaults}
        canSaveDefaults={Boolean(workspaceId)}
        helperText="Optional. Select specialists and persona advisors to shape reasoning before execution."
        emptyMessage="Using the system planning roster unless workspace defaults are saved."
      />
    </div>
  )
}
