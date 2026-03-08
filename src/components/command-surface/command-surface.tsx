'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Cpu, Sparkles, CheckCircle, XCircle, Loader2, Terminal, X, ExternalLink, Clock, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CommandSurfaceProps, CommandMode, CTODecision, COODecision, AgentTrackerState } from './types';
import { QuickCapture } from '@/features/task-intake/components/quick-capture';
import { useCommandPipeline } from './use-command-pipeline';
import { DecisionPreview } from './decision-preview';
import { extractOutcome } from './execution-result';
import { ExecutionLogPanel } from './execution-log-panel';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { usePlanningAgents } from '@/components/planning-agents/use-planning-agents';
import { ProjectBriefPanel } from './components/project-brief-panel';
import { RecentActionsPanel } from './components/recent-actions-panel';
import { CommandSurfaceHeader } from './components/command-surface-header';
import { CommandComposer } from './components/command-composer';

function normalizeError(err: unknown): string {
  if (!err) return 'Unknown error'
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    if (typeof e.message === 'string') return e.message
    if (typeof e.error === 'string') return e.error
    return JSON.stringify(err)
  }
  return String(err)
}

type ExecutionPolicy = {
  mode: 'auto' | 'semi_auto';
  confidenceMinForAuto: number;
  requireApprovalForChanges: boolean;
};

type RuntimeProfileSummary = {
  workspaceId: string | null;
  planModel: string | null;
  executeModel: string | null;
  reviewModel: string | null;
  customAgentOverrides: number;
  toolMode: string | null;
};

type ProjectBriefDraft = {
  name: string;
  goal: string;
  scope: string;
  timeline: string;
  owner: string;
};

const MODE_CONFIG: Record<CommandMode, { 
  label: string; 
  icon: React.ReactNode; 
  color: string; 
  bgColor: string;
  borderColor: string;
  ringColor: string;
  description: string;
  placeholder: string;
  examples: string[];
}> = {
  cto: {
    label: 'CTO',
    icon: <Terminal className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    ringColor: 'ring-blue-500/20',
    description: 'Architecture & Implementation',
    placeholder: 'e.g., Fix hydration errors, refactor API client, implement dark mode...',
    examples: ['Fix hydration errors', 'Implement dark mode', 'Refactor API client']
  },
  coo: {
    label: 'COO',
    icon: <Cpu className="h-4 w-4" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    ringColor: 'ring-emerald-500/20',
    description: 'Operations & Scheduling',
    placeholder: 'e.g., Send daily summary, schedule weekly reports, monitor health...',
    examples: ['Daily 7am summary', 'Weekly Monday report', 'Hourly health check']
  },
  auto: {
    label: 'Auto',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    ringColor: 'ring-amber-500/20',
    description: 'Smart detection',
    placeholder: 'What would you like me to do? I\'ll figure out the best approach...',
    examples: ['Create a new project', 'Schedule reminder', 'Review code']
  },
  intake: {
    label: 'Intake',
    icon: <Inbox className="h-4 w-4" />,
    color: 'text-violet-600',
    bgColor: 'bg-violet-500/10 hover:bg-violet-500/20',
    borderColor: 'border-violet-500/30',
    ringColor: 'ring-violet-500/20',
    description: 'Quick task capture',
    placeholder: 'Capture a quick task, idea, or note...',
    examples: ['Follow up with team', 'Research competitors', 'Update documentation']
  }
};

