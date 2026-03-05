'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Bot, Cpu, Sparkles, CheckCircle, XCircle, Loader2, Terminal, X, ExternalLink, Clock, Inbox, GitBranch, Square, Trash2, Command, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CommandSurfaceProps, CommandMode, CTODecision, COODecision, AgentTrackerState } from './types';
import { QuickCapture } from '@/features/task-intake/components/quick-capture';
import { useCommandPipeline } from './use-command-pipeline';
import { DecisionPreview } from './decision-preview';
import { extractOutcome } from './execution-result';
import { CustomAgentModal } from '@/components/agent-ops/custom-agent-modal';

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

// Mode Selector Button Component
function ModeButton({
  mode,
  isActive,
  onClick,
}: {
  mode: CommandMode;
  isActive: boolean;
  onClick: () => void;
}) {
  const config = MODE_CONFIG[mode];
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        config.ringColor,
        isActive 
          ? cn(config.bgColor, config.color, 'shadow-sm', config.borderColor, 'border')
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      )}
    >
      <span className={cn(
        'transition-transform duration-200',
        isActive ? 'scale-110' : 'group-hover:scale-105'
      )}>
        {config.icon}
      </span>
      <span className="hidden sm:inline">{config.label}</span>
      {isActive && (
        <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-current opacity-20" />
      )}
    </button>
  );
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
  const [actionRunId, setActionRunId] = useState<string | null>(null);
  const [projectRequiredError, setProjectRequiredError] = useState<string | null>(null);
  const [showShortcutHint, setShowShortcutHint] = useState(true);

  const { execution, isProcessing, streamingText, analyzePrompt, executeCommand, submitPrompt, clearExecution, cancelExecution, history, deleteHistoryEvent } = useCommandPipeline();

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
        const workspaceRes = await fetch('/api/user/workspace');
        if (!workspaceRes.ok) return;
        const workspaceJson = await workspaceRes.json();
        const workspaceId = workspaceJson?.data?.workspace_id ?? workspaceJson?.workspace_id;
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
      } catch {
        // Use defaults if policy cannot be fetched
      }
    };
    loadPolicy();
  }, []);

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

        const result = await submitPrompt(goPrompt, 'auto', goProjectId)
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

      const result = await executeCommand(text, mode, analysis.plan, analysis.decision, { projectId: selectedProjectId });
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
    const result = await submitPrompt(text, mode, selectedProjectId);

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
  }, [mode, isProcessing, analyzePrompt, submitPrompt, onExecutionComplete, clearExecution, executionPolicy, executeCommand, router, shouldAskProjectBrief, selectedProjectId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmitText(prompt);
  }, [prompt, handleSubmitText]);

  const handleApprove = useCallback(async () => {
    if (!pendingDecision || !pendingPlan) return;

    const result = await executeCommand(prompt, mode, pendingPlan, pendingDecision, { projectId: selectedProjectId });
    
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
  }, [pendingDecision, pendingPlan, prompt, mode, executeCommand, onExecutionComplete, router, selectedProjectId]);

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
          {/* Top row: Title and project selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl',
                'bg-gradient-to-br from-primary/10 to-primary/5',
                'border border-primary/20 shadow-sm'
              )}>
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg leading-tight">Command Surface</h2>
                <p className="text-xs text-muted-foreground">Your AI-powered workspace assistant</p>
              </div>
              {runningCount > 0 && (
                <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 bg-teal-500/10 text-teal-600 border-teal-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                  </span>
                  {runningCount} running
                </Badge>
              )}
            </div>
            
            {/* Project Selector */}
            <div className="flex items-center gap-2">
              <Select
                value={selectedProjectId ?? 'none'}
                onValueChange={(v) => {
                  setSelectedProjectId(v === 'none' ? null : v)
                  if (v !== 'none') setProjectRequiredError(null)
                }}
              >
                <SelectTrigger
                  className={cn(
                    'h-9 text-sm w-[160px] bg-background/50',
                    projectRequiredError && 'border-rose-500 focus-visible:ring-rose-500'
                  )}
                >
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="truncate max-w-[140px] block">{p.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={handleSyncGit}
                disabled={isSyncingGit}
                title="Sync git repos as projects"
              >
                {isSyncingGit ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GitBranch className="h-4 w-4" />
                )}
              </Button>
              <CustomAgentModal />
            </div>
          </div>

          {/* Mode Selector - Horizontal Segmented Control */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-muted/50 border border-border/50">
            {(Object.keys(MODE_CONFIG) as CommandMode[]).map((m) => (
              <ModeButton
                key={m}
                mode={m}
                isActive={mode === m}
                onClick={() => setMode(m)}
              />
            ))}
          </div>

          {projectRequiredError && (
            <div className="flex items-center gap-2 text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-800">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {projectRequiredError}
            </div>
          )}
        </div>

        {/* Decision Preview */}
        {projectBriefOpen && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 space-y-4 dark:border-amber-800 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <Lightbulb className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Before I create this project, define the brief</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This keeps creation actionable instead of generating a generic implementation plan.
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              <Input
                placeholder="Project name"
                value={projectBrief.name}
                onChange={(e) => setProjectBrief(prev => ({ ...prev, name: e.target.value }))}
                className="bg-background/50"
              />
              <Textarea
                placeholder="Primary goal (what success looks like)"
                value={projectBrief.goal}
                onChange={(e) => setProjectBrief(prev => ({ ...prev, goal: e.target.value }))}
                rows={2}
                className="bg-background/50 resize-none"
              />
              <Textarea
                placeholder="Scope (key deliverables, constraints)"
                value={projectBrief.scope}
                onChange={(e) => setProjectBrief(prev => ({ ...prev, scope: e.target.value }))}
                rows={2}
                className="bg-background/50 resize-none"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Timeline (e.g. 2 weeks)"
                  value={projectBrief.timeline}
                  onChange={(e) => setProjectBrief(prev => ({ ...prev, timeline: e.target.value }))}
                  className="bg-background/50"
                />
                <Input
                  placeholder="Owner"
                  value={projectBrief.owner}
                  onChange={(e) => setProjectBrief(prev => ({ ...prev, owner: e.target.value }))}
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProjectBriefOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleProjectBriefSubmit}>
                Continue
              </Button>
            </div>
          </div>
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
        {history.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent Actions
            </p>
            <div className="space-y-2">
              {history.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-xs">
                  <span className={cn(
                    'mt-0.5 h-1.5 w-1.5 rounded-full',
                    item.status === 'completed' && 'bg-emerald-400',
                    item.status === 'failed' && 'bg-rose-400',
                    item.status === 'running' && 'bg-amber-400'
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground/90">{item.prompt}</p>
                    <p className="truncate text-muted-foreground/80">
                      {normalizeError(item.outputPreview) || (item.status === 'running' ? 'Running...' : 'No output')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.runId && item.status === 'running' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={actionRunId === (item.runId ?? item.id)}
                        onClick={() => stopRun(item.runId!)}
                        title="Stop run"
                      >
                        <Square className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-red-600 hover:text-red-700"
                      disabled={actionRunId === (item.runId ?? item.id)}
                      onClick={() => deleteRecentAction(item)}
                      title="Delete action"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    {item.runId && (
                      <button
                        className="text-teal-400 hover:underline"
                        onClick={() => router.push(`/runs/${item.runId}`)}
                      >
                        Run
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Form - or Quick Capture in intake mode */}
        {mode === 'intake' ? (
          <QuickCapture
            projectId={contextId}
            compact={true}
            className="border-0 shadow-none"
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Input
                data-command-input="true"
                placeholder={currentMode.placeholder}
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setShowShortcutHint(!e.target.value);
                }}
                onFocus={() => setShowShortcutHint(!prompt)}
                onBlur={() => setShowShortcutHint(false)}
                disabled={isProcessing || !!pendingDecision}
                className={cn(
                  'w-full min-h-14 pl-4 pr-24 text-base',
                  'bg-background/80 backdrop-blur-sm',
                  'border-border/60 focus-visible:border-primary/50',
                  'shadow-inner transition-all duration-200',
                  'placeholder:text-muted-foreground/60'
                )}
              />
              {/* Keyboard shortcut hint */}
              {showShortcutHint && !prompt && !isProcessing && !pendingDecision && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-muted-foreground/50 pointer-events-none">
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted border border-border/50 font-sans text-[10px]">
                    <Command className="h-3 w-3" />
                    <span>K</span>
                  </kbd>
                  <span className="hidden sm:inline">to focus</span>
                </div>
              )}
              {/* Send button inside input */}
              <Button 
                type="submit" 
                disabled={isProcessing || !prompt.trim() || !!pendingDecision}
                size="icon"
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10',
                  'transition-all duration-200',
                  prompt.trim() && !isProcessing && 'opacity-100 scale-100',
                  (!prompt.trim() || isProcessing) && 'opacity-50 scale-95'
                )}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Action buttons row */}
            <div className="flex items-center justify-between">
              {/* Quick Suggestions */}
              {!prompt && !isProcessing && !pendingDecision && (
                <div className="flex flex-wrap gap-2">
                  {currentMode.examples.slice(0, 3).map((example, index) => (
                    <button
                      key={index}
                      type="button"
                      className={cn(
                        'text-xs px-3 py-1.5 rounded-full transition-all duration-200',
                        currentMode.bgColor,
                        currentMode.color,
                        'hover:shadow-sm border border-transparent hover:border-current/20'
                      )}
                      onClick={() => { 
                        setPrompt(example); 
                        handleSubmitText(example); 
                      }}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Stop button when processing */}
              <div className="ml-auto">
                {isProcessing && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={cancelExecution}
                    className="gap-1.5"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
