'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, GitBranch, Loader2, Moon, ShieldCheck, Square, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useWorkspaceStore } from '@/lib/stores/foco-store'
import type { NightlyAgent, NightlyGitStrategy } from '@/lib/autonomy/night-session'

interface LaunchAgent extends NightlyAgent {}

interface LaunchProject {
  id: string
  workspace_id: string
  name: string
  slug: string
  description: string | null
  local_path: string
  git_remote: string | null
  founder_alignment: {
    score: number
    reasons: string[]
    blockedByAntiGoals: string[]
  }
}

interface LaunchOptionsResponse {
  workspace_id: string
  agents: LaunchAgent[]
  projects: LaunchProject[]
  git_defaults: NightlyGitStrategy & {
    neverPushProtectedBranches: boolean
  }
  founder_profile?: {
    path: string
    excerpt: string
    available: boolean
    stale: boolean
    issues: Array<{ code: string; message: string; severity: 'warning' | 'error' }>
    parsed: {
      activeVenture: string | null
      strategicPriorityOrder: string[]
      bottlenecks: string[]
      opportunityThemes: string[]
      unknowns: string[]
    } | null
  } | null
}

interface RunningSession {
  id: string
  status: string
  objective: string | null
  window_start: string
  selected_agent?: { name?: string } | null
  selected_project_ids?: string[] | null
}

interface NightAutonomyLaunchDialogProps {
  trigger: ReactNode
  onStarted?: () => void | Promise<void>
  onStopped?: () => void | Promise<void>
}

async function loadPrimaryWorkspaceId(): Promise<string | null> {
  try {
    const res = await fetch('/api/user/workspace')
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json?.ok) return null
    return typeof json?.data?.workspace_id === 'string' ? json.data.workspace_id : null
  } catch {
    return null
  }
}

