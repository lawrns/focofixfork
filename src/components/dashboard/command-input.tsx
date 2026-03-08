'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/data-display/avatar'
import { Bot, Loader2, Send, Sparkles } from 'lucide-react'
import type { AgentOption, ProjectOption } from './use-dashboard-data'
import { containsSensitiveText, redactSensitiveText } from '@/lib/security/redaction'

const SHARED_SPRING = { type: 'spring', stiffness: 300, damping: 30 }

export const PERSONA_PRESETS: Array<{ key: 'cto' | 'coo' | 'auto' | 'intake'; label: string; description: string }> = [
  { key: 'cto', label: 'CTO', description: 'Architecture and systems decisions' },
  { key: 'coo', label: 'COO', description: 'Operations and execution flow' },
  { key: 'auto', label: 'Auto', description: 'Automatic best-agent routing' },
  { key: 'intake', label: 'Intake', description: 'Task intake and triage' },
]

type Lane = 'auto' | 'product_ui' | 'platform_api' | 'requirements'

const LANE_OPTIONS: Array<{ key: Lane; label: string; paths: string }> = [
  { key: 'auto', label: 'Auto', paths: '' },
  { key: 'product_ui', label: 'Product UI', paths: 'src/app/, src/components/' },
  { key: 'platform_api', label: 'Platform API', paths: 'src/app/api/, src/lib/services/' },
  { key: 'requirements', label: 'Requirements', paths: 'docs/, FOUNDER_PROFILE.md' },
]

const PERSONA_LANE_MAP: Record<string, Lane> = {
  cto: 'platform_api',
  coo: 'requirements',
  auto: 'auto',
  intake: 'auto',
}

type RibbonState = {
  agent: string
  task: string
  runId?: string
  jobId?: string
}

export type DispatchResult = {
  ok: boolean
  error?: string
  runId?: string
  jobId?: string
}

type CommandInputProps = {
  agents: AgentOption[]
  projectOptions: ProjectOption[]
  selectedProjectId: string
  selectedProjectSlug: string
  onProjectChange: (projectId: string) => void
  onDispatch: (args: { task: string; persona: string; agentId: string; personaLabel: string; lane?: string }) => Promise<DispatchResult>
  dispatching: boolean
  ribbon: RibbonState | null
  dispatchFlash: boolean
}

