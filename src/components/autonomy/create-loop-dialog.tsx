'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sun, GitPullRequest, Heart, Scissors, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LoopType, ExecutionBackend, ExecutionMode } from '@/lib/autonomy/loop-types'
import { toast } from 'sonner'

export interface CreateLoopDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string | null
  onCreated?: (loop: unknown) => void
}

interface LoopTypeOption {
  value: LoopType
  label: string
  description: string
  icon: React.ReactNode
}

const LOOP_TYPE_OPTIONS: LoopTypeOption[] = [
  {
    value: 'morning_briefing',
    label: 'Morning Briefing',
    description: 'Daily project health report at a set time',
    icon: <Sun className="h-4 w-4" />,
  },
  {
    value: 'pr_babysitter',
    label: 'PR Babysitter',
    description: 'Monitor open pull requests and flag stale/risky ones',
    icon: <GitPullRequest className="h-4 w-4" />,
  },
  {
    value: 'health_patrol',
    label: 'Health Patrol',
    description: 'Periodic codebase health checks and risk alerts',
    icon: <Heart className="h-4 w-4" />,
  },
  {
    value: 'codebase_gardening',
    label: 'Codebase Gardening',
    description: 'Surface tech debt and maintainability issues',
    icon: <Scissors className="h-4 w-4" />,
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Write your own objective and schedule',
    icon: <Settings2 className="h-4 w-4" />,
  },
]

interface SchedulePreset {
  label: string
  value: string
}

const SCHEDULE_PRESETS: SchedulePreset[] = [
  { label: 'Every 2 hours', value: 'every_2h' },
  { label: 'Every 6 hours', value: 'every_6h' },
  { label: 'Every 12 hours', value: 'every_12h' },
  { label: 'Every morning at 7am', value: 'every_morning' },
  { label: 'Every 5 minutes', value: 'continuous' },
  { label: 'Custom schedule', value: '__custom__' },
]

interface FormState {
  loopType: LoopType
  schedulePreset: string
  scheduleCronCustom: string
  timezone: string
  backend: ExecutionBackend
  mode: ExecutionMode
  objective: string
}

function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

function initialForm(): FormState {
  return {
    loopType: 'morning_briefing',
    schedulePreset: 'every_morning',
    scheduleCronCustom: '',
    timezone: defaultTimezone(),
    backend: 'openclaw',
    mode: 'report_only',
    objective: '',
  }
}