export function NightAutonomyLaunchDialog({ trigger, onStarted, onStopped }: NightAutonomyLaunchDialogProps) {
  const { currentWorkspace } = useWorkspaceStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(currentWorkspace?.id ?? null)
  const [options, setOptions] = useState<LaunchOptionsResponse | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [objective, setObjective] = useState('')
  const [activeSession, setActiveSession] = useState<RunningSession | null>(null)

  useEffect(() => {
    if (currentWorkspace?.id) setWorkspaceId(currentWorkspace.id)
  }, [currentWorkspace?.id])

  useEffect(() => {
    if (workspaceId || !open) return
    void (async () => {
      const resolvedWorkspaceId = await loadPrimaryWorkspaceId()
      if (resolvedWorkspaceId) setWorkspaceId(resolvedWorkspaceId)
    })()
  }, [open, workspaceId])

  useEffect(() => {
    if (!open || !workspaceId) return
    void refresh()
  }, [open, workspaceId])

  const refresh = async () => {
    if (!workspaceId) return
    try {
      setLoading(true)
      const [launchRes, sessionRes] = await Promise.all([
        fetch(`/api/autonomy/launch-options?workspace_id=${encodeURIComponent(workspaceId)}`),
        fetch('/api/autonomy/sessions?status=running&limit=1'),
      ])

      const launchJson = await launchRes.json().catch(() => ({}))
      const sessionJson = await sessionRes.json().catch(() => ({}))

      if (!launchRes.ok || !launchJson?.ok) {
        throw new Error(launchJson?.error?.message ?? 'Failed to load night autonomy options')
      }

      const nextOptions = launchJson.data as LaunchOptionsResponse
      setOptions(nextOptions)
      if (!selectedAgentId) {
        setSelectedAgentId(nextOptions.agents[0]?.id ?? '')
      } else if (!nextOptions.agents.some((agent) => agent.id === selectedAgentId)) {
        setSelectedAgentId(nextOptions.agents[0]?.id ?? '')
      }

      setSelectedProjectIds((current) => {
        const validIds = current.filter((id) => nextOptions.projects.some((project) => project.id === id))
        return validIds.length > 0 ? validIds : nextOptions.projects.slice(0, 1).map((project) => project.id)
      })

      const running = sessionRes.ok && sessionJson?.ok
        ? (sessionJson.data?.sessions?.[0] as RunningSession | undefined)
        : undefined
      setActiveSession(running ?? null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load night autonomy options')
    } finally {
      setLoading(false)
    }
  }

  const selectedAgent = useMemo(
    () => options?.agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [options?.agents, selectedAgentId],
  )

  const selectedProjects = useMemo(
    () => options?.projects.filter((project) => selectedProjectIds.includes(project.id)) ?? [],
    [options?.projects, selectedProjectIds],
  )

  const toggleProject = (projectId: string, checked: boolean) => {
    setSelectedProjectIds((current) => {
      if (checked) return [...new Set([...current, projectId])]
      return current.filter((id) => id !== projectId)
    })
  }

  const startNightMode = async () => {
    if (!workspaceId || !selectedAgent || selectedProjectIds.length === 0 || !options) {
      toast.error('Choose an agent and at least one indexed codebase')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/autonomy/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          selected_agent: selectedAgent,
          selected_project_ids: selectedProjectIds,
          objective: objective.trim() || null,
          git_strategy: options.git_defaults,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error?.message ?? 'Failed to start night autonomy')
      }
      toast.success('Night autonomy started')
      await refresh()
      setOpen(false)
      setObjective('')
      await onStarted?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start night autonomy')
    } finally {
      setSubmitting(false)
    }
  }

  const stopNightMode = async () => {
    if (!activeSession) return

    try {
      setSubmitting(true)
      const res = await fetch('/api/autonomy/sessions/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession.id, reason: 'Manual stop from night autonomy dialog' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error?.message ?? 'Failed to stop night autonomy')
      }
      toast.success('Night autonomy stopped')
      await refresh()
      await onStopped?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to stop night autonomy')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-[color:var(--foco-teal)]" />
            Night Autonomy
          </DialogTitle>
          <DialogDescription>
            Choose tonight&apos;s agent, select the indexed codebases it may touch, and define the night&apos;s wishes. Protected branches remain read-only.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !workspaceId ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            No active workspace found for night autonomy.
          </div>
        ) : !options ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            Night autonomy options could not be loaded.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <Wand2 className="h-3.5 w-3.5" />
                  Selected Agent
                </div>
                <div className="grid gap-2">
                  {options.agents.map((agent) => {
                    const selected = agent.id === selectedAgentId
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        className={`rounded-xl border p-3 text-left transition ${selected ? 'border-[color:var(--foco-teal)] bg-[color:var(--foco-teal)]/5' : 'border-border hover:border-[color:var(--foco-teal)]/50'}`}
                        onClick={() => setSelectedAgentId(agent.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{agent.name}</div>
                            <div className="text-sm text-muted-foreground">{agent.role}</div>
                          </div>
                          <Badge variant={selected ? 'default' : 'outline'}>{agent.kind}</Badge>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {agent.description ?? agent.risk_model}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <GitBranch className="h-3.5 w-3.5" />
                  Indexed Codebases
                </div>
                <ScrollArea className="h-[280px] rounded-xl border">
                  <div className="space-y-2 p-3">
                    {options.projects.map((project) => {
                      const checked = selectedProjectIds.includes(project.id)
                      return (
                        <label key={project.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                          <Checkbox checked={checked} onCheckedChange={(value) => toggleProject(project.id, Boolean(value))} />
                          <div className="min-w-0">
                            <div className="font-medium">{project.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{project.local_path}</div>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="outline">Alignment {project.founder_alignment.score}</Badge>
                              {project.founder_alignment.blockedByAntiGoals.length > 0 && (
                                <Badge variant="destructive">Anti-goal conflict</Badge>
                              )}
                            </div>
                            {project.founder_alignment.reasons.length > 0 && (
                              <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                                {project.founder_alignment.reasons.join(' • ')}
                              </div>
                            )}
                            {project.git_remote && (
                              <div className="truncate text-[11px] text-muted-foreground">{project.git_remote}</div>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="night-objective">Wishes for tonight</Label>
              <Textarea
                id="night-objective"
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                placeholder="Example: tighten proposal flow reliability, fix failing orchestration tests, and leave branches ready for morning review."
                className="min-h-[120px]"
              />
            </div>

            <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Safety defaults
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>Always sync selected repos before execution</li>
                  <li>Never commit or push to default/protected branches</li>
                  <li>Skip dirty worktrees and log the reason</li>
                </ul>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Tonight&apos;s scope
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedAgent ? `${selectedAgent.name}` : 'No agent selected'} across {selectedProjects.length} selected codebase{selectedProjects.length === 1 ? '' : 's'}.
                </div>
                <Input value={options.git_defaults.branchPrefix} disabled aria-label="Night autonomy branch prefix" />
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-[color:var(--foco-teal)]" />
                Founder context
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {options.founder_profile?.available ? options.founder_profile.excerpt : 'Founder profile is missing or empty. Night autonomy will run without founder-specific business context.'}
              </div>
              {options.founder_profile?.parsed && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Priority Order</div>
                    <div className="mt-1 text-sm">{options.founder_profile.parsed.strategicPriorityOrder.join(' -> ')}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current Bottlenecks</div>
                    <div className="mt-1 text-sm">{options.founder_profile.parsed.bottlenecks.join(', ') || 'None listed'}</div>
                  </div>
                </div>
              )}
              {options.founder_profile?.issues?.length ? (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                  {options.founder_profile.issues.map((issue) => issue.message).join(' ')}
                </div>
              ) : null}
              {options.founder_profile?.stale ? (
                <div className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                  Founder profile is stale. Ranking remains active but should be reviewed before broadening autonomy.
                </div>
              ) : null}
              <div className="mt-3 text-xs text-muted-foreground">
                Projects are ordered by founder alignment first, then name.
              </div>
            </div>

            {activeSession && (
              <div className="rounded-xl border border-[color:var(--foco-teal)]/30 bg-[color:var(--foco-teal)]/5 p-4 text-sm">
                <div className="font-medium">Session currently running</div>
                <div className="mt-1 text-muted-foreground">
                  {activeSession.selected_agent?.name ?? 'Night autonomy'} started {new Date(activeSession.window_start).toLocaleString()} across {activeSession.selected_project_ids?.length ?? 0} repos.
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {activeSession ? (
            <Button type="button" variant="destructive" onClick={stopNightMode} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
              Stop Session
            </Button>
          ) : (
            <Button type="button" onClick={startNightMode} disabled={submitting || !selectedAgent || selectedProjectIds.length === 0 || !workspaceId}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Moon className="mr-2 h-4 w-4" />}
              Start Night Loop
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