export function CommandInput({
  agents,
  projectOptions,
  selectedProjectId,
  selectedProjectSlug,
  onProjectChange,
  onDispatch,
  dispatching,
  ribbon,
  dispatchFlash,
}: CommandInputProps) {
  const [persona, setPersona] = useState<'cto' | 'coo' | 'auto' | 'intake'>('auto')
  const [lane, setLane] = useState<Lane>('auto')
  const [agentId, setAgentId] = useState('')
  const [task, setTask] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const personaLabel = PERSONA_PRESETS.find((preset) => preset.key === persona)?.label ?? 'Auto'
  const activeLane = LANE_OPTIONS.find((l) => l.key === lane)
  const selectedAgent = agents.find((agent) => agent.nativeId === agentId)
  const redactedPreview = redactSensitiveText(task)
  const sensitiveInput = task.trim().length > 0 && containsSensitiveText(task)

  const handleSubmit = async () => {
    if (!task.trim()) return
    setErrorMessage(null)
    const result = await onDispatch({ task, persona, agentId: agentId.trim() || personaLabel, personaLabel, lane: lane !== 'auto' ? lane : undefined })
    if (!result.ok) {
      setErrorMessage(result.error ?? 'Dispatch failed')
      return
    }
    setTask('')
  }

  return (
    <div className="rounded-xl border p-3 space-y-2 bg-card/70">
      <motion.div
        layoutId="dashboard-command"
        transition={dispatchFlash ? { duration: 0.15, ease: 'easeInOut' } : SHARED_SPRING}
        className="rounded-xl border border-zinc-300/70 bg-card p-3"
        animate={dispatchFlash ? { scale: [1, 0.98, 1] } : {}}
      >
        <div className="flex flex-col gap-2">
          <div className="rounded-lg border border-l-2 border-l-[color:var(--foco-teal)] bg-background px-2 py-2 transition-shadow focus-within:ring-1 focus-within:ring-emerald-500/40 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.08)]">
            <div className="flex flex-wrap items-center gap-1.5">
              {PERSONA_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => { setPersona(preset.key); setLane(PERSONA_LANE_MAP[preset.key] ?? 'auto') }}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors flex-shrink-0 whitespace-nowrap',
                    preset.key === persona
                      ? 'border-[color:var(--foco-teal)] bg-[color:var(--foco-teal)] text-white'
                      : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {preset.label}
                </button>
              ))}
              <span className="text-[10px] text-muted-foreground mx-0.5">|</span>
              {LANE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setLane(opt.key)}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors flex-shrink-0 whitespace-nowrap',
                    opt.key === lane
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
                    <Bot className="h-3.5 w-3.5" />
                    {selectedAgent?.name ?? (agentId ? agentId : 'Agent')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-2">
                  <div className="space-y-1 max-h-56 overflow-auto">
                    {agents.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-muted-foreground">No live agents discovered</p>
                    ) : (
                      agents.map((agent) => (
                        <button
                          key={agent.id}
                          onClick={() => setAgentId(agent.nativeId)}
                          className={cn(
                            'w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                            agentId === agent.nativeId ? 'border-[color:var(--foco-teal)] bg-muted/40' : 'border-transparent hover:border-border hover:bg-muted/30'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar size="xs">
                              {agent.avatarUrl && <AvatarImage src={agent.avatarUrl} alt={agent.name} />}
                              <AvatarFallback className="text-[9px]">{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-medium">{agent.name}</span>
                                <Badge variant="outline" className="px-1 py-0 text-[9px]">{agent.status}</Badge>
                              </div>
                              <p className="truncate text-[10px] text-muted-foreground">{agent.backend} · {agent.nativeId}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
              <Input
                value={task}
                onChange={(event) => {
                  setTask(event.target.value)
                  if (errorMessage) setErrorMessage(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void handleSubmit()
                  }
                }}
                placeholder="Dispatch a task to the critter fleet..."
                className="h-9 border-0 bg-transparent pl-4 pr-1 text-sm shadow-none focus-visible:ring-0"
              />

              <Button onClick={() => void handleSubmit()} disabled={dispatching || !task.trim()} size="sm" className="h-8 gap-1.5 self-end md:self-auto">
                {dispatching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </Button>
            </div>
          </div>

          {errorMessage ? (
            <p className="px-4 text-xs text-rose-500" role="status" aria-live="polite">
              {errorMessage}
            </p>
          ) : null}

          {sensitiveInput ? (
            <p className="px-4 text-xs text-amber-600 dark:text-amber-400" role="status" aria-live="polite">
              Sensitive values detected. The dashboard will redact previews, but avoid pasting raw credentials unless they are required.
            </p>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SHARED_SPRING}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="bg-muted/50 rounded-md px-3 py-1.5 text-[11px] font-mono text-muted-foreground flex-1">
                routing <span className="text-foreground/70">{personaLabel}</span> · project <span className="text-foreground/70">{selectedProjectSlug || 'default'}</span> · lane <span className="text-foreground/70">{activeLane?.label ?? 'auto'}</span>{activeLane?.paths ? <span className="text-muted-foreground/60"> ({activeLane.paths})</span> : null} · mode <span className="text-foreground/70">persisted pipeline</span>
              </div>

              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={selectedProjectId}
                onChange={(event) => onProjectChange(event.target.value)}
              >
                <option value="">Workspace default</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
            <p className="mt-2 px-1 text-[11px] text-muted-foreground">
              Every dispatch creates a saved run first. Live output only appears after a stream is actually attached.
              {task.trim() ? ` Preview: ${redactedPreview.slice(0, 160)}` : ''}
            </p>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {ribbon && (
          <motion.div
            key={`${ribbon.agent}-${ribbon.task}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SHARED_SPRING}
            className="rounded-lg border-l-2 border-[color:var(--foco-teal)] bg-card/80 px-3 py-2 text-xs"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--foco-teal)]" />
              <span className="font-medium">Activity Ribbon</span>
              <span className="text-muted-foreground">{ribbon.agent}</span>
              {ribbon.runId && <Badge variant="outline" className="text-[10px]">{ribbon.runId.slice(0, 8)}</Badge>}
              {!ribbon.runId && ribbon.jobId ? <Badge variant="outline" className="text-[10px]">job {ribbon.jobId.slice(0, 8)}</Badge> : null}
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground truncate">{ribbon.task}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
