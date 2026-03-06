'use client'

import { AlertCircle, Bot, OctagonX, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PLANNER_MODELS, EXECUTOR_MODELS, REVIEWER_MODELS } from '@/lib/pipeline/types'
import { PlanningAgentsPicker } from '@/components/planning-agents/planning-agents-picker'
import type { AvailablePlanningAgent } from '@/components/planning-agents/use-planning-agents'
import { getModelRuntimeSourceLabel } from '@/lib/ai/model-catalog'

export function PipelineConfigPanel({
  plannerModel,
  executorModel,
  reviewerModel,
  autoReview,
  setPlannerModel,
  setExecutorModel,
  setReviewerModel,
  setAutoReview,
  task,
  setTask,
  complexHint,
  triggerHint,
  error,
  isRunning,
  loading,
  startPipeline,
  cancelPipeline,
  agents,
  selectedIds,
  selectedAgents,
  agentPickerOpen,
  setAgentPickerOpen,
  setSelectedIds,
  saveWorkspaceAgentDefaults,
  savingAgentDefaults,
  workspaceId,
}: {
  plannerModel: string
  executorModel: string
  reviewerModel: string
  autoReview: boolean
  setPlannerModel: (value: string) => void
  setExecutorModel: (value: string) => void
  setReviewerModel: (value: string) => void
  setAutoReview: (value: boolean) => void
  task: string
  setTask: (value: string) => void
  complexHint: boolean
  triggerHint: string | null
  error: string | null
  isRunning: boolean
  loading: boolean
  startPipeline: () => void
  cancelPipeline: () => void
  agents: AvailablePlanningAgent[]
  selectedIds: string[]
  selectedAgents: AvailablePlanningAgent[]
  agentPickerOpen: boolean
  setAgentPickerOpen: (open: boolean) => void
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>
  saveWorkspaceAgentDefaults: () => void
  savingAgentDefaults: boolean
  workspaceId: string | null
}) {
  return (
    <>
      <Card>
        <CardHeader className="px-4 pb-2 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Model Config
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Planner</Label>
              <Select value={plannerModel} onValueChange={setPlannerModel}>
                <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="Claude Opus 4.6" /></SelectTrigger>
                <SelectContent>{PLANNER_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">{getModelRuntimeSourceLabel(plannerModel) ?? 'Inherited'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Executor</Label>
              <Select value={executorModel} onValueChange={setExecutorModel}>
                <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="Kimi K2.5 Std" /></SelectTrigger>
                <SelectContent>{EXECUTOR_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">{getModelRuntimeSourceLabel(executorModel) ?? 'Inherited'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Reviewer</Label>
              <Select value={reviewerModel} onValueChange={setReviewerModel}>
                <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="Codex Std" /></SelectTrigger>
                <SelectContent>{REVIEWER_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">{getModelRuntimeSourceLabel(reviewerModel) ?? 'Inherited'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Switch id="auto-review" checked={autoReview} onCheckedChange={setAutoReview} className="data-[state=checked]:bg-[color:var(--foco-teal)]" />
            <Label htmlFor="auto-review" className="cursor-pointer text-xs text-muted-foreground">Auto-review after execution</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          {complexHint && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              This task may benefit from Codex review.
            </div>
          )}
          {triggerHint && (
            <div className="flex items-center gap-2 rounded-md border border-[color:var(--foco-teal)]/20 bg-[color:var(--foco-teal-dim)] px-3 py-2 text-xs text-[color:var(--foco-teal)]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Detected trigger: <span className="ml-1 font-mono">&ldquo;{triggerHint}&rdquo; mode</span>
            </div>
          )}
          <Textarea
            placeholder="Describe the engineering task… (e.g. Add RLS policies to the quotes table and write a migration)"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={4}
            className="resize-none text-sm"
          />
          <PlanningAgentsPicker
            agents={agents}
            selectedIds={selectedIds}
            selectedAgents={selectedAgents}
            open={agentPickerOpen}
            onOpenChange={setAgentPickerOpen}
            onToggleAgent={(agentId, enabled) =>
              setSelectedIds((prev) => (enabled ? [...prev, agentId] : prev.filter((value) => value !== agentId)))
            }
            onClear={() => setSelectedIds([])}
            onSaveDefaults={saveWorkspaceAgentDefaults}
            isSaving={savingAgentDefaults}
            canSaveDefaults={Boolean(workspaceId)}
            helperText="Combine persona advisors and custom specialists. Leave empty to use the default system roster."
            emptyMessage="Using the system planning roster unless workspace defaults are saved."
          />
          {error && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            {isRunning && (
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={cancelPipeline}>
                <OctagonX className="h-3.5 w-3.5" />
                Stop
              </Button>
            )}
            <Button size="sm" onClick={startPipeline} disabled={!task.trim() || loading || isRunning} className="gap-1.5 bg-[color:var(--foco-teal)] text-white hover:bg-[color:var(--foco-teal)]/90">
              <Play className="h-3.5 w-3.5" />
              Run Pipeline
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