function AgentTrackerBar({
  tracker,
  onViewRun,
  onDismiss,
}: {
  tracker: AgentTrackerState
  onViewRun: () => void
  onDismiss: () => void
}) {
  const icons = {
    pending: <Clock className="h-4 w-4 text-amber-400" />,
    running: <Loader2 className="h-4 w-4 text-teal-400 animate-spin" />,
    completed: <CheckCircle className="h-4 w-4 text-emerald-400" />,
    failed: <XCircle className="h-4 w-4 text-rose-400" />,
    cancelled: <XCircle className="h-4 w-4 text-muted-foreground" />,
  }
  const labels = {
    pending: 'Agent queued...',
    running: tracker.runner ? `${tracker.runner} working${tracker.currentStep ? `: ${tracker.currentStep}` : '...'}` : 'Agent working...',
    completed: 'Agent finished',
    failed: 'Agent failed',
    cancelled: 'Agent cancelled',
  }
  const isTerminal = ['completed', 'failed', 'cancelled'].includes(tracker.status)

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-sm">
      {icons[tracker.status]}
      <span className="flex-1 text-muted-foreground">{labels[tracker.status]}</span>
      {tracker.outputPreview && (
        <span className="max-w-[200px] truncate text-xs text-muted-foreground/70">{normalizeError(tracker.outputPreview)}</span>
      )}
      {isTerminal && (
        <button onClick={onViewRun} className="text-xs text-teal-400 hover:underline">
          View run
        </button>
      )}
      <button onClick={onDismiss} className="ml-1 text-muted-foreground/50 hover:text-muted-foreground">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export function CommandSurface({
  context = 'dashboard',
  contextId,
  defaultMode = 'auto',
  onExecutionComplete,
  className
}: CommandSurfaceProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<CommandMode>(defaultMode);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(contextId ?? null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);
  const [isSyncingGit, setIsSyncingGit] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<CTODecision | COODecision | null>(null);
  const [pendingPlan, setPendingPlan] = useState<ReturnType<typeof analyzePrompt>['plan'] | null>(null);
  const [projectBriefOpen, setProjectBriefOpen] = useState(false);
  const [projectBriefPrompt, setProjectBriefPrompt] = useState('');
  const [projectBrief, setProjectBrief] = useState<ProjectBriefDraft>({
    name: '',
    goal: '',
    scope: '',
    timeline: '',
    owner: '',
  });
  const [executionPolicy, setExecutionPolicy] = useState<ExecutionPolicy>({
    mode: 'auto',
    confidenceMinForAuto: 0.75,
    requireApprovalForChanges: false,
  });
  const [runtimeProfile, setRuntimeProfile] = useState<RuntimeProfileSummary>({
    workspaceId: null,
    planModel: null,
    executeModel: null,
    reviewModel: null,
    customAgentOverrides: 0,
    toolMode: null,
  });
  const [actionRunId, setActionRunId] = useState<string | null>(null);
  const [projectRequiredError, setProjectRequiredError] = useState<string | null>(null);
  const [showShortcutHint, setShowShortcutHint] = useState(true);
  const { workspaceId } = useCurrentWorkspace();
  const {
    agents: availableAgents,
    selectedIds: selectedAgentIds,
    setSelectedIds,
    selectedAgents: selectedPlanningAgents,
    isSaving: savingAgentDefaults,
    saveDefaults: saveWorkspaceAgentDefaults,
  } = usePlanningAgents(workspaceId);

  const { execution, isProcessing, streamingText, executionEvents, analyzePrompt, executeCommand, submitPrompt, clearExecution, cancelExecution, history, deleteHistoryEvent } = useCommandPipeline();

  const [runningCount, setRunningCount] = useState(0)
  const refreshRunningCount = useCallback(async () => {
    try {
      const res = await fetch('/api/runs/stats')
      const json = await res.json()
      setRunningCount(json.data?.running ?? 0)
    } catch {}
  }, [])

  const emitRunsMutated = useCallback(() => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event('runs:mutated'))
  }, [])

  useEffect(() => {
    refreshRunningCount()
    const interval = setInterval(refreshRunningCount, 15_000)
    return () => clearInterval(interval)
  }, [refreshRunningCount])

  useEffect(() => {
    const loadPolicy = async () => {
      try {
        if (!workspaceId) return;

        const policyRes = await fetch(`/api/workspaces/${workspaceId}/ai-policy`);
        if (!policyRes.ok) return;
        const policyJson = await policyRes.json();
        const policy = policyJson?.data ?? policyJson;

        const mode = policy?.execution_mode === 'semi_auto' ? 'semi_auto' : 'auto';
        const threshold = Number(policy?.approval_thresholds?.confidence_min_for_auto ?? 0.75);
        const requireApprovalForChanges = Boolean(policy?.constraints?.require_approval_for_changes);

        setExecutionPolicy({
          mode,
          confidenceMinForAuto: Number.isFinite(threshold) ? threshold : 0.75,
          requireApprovalForChanges,
        });
        setRuntimeProfile({
          workspaceId,
          planModel: policy?.model_profiles?.command_surface_plan?.model ?? policy?.model_profiles?.pipeline_plan?.model ?? null,
          executeModel: policy?.model_profiles?.command_surface_execute?.model ?? policy?.model_profiles?.pipeline_execute?.model ?? null,
          reviewModel: policy?.model_profiles?.command_surface_review?.model ?? policy?.model_profiles?.pipeline_review?.model ?? null,
          customAgentOverrides: Object.keys(policy?.agent_profiles ?? {}).length,
          toolMode: policy?.tool_profiles?.command_surface_execute?.tool_mode ?? null,
        });
      } catch {
        // Use defaults if policy cannot be fetched
      }
    };
    loadPolicy();
  }, [workspaceId]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.querySelector('[data-command-input="true"]') as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) return;
      const json = await res.json();
      const list = (json.data?.projects ?? json.data ?? []) as { id: string; name: string }[];
      setProjects(Array.isArray(list) ? list : []);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSyncGit = useCallback(async () => {
    setIsSyncingGit(true);
    try {
      const res = await fetch('/api/projects/sync-git', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Synced ${json.synced?.length ?? 0} git repos`);
        await fetchProjects();
      } else {
        toast.error(json.error ?? 'Git sync failed');
      }
    } catch {
      toast.error('Git sync failed');
    } finally {
      setIsSyncingGit(false);
    }
  }, [fetchProjects]);

  const outcome = useMemo(() => {
    if (!execution || execution.status !== 'completed') return null;
    return extractOutcome(execution.plan.steps);
  }, [execution]);

  const shouldAskProjectBrief = useCallback((text: string) => {
    const trimmed = text.trim();
    const isProjectIntent = /\b(create|new|start|launch)\s+project\b/i.test(trimmed) || /\bproject called\b/i.test(trimmed);
    if (!isProjectIntent) return false;
    const hasNameSignal = /\b(project called|project named)\b/i.test(trimmed) || /["'].+["']/.test(trimmed);
    const isBarePrompt = /^(create|new|start|launch)\s+(a\s+)?project$/i.test(trimmed) || trimmed.split(/\s+/).length <= 5;
    return !hasNameSignal || isBarePrompt;
  }, []);

  const handleSubmitText = useCallback(async (text: string, options?: { skipBrief?: boolean }) => {
    if (!text.trim() || isProcessing) return;

    clearExecution();
    const goMatch = text.trim().match(/^\/go\s+([0-9a-f-]{36})$/i)
    if (goMatch) {
      try {
        const res = await fetch('/api/agent-ops/go', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: goMatch[1] }),
        })
        const json = await res.json()
        if (!res.ok || !json?.ok) {
          const msg = json?.error?.message ?? json?.error ?? 'Failed to trigger /go'
          toast.error(typeof msg === 'string' ? msg : 'Failed to trigger /go')
          return
        }

        const body = json?.data?.next_action?.body as Record<string, unknown> | undefined
        const goPrompt = typeof body?.prompt === 'string' ? body.prompt : ''
        const goProjectId = typeof body?.project_id === 'string' ? body.project_id : null

        if (!goPrompt) {
          toast.error('No prompt generated for /go')
          return
        }

        const result = await submitPrompt(goPrompt, 'auto', goProjectId, undefined, { selectedAgents: selectedPlanningAgents })
        if (result.status === 'failed') {
          toast.error(normalizeError(result.error) || 'Command failed')
        } else {
          toast.success('Human-gated /go dispatched')
        }
        onExecutionComplete?.(result)
        setPrompt('')
        return
      } catch {
        toast.error('Failed to trigger /go')
        return
      }
    }

    // Check for injection / generate decision preview before streaming
    const analysis = analyzePrompt(text, mode);
    setPendingPlan(analysis.plan);

    const requiresProject =
      (analysis.plan.intent === 'create_task' ||
        analysis.plan.intent === 'fix_issue' ||
        analysis.plan.intent === 'architect_feature') &&
      !selectedProjectId;
    if (requiresProject) {
      const msg = 'Select a project before creating or running implementation work.'
      setProjectRequiredError(msg)
      toast.error(msg)
      return
    }
    setProjectRequiredError(null)

    if (analysis.injectionDetected) {
      toast.error('Input rejected: potentially unsafe content detected');
      return;
    }

    if (!options?.skipBrief && analysis.plan.intent === 'create_project' && shouldAskProjectBrief(text)) {
      const suggestedName =
        analysis.decision && 'projects' in analysis.decision && analysis.decision.projects?.[0]?.name
          ? analysis.decision.projects[0].name
          : '';
      setProjectBrief({
        name: suggestedName && suggestedName !== 'New Project' ? suggestedName : '',
        goal: '',
        scope: '',
        timeline: '',
        owner: '',
      });
      setProjectBriefPrompt(text);
      setProjectBriefOpen(true);
      return;
    }

    if (analysis.decision) {
      const lowConfidence = analysis.plan.confidence < executionPolicy.confidenceMinForAuto;
      const needsApproval = executionPolicy.mode === 'semi_auto' || lowConfidence || (executionPolicy.requireApprovalForChanges && analysis.plan.requiresApproval);

      if (needsApproval) {
        setPendingDecision(analysis.decision);
        return; // Wait for user approval in the decision dialog
      }

      const result = await executeCommand(text, mode, analysis.plan, analysis.decision, {
        projectId: selectedProjectId,
        selectedAgents: selectedPlanningAgents,
      });
      if (result.status === 'completed') {
        const o = extractOutcome(result.plan.steps);
        toast.success(o.label, {
          duration: 10000,
          action: { label: o.viewLabel, onClick: () => router.push(o.viewRoute) },
        });
      } else {
        const errMsg = normalizeError(result.error) || 'Execution failed'
        if (/missing required field:\s*project_id|project_id/i.test(errMsg)) {
          setProjectRequiredError('Please select a project from the dropdown above.')
          toast.error('Please select a project from the dropdown above.')
        } else {
          toast.error(errMsg);
        }
      }
      onExecutionComplete?.(result);
      setPendingDecision(null);
      setPendingPlan(null);
      setPrompt('');
      return;
    }

    // Stream the command through ClawdBot
    const result = await submitPrompt(text, mode, selectedProjectId, undefined, { selectedAgents: selectedPlanningAgents });

    if (result.status === 'failed') {
      const errMsg = normalizeError(result.error) || 'Command failed'
      if (/missing required field:\s*project_id|project_id/i.test(errMsg)) {
        setProjectRequiredError('Please select a project from the dropdown above.')
        toast.error('Please select a project from the dropdown above.')
      } else {
        toast.error(errMsg);
      }
    }

    onExecutionComplete?.(result);
    setPrompt('');
  }, [mode, isProcessing, analyzePrompt, submitPrompt, onExecutionComplete, clearExecution, executionPolicy, executeCommand, router, shouldAskProjectBrief, selectedProjectId, selectedPlanningAgents]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmitText(prompt);
  }, [prompt, handleSubmitText]);

  const handleApprove = useCallback(async () => {
    if (!pendingDecision || !pendingPlan) return;

    const result = await executeCommand(prompt, mode, pendingPlan, pendingDecision, {
      projectId: selectedProjectId,
      selectedAgents: selectedPlanningAgents,
    });
    
    if (result.status === 'completed') {
      const o = extractOutcome(result.plan.steps);
      toast.success(o.label, {
        duration: 10000,
        action: { label: o.viewLabel, onClick: () => router.push(o.viewRoute) },
      });
    } else {
      toast.error(normalizeError(result.error) || 'Execution failed');
    }

    onExecutionComplete?.(result);
    setPendingDecision(null);
    setPendingPlan(null);
    setPrompt('');
  }, [pendingDecision, pendingPlan, prompt, mode, executeCommand, onExecutionComplete, router, selectedProjectId, selectedPlanningAgents]);

  const handleReject = useCallback(() => {
    setPendingDecision(null);
    setPendingPlan(null);
    toast.info('Decision rejected');
  }, []);

  const handleProjectBriefSubmit = useCallback(async () => {
    if (!projectBrief.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    const enriched = [
      `Create project called "${projectBrief.name.trim()}".`,
      projectBrief.goal.trim() ? `Goal: ${projectBrief.goal.trim()}.` : '',
      projectBrief.scope.trim() ? `Scope: ${projectBrief.scope.trim()}.` : '',
      projectBrief.timeline.trim() ? `Timeline: ${projectBrief.timeline.trim()}.` : '',
      projectBrief.owner.trim() ? `Owner: ${projectBrief.owner.trim()}.` : '',
      `Original request: ${projectBriefPrompt.trim()}`,
    ].filter(Boolean).join(' ');

    setProjectBriefOpen(false);
    await handleSubmitText(enriched, { skipBrief: true });
  }, [handleSubmitText, projectBrief, projectBriefPrompt]);

  const currentMode = MODE_CONFIG[mode];

  const stopRun = useCallback(async (runId: string) => {
    setActionRunId(runId);
    try {
      const res = await fetch(`/api/runs/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', summary: 'Stopped from Command Surface' }),
      });
      if (!res.ok) throw new Error('Failed to stop run');
      await refreshRunningCount()
      emitRunsMutated()
      toast.success('Run stopped');
    } catch {
      toast.error('Could not stop run');
    } finally {
      setActionRunId(null);
    }
  }, [emitRunsMutated, refreshRunningCount]);

  const deleteRecentAction = useCallback(async (item: { id: string; runId?: string }) => {
    const actionId = item.runId ?? item.id
    setActionRunId(actionId);
    try {
      if (item.runId) {
        const res = await fetch(`/api/runs/${item.runId}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 404) throw new Error('Failed to delete run');
      }

      await deleteHistoryEvent({ historyId: item.id, runId: item.runId });

      if (item.runId) {
        await refreshRunningCount()
        emitRunsMutated()
      }
      toast.success('Action deleted');
    } catch {
      toast.error('Could not delete action');
    } finally {
      setActionRunId(null);
    }
  }, [deleteHistoryEvent, emitRunsMutated, refreshRunningCount]);

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl',
      'bg-gradient-to-br from-background via-background to-muted/30',
      'border border-l-0 border-border/50 shadow-xl shadow-black/5',
      'transition-all duration-300 ease-out',
      'hover:shadow-2xl hover:shadow-black/8',
      className
    )}>
      {/* Left accent gradient border */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1.5',
        'bg-gradient-to-b',
        mode === 'cto' && 'from-blue-500 via-blue-400 to-blue-600',
        mode === 'coo' && 'from-emerald-500 via-emerald-400 to-emerald-600',
        mode === 'auto' && 'from-amber-500 via-amber-400 to-amber-600',
        mode === 'intake' && 'from-violet-500 via-violet-400 to-violet-600',
        'transition-all duration-300'
      )} />
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative p-5 sm:p-6 space-y-5">
        {/* Header with Mode Selector */}
        <div className="flex flex-col gap-4">
          <CommandSurfaceHeader
            mode={mode}
            modeConfig={MODE_CONFIG}
            runningCount={runningCount}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={(value) => {
              setSelectedProjectId(value)
              if (value) setProjectRequiredError(null)
            }}
            projects={projects}
            projectRequiredError={projectRequiredError}
            isSyncingGit={isSyncingGit}
            handleSyncGit={() => void handleSyncGit()}
            executionPolicy={executionPolicy}
            runtimeProfile={runtimeProfile}
            agents={availableAgents}
            selectedIds={selectedAgentIds}
            selectedAgents={selectedPlanningAgents}
            agentPickerOpen={agentPickerOpen}
            setAgentPickerOpen={setAgentPickerOpen}
            setSelectedIds={setSelectedIds}
            saveWorkspaceAgentDefaults={() => void saveWorkspaceAgentDefaults()}
            savingAgentDefaults={savingAgentDefaults}
            workspaceId={workspaceId}
            setMode={setMode}
          />

          {projectRequiredError && (
            <div className="flex items-center gap-2 text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-800">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {projectRequiredError}
            </div>
          )}
        </div>

        {/* Decision Preview */}
        {projectBriefOpen && (
          <ProjectBriefPanel
            projectBrief={projectBrief}
            setProjectBrief={setProjectBrief}
            onCancel={() => setProjectBriefOpen(false)}
            onContinue={handleProjectBriefSubmit}
          />
        )}

        {pendingDecision && (
          <DecisionPreview
            decision={pendingDecision}
            mode={mode}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {/* Execution Status + Streaming Output */}
        {execution && !pendingDecision && (
          <div className="space-y-3">
            {/* Status bar */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {execution.status === 'executing' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                    <span className="text-muted-foreground">Processing...</span>
                  </>
                )}
                {execution.status === 'completed' && (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-500">Done</span>
                  </>
                )}
                {execution.status === 'failed' && (
                  <>
                    <XCircle className="h-4 w-4 text-rose-400" />
                    <span className="text-rose-400">Failed</span>
                  </>
                )}
              </div>
              {(execution.status === 'completed' || execution.status === 'failed') && (
                <button
                  onClick={clearExecution}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Streaming text output */}
            {streamingText && (
              <div className="rounded-lg bg-muted/40 border border-border/30 p-4 text-sm text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                {streamingText}
                {execution.status === 'executing' && (
                  <span className="inline-block w-1 h-4 bg-teal-400 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            )}

            {/* Error details (when no streaming text was produced) */}
            {execution.status === 'failed' && execution.error && !streamingText && (
              <div className="rounded-lg bg-rose-950/30 border border-rose-800/50 p-4 text-sm text-rose-300 whitespace-pre-wrap">
                {normalizeError(execution.error)}
              </div>
            )}

            {/* Indeterminate progress bar while streaming */}
            {execution.status === 'executing' && !streamingText && (
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 animate-pulse w-full" />
              </div>
            )}

            <ExecutionLogPanel
              events={executionEvents}
              running={execution.status === 'executing'}
            />
          </div>
        )}

        {/* Agent Tracker Bar */}
        {execution?.agentTracker && (
          <AgentTrackerBar
            tracker={execution.agentTracker}
            onViewRun={() => router.push(`/runs/${execution.agentTracker!.runId}`)}
            onDismiss={clearExecution}
          />
        )}

        {/* Persistent command history */}
        <RecentActionsPanel
          history={history}
          actionRunId={actionRunId}
          normalizeError={normalizeError}
          onStop={stopRun}
          onDelete={deleteRecentAction}
        />

        {/* Input Form - or Quick Capture in intake mode */}
        {mode === 'intake' ? (
          <QuickCapture
            projectId={contextId}
            compact={true}
            className="border-0 shadow-none"
          />
        ) : (
          <CommandComposer
            mode={mode}
            prompt={prompt}
            setPrompt={setPrompt}
            showShortcutHint={showShortcutHint}
            setShowShortcutHint={setShowShortcutHint}
            isProcessing={isProcessing}
            pendingDecision={Boolean(pendingDecision)}
            handleSubmit={handleSubmit}
            handleSubmitText={(text) => {
              void handleSubmitText(text)
            }}
            cancelExecution={cancelExecution}
            placeholder={currentMode.placeholder}
            examples={currentMode.examples}
            bgColor={currentMode.bgColor}
            color={currentMode.color}
          />
        )}
      </div>
    </div>
  );
}