export function CreateLoopDialog({
  open,
  onOpenChange,
  workspaceId,
  onCreated,
}: CreateLoopDialogProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSubmitError(null)
  }

  async function handleSubmit() {
    if (!workspaceId) {
      setSubmitError('No workspace selected.')
      return
    }

    const isCustomCron = form.schedulePreset === '__custom__'
    const scheduleValue = isCustomCron ? form.scheduleCronCustom.trim() : form.schedulePreset

    if (!scheduleValue) {
      setSubmitError('Please enter a cron expression.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/autonomy/loops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          loop_type: form.loopType,
          schedule_kind: isCustomCron ? 'cron' : 'preset',
          schedule_value: scheduleValue,
          timezone: form.timezone,
          execution_backend: form.backend,
          requested_execution_mode: form.mode,
          config: form.objective.trim() ? { objective: form.objective.trim() } : {},
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setSubmitError(json?.error ?? 'Failed to create loop.')
        return
      }

      const loop = json?.data ?? json

      toast.success('Loop created successfully')
      onCreated?.(loop)
      onOpenChange(false)
      setForm(initialForm())
    } catch {
      setSubmitError('Network error — could not reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose(value: boolean) {
    if (submitting) return
    if (!value) {
      setSubmitError(null)
      setForm(initialForm())
    }
    onOpenChange(value)
  }

  const isCustomCron = form.schedulePreset === '__custom__'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Recurring Task</DialogTitle>
          <DialogDescription>
            Set up a recurring task for your AI co-founder. It will run automatically on a schedule and keep you informed — or take action — without you having to ask.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Step 1: Loop type */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What kind of loop?
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {LOOP_TYPE_OPTIONS.map((option) => {
                const selected = form.loopType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setField('loopType', option.value)}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      selected
                        ? 'border-[color:var(--foco-teal)] bg-[color:var(--foco-teal)]/5 ring-1 ring-[color:var(--foco-teal)]/30'
                        : 'border-border hover:border-zinc-400 dark:hover:border-zinc-600',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 shrink-0',
                        selected ? 'text-[color:var(--foco-teal)]' : 'text-muted-foreground',
                      )}
                    >
                      {option.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-snug">{option.label}</span>
                      <span className="block text-xs text-muted-foreground leading-snug">
                        {option.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Step 2: Schedule & config */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Schedule &amp; Config
            </h3>

            {/* Schedule presets */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">How often should this run?</label>
              <div className="flex flex-wrap gap-1.5">
                {SCHEDULE_PRESETS.map((preset) => {
                  const active = form.schedulePreset === preset.value
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setField('schedulePreset', preset.value)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-[color:var(--foco-teal)] bg-[color:var(--foco-teal)]/10 text-[color:var(--foco-teal)]'
                          : 'border-border text-muted-foreground hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-foreground',
                      )}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
              {isCustomCron && (
                <Input
                  placeholder="e.g. 0 9 * * 1-5"
                  value={form.scheduleCronCustom}
                  onChange={(e) => setField('scheduleCronCustom', e.target.value)}
                  className="mt-2 font-mono text-xs"
                />
              )}
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Timezone</label>
              <Input
                value={form.timezone}
                onChange={(e) => setField('timezone', e.target.value)}
                placeholder="e.g. America/New_York"
                className="text-xs"
              />
            </div>

            {/* Execution backend */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Execution Engine</label>
              <p className="text-[11px] text-muted-foreground">Recurring autonomy now dispatches through OpenClaw only.</p>
              <div className="flex gap-1">
                {([{ value: 'openclaw', label: 'OpenClaw' }] as { value: ExecutionBackend; label: string }[]).map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setField('backend', b.value)}
                    className="rounded-md border border-[color:var(--foco-teal)] bg-[color:var(--foco-teal)]/10 px-3 py-1.5 text-xs font-medium text-[color:var(--foco-teal)]"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Execution mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">What should it do?</label>
              <div className="flex gap-1">
                {([
                  { value: 'report_only', label: 'Report Only' },
                  { value: 'bounded_execution', label: 'Auto-Fix (with limits)' },
                ] as { value: ExecutionMode; label: string }[]).map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setField('mode', m.value)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                      form.mode === m.value
                        ? 'border-[color:var(--foco-teal)] bg-[color:var(--foco-teal)]/10 text-[color:var(--foco-teal)]'
                        : 'border-border text-muted-foreground hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-foreground',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {form.mode === 'report_only' && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Generates a report and sends you a summary — no changes made.
                </p>
              )}
              {form.mode === 'bounded_execution' && (
                <p className="text-[11px] text-amber-500 mt-1">
                  Can make small, safe changes automatically within defined limits. Requires{' '}
                  <code className="rounded bg-amber-500/10 px-1 py-0.5 font-mono">
                    COFOUNDER_FULL_AUTO_ENABLED=1
                  </code>
                </p>
              )}
            </div>

            {/* Custom objective */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {form.loopType === 'custom' ? 'Objective' : 'Objective (optional)'}
              </label>
              <Textarea
                placeholder={
                  form.loopType === 'custom'
                    ? 'Describe what this loop should do…'
                    : 'Override the default objective for this loop type…'
                }
                value={form.objective}
                onChange={(e) => setField('objective', e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* Project selection note */}
            <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Project scope:</span> Selects all
              workspace projects. Per-project selection is coming in a future update.
            </div>
          </section>

          {/* Error message */}
          {submitError && (
            <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-[color:var(--foco-teal)] hover:bg-[color:var(--foco-teal)]/90 text-white"
            onClick={handleSubmit}
            disabled={submitting || !workspaceId}
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? 'Creating…' : 'Create Recurring Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
