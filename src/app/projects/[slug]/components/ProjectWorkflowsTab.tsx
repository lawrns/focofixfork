'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, AlertTriangle, Bot, CheckCircle2, Clock3, ExternalLink, PlayCircle, ShieldAlert, Sparkles, Workflow } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { ApprovalButtons } from '@/components/proposals/approval-buttons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'
import type { Project, ProjectWorkflowLiveItem, ProjectWorkflowProposal } from './types'
import { WorkflowMiniGraph } from './WorkflowMiniGraph'

function riskTone(risk: string) {
  if (risk === 'high') return 'bg-rose-500/10 text-rose-700 border-rose-500/20'
  if (risk === 'medium') return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
  return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
}

export function ProjectWorkflowsTab({
  project,
  isReviewer,
}: {
  project: Project
  isReviewer: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [canReview, setCanReview] = useState(isReviewer)
  const [proposals, setProposals] = useState<ProjectWorkflowProposal[]>([])
  const [liveWorkflows, setLiveWorkflows] = useState<ProjectWorkflowLiveItem[]>([])
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, string[]>>({})

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [proposalRes, liveRes] = await Promise.all([
        fetch(`/api/projects/${project.id}/workflows/proposals`, { credentials: 'include', cache: 'no-store' }),
        fetch(`/api/projects/${project.id}/workflows`, { credentials: 'include', cache: 'no-store' }),
      ])
      const proposalJson = await proposalRes.json().catch(() => ({}))
      const liveJson = await liveRes.json().catch(() => ({}))
      const nextCanReview =
        proposalJson?.data?.permissions?.canReview ??
        liveJson?.data?.permissions?.canReview ??
        false

      if (!proposalRes.ok || !liveRes.ok) {
        const message =
          proposalJson?.error?.message ||
          liveJson?.error?.message ||
          'Failed to load project workflows'
        throw new Error(message)
      }

      setCanReview(Boolean(nextCanReview))
      setProposals(proposalJson?.data?.proposals ?? [])
      setLiveWorkflows(liveJson?.data?.workflows ?? [])
    } catch (error) {
      setCanReview(false)
      toast.error(error instanceof Error ? error.message : 'Failed to load project workflows')
    } finally {
      setLoading(false)
    }
  }, [project.id])

  useEffect(() => {
    void load()
  }, [load])

  const proposalGroups = useMemo(() => ({
    proposed: proposals.filter((proposal) => ['draft', 'approved'].includes(proposal.status)),
    history: proposals.filter((proposal) => ['rejected', 'activated', 'archived'].includes(proposal.status)),
  }), [proposals])

  const handleGenerate = useCallback(async () => {
    try {
      setGenerating(true)
      const res = await fetch(`/api/projects/${project.id}/workflows/proposals/generate`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? 'Failed to generate workflow proposals')
      setProposals(json.data.proposals ?? [])
      toast.success('Workflow proposals generated')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate workflow proposals')
    } finally {
      setGenerating(false)
    }
  }, [load, project.id])

  const handleApprove = useCallback(async (proposal: ProjectWorkflowProposal) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/workflows/proposals/${proposal.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ selected_add_ons: selectedAddOns[proposal.id] ?? proposal.suggested_add_ons.map((item) => item.id) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? 'Failed to approve workflow')
      toast.success(json?.data?.activated ? 'Workflow activated' : 'Workflow approved as draft')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve workflow')
    }
  }, [load, project.id, selectedAddOns])

  const handleReject = useCallback(async (proposal: ProjectWorkflowProposal) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/workflows/proposals/${proposal.id}/reject`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? 'Failed to reject workflow')
      toast.success('Workflow proposal rejected')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject workflow')
    }
  }, [load, project.id])

  const handleToggleWorkflow = useCallback(async (workflow: ProjectWorkflowLiveItem, action: 'activate' | 'deactivate') => {
    try {
      const res = await fetch(`/api/projects/${project.id}/workflows/${workflow.workflow_id}/${action}`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? `Failed to ${action} workflow`)
      toast.success(`Workflow ${action}d`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} workflow`)
    }
  }, [load, project.id])

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-transparent p-0 shadow-[0_22px_55px_-28px_rgba(15,23,42,0.55)]">
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 px-6 py-6 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_30%)]" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur">
                <Workflow className="h-3.5 w-3.5" />
                Project-scoped automations
              </div>
              <h3 className="mt-3 text-2xl font-semibold">Governed n8n workflows for {project.name}</h3>
              <p className="mt-1 max-w-3xl text-sm text-white/72">
                Generate a small set of operator-reviewed workflow proposals from approved templates, then activate them inside the project control plane.
              </p>
            </div>
            <Button onClick={() => void handleGenerate()} disabled={generating || !canReview} size="lg" className="relative z-10 gap-2 border border-white/15 bg-white text-slate-950 shadow-[0_14px_30px_-18px_rgba(255,255,255,0.65)] hover:bg-white/90">
              <Sparkles className="h-4 w-4" />
              {generating ? 'Generating…' : 'Generate proposals'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Proposed
            </CardTitle>
            <CardDescription>Review template-based workflows before they are provisioned and activated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <div className="text-sm text-muted-foreground">Loading proposals…</div>}
            {!loading && proposalGroups.proposed.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                <div className="font-medium">No workflow proposals yet</div>
                <div className="mt-1 text-sm text-muted-foreground">Generate proposals to review project-scoped automations.</div>
              </div>
            )}
            {proposalGroups.proposed.map((proposal) => {
              const activeSelections = selectedAddOns[proposal.id] ?? proposal.suggested_add_ons.map((item) => item.id)
              return (
                <motion.div key={proposal.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={riskTone(proposal.risk_tier)}>{proposal.risk_tier} risk</Badge>
                        <Badge variant="outline">{proposal.source_template_id}</Badge>
                        <Badge variant="outline">{proposal.owner_agent}</Badge>
                      </div>
                      <p className="text-base font-medium text-foreground">{proposal.summary}</p>
                      <p className="text-sm text-muted-foreground">Trigger: {proposal.trigger_label}</p>
                    </div>
                    <ApprovalButtons
                      isReviewer={canReview}
                      onApprove={() => void handleApprove(proposal)}
                      onReject={() => void handleReject(proposal)}
                      onDiscuss={() => toast.info('Discussion routing is not wired for workflow proposals yet')}
                      currentStatus={proposal.status === 'activated' ? 'approved' : proposal.status === 'rejected' ? 'rejected' : 'pending'}
                    />
                  </div>

                  <div className="mt-4">
                    <WorkflowMiniGraph trigger={proposal.trigger_label} steps={proposal.step_labels} />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">External effects</div>
                      <div className="flex flex-wrap gap-2">
                        {proposal.external_effects.map((effect) => (
                          <Badge key={effect} variant="secondary">{effect}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Optional add-ons</div>
                      <div className="space-y-2">
                        {proposal.suggested_add_ons.length === 0 && <p className="text-sm text-muted-foreground">No add-ons suggested.</p>}
                        {proposal.suggested_add_ons.map((addOn) => (
                          <label key={addOn.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                            <Checkbox
                              checked={activeSelections.includes(addOn.id)}
                              onCheckedChange={(checked) =>
                                setSelectedAddOns((prev) => {
                                  const current = prev[proposal.id] ?? proposal.suggested_add_ons.map((item) => item.id)
                                  return {
                                    ...prev,
                                    [proposal.id]: checked === true
                                      ? [...new Set([...current, addOn.id])]
                                      : current.filter((item) => item !== addOn.id),
                                  }
                                })
                              }
                            />
                            <div>
                              <div className="text-sm font-medium">{addOn.title}</div>
                              <div className="text-xs text-muted-foreground">{addOn.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Collapsible open={expandedIds.includes(proposal.id)} onOpenChange={() => setExpandedIds((prev) => prev.includes(proposal.id) ? prev.filter((item) => item !== proposal.id) : [...prev, proposal.id])}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="mt-4 px-0 text-sm text-muted-foreground hover:text-foreground">
                        Technical details
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Steps</div>
                          <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                            {proposal.step_labels.map((step) => <li key={step}>• {step}</li>)}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Policy visibility</div>
                          <div className="mt-2 space-y-2 text-sm text-foreground/80">
                            <div>Owner agent: {proposal.owner_agent}</div>
                            <div>Risk tier: {proposal.risk_tier}</div>
                            <div>Status: {proposal.status}</div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Live
            </CardTitle>
            <CardDescription>Activated and draft workflows already synced into automation jobs for this project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <div className="text-sm text-muted-foreground">Loading live workflows…</div>}
            {!loading && liveWorkflows.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <Activity className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                <div className="font-medium">No live workflows yet</div>
                <div className="mt-1 text-sm text-muted-foreground">Approved workflows will appear here once provisioned.</div>
              </div>
            )}
            {liveWorkflows.map((workflow) => (
              <div key={workflow.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{workflow.name}</div>
                      <Badge className={riskTone(workflow.risk_tier)}>{workflow.risk_tier}</Badge>
                      <Badge variant={workflow.enabled ? 'default' : 'secondary'}>{workflow.enabled ? 'active' : 'inactive'}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">Owner: {workflow.owner_agent} · Status: {workflow.last_status ?? 'pending'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => void handleToggleWorkflow(workflow, workflow.enabled ? 'deactivate' : 'activate')} disabled={!canReview}>
                      {workflow.enabled ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <Link href={`/runs?workflow_id=${encodeURIComponent(workflow.workflow_id)}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Last run</div>
                    <div className="mt-1 text-sm font-medium">{workflow.last_run_at ? new Date(workflow.last_run_at).toLocaleString() : 'Not yet run'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Next run</div>
                    <div className="mt-1 text-sm font-medium">{workflow.next_run_at ? new Date(workflow.next_run_at).toLocaleString() : 'Event-driven'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Recent failures</div>
                    <div className="mt-1 text-sm font-medium">{workflow.recent_failures}</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {proposalGroups.history.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Rejected and activated proposals stay visible for audit and operator recall.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {proposalGroups.history.map((proposal) => (
              <div key={proposal.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2">
                  {proposal.status === 'activated' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <ShieldAlert className="h-4 w-4 text-amber-500" />}
                  <div className="font-medium">{proposal.summary}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{proposal.status}</Badge>
                  <Badge className={riskTone(proposal.risk_tier)}>{proposal.risk_tier}</Badge>
                </div>
                {proposal.rejection_reason && (
                  <div className="mt-2 text-sm text-muted-foreground">Reason: {proposal.rejection_reason}</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
