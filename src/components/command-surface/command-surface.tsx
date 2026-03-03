'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Bot, Cpu, Sparkles, CheckCircle, XCircle, Loader2, Terminal, ChevronDown, X, ExternalLink, Clock, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CommandSurfaceProps, CommandMode, CTODecision, COODecision, AgentTrackerState } from './types';
import { QuickCapture } from '@/features/task-intake/components/quick-capture';
import { useCommandPipeline } from './use-command-pipeline';
import { DecisionPreview } from './decision-preview';
import { extractOutcome } from './execution-result';

type ExecutionPolicy = {
  mode: 'auto' | 'semi_auto';
  confidenceMinForAuto: number;
  requireApprovalForChanges: boolean;
};

const MODE_CONFIG: Record<CommandMode, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  cto: {
    label: 'CTO',
    icon: <Terminal className="h-4 w-4" />,
    color: 'text-blue-500',
    description: 'Architecture & Implementation'
  },
  coo: {
    label: 'COO',
    icon: <Cpu className="h-4 w-4" />,
    color: 'text-emerald-500',
    description: 'Operations & Scheduling'
  },
  auto: {
    label: 'Auto',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-amber-500',
    description: 'Smart detection'
  },
  intake: {
    label: 'Intake',
    icon: <Inbox className="h-4 w-4" />,
    color: 'text-violet-500',
    description: 'Quick task capture'
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
    <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm">
      {icons[tracker.status]}
      <span className="flex-1 text-muted-foreground">{labels[tracker.status]}</span>
      {tracker.outputPreview && (
        <span className="max-w-[200px] truncate text-xs text-muted-foreground/70">{tracker.outputPreview}</span>
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
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<CTODecision | COODecision | null>(null);
  const [pendingPlan, setPendingPlan] = useState<ReturnType<typeof analyzePrompt>['plan'] | null>(null);
  const [executionPolicy, setExecutionPolicy] = useState<ExecutionPolicy>({
    mode: 'auto',
    confidenceMinForAuto: 0.75,
    requireApprovalForChanges: false,
  });

  const { execution, isProcessing, streamingText, analyzePrompt, executeCommand, submitPrompt, clearExecution, history } = useCommandPipeline();

  const [runningCount, setRunningCount] = useState(0)
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/runs/stats')
        const json = await res.json()
        setRunningCount(json.data?.running ?? 0)
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 15_000)
    return () => clearInterval(interval)
  }, [])

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

  const outcome = useMemo(() => {
    if (!execution || execution.status !== 'completed') return null;
    return extractOutcome(execution.plan.steps);
  }, [execution]);

  const handleSubmitText = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return;

    clearExecution();

    // Check for injection / generate decision preview before streaming
    const analysis = analyzePrompt(text, mode);
    setPendingPlan(analysis.plan);

    if (analysis.injectionDetected) {
      toast.error('Input rejected: potentially unsafe content detected');
      return;
    }

    if (analysis.decision) {
      const lowConfidence = analysis.plan.confidence < executionPolicy.confidenceMinForAuto;
      const needsApproval = executionPolicy.mode === 'semi_auto' || lowConfidence || (executionPolicy.requireApprovalForChanges && analysis.plan.requiresApproval);

      if (needsApproval) {
        setPendingDecision(analysis.decision);
        return; // Wait for user approval in the decision dialog
      }

      const result = await executeCommand(text, mode, analysis.plan, analysis.decision);
      if (result.status === 'completed') {
        const o = extractOutcome(result.plan.steps);
        toast.success(o.label, {
          duration: 10000,
          action: { label: o.viewLabel, onClick: () => router.push(o.viewRoute) },
        });
      } else {
        toast.error(result.error || 'Execution failed');
      }
      onExecutionComplete?.(result);
      setPendingDecision(null);
      setPendingPlan(null);
      setPrompt('');
      return;
    }

    // Stream the command through ClawdBot
    const result = await submitPrompt(text, mode);

    if (result.status === 'failed') {
      toast.error(result.error || 'Command failed');
    }

    onExecutionComplete?.(result);
    setPrompt('');
  }, [mode, isProcessing, analyzePrompt, submitPrompt, onExecutionComplete, clearExecution, executionPolicy, executeCommand, router]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmitText(prompt);
  }, [prompt, handleSubmitText]);

  const handleApprove = useCallback(async () => {
    if (!pendingDecision || !pendingPlan) return;

    const result = await executeCommand(prompt, mode, pendingPlan, pendingDecision);
    
    if (result.status === 'completed') {
      const o = extractOutcome(result.plan.steps);
      toast.success(o.label, {
        duration: 10000,
        action: { label: o.viewLabel, onClick: () => router.push(o.viewRoute) },
      });
    } else {
      toast.error(result.error || 'Execution failed');
    }

    onExecutionComplete?.(result);
    setPendingDecision(null);
    setPendingPlan(null);
    setPrompt('');
  }, [pendingDecision, pendingPlan, prompt, mode, executeCommand, onExecutionComplete]);

  const handleReject = useCallback(() => {
    setPendingDecision(null);
    setPendingPlan(null);
    toast.info('Decision rejected');
  }, []);

  const currentMode = MODE_CONFIG[mode];

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold">Command Surface</span>
            {runningCount > 0 && (
              <span className="ml-2 rounded-full bg-teal-500/20 px-2 py-0.5 text-xs font-medium text-teal-400">
                {runningCount} running
              </span>
            )}
            {context !== 'dashboard' && (
              <Badge variant="secondary" className="text-xs">
                {context}
              </Badge>
            )}
          </div>
          
          {/* Mode Selector */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className={cn('gap-2', currentMode.color)}
              onClick={() => setShowModeSelector(!showModeSelector)}
            >
              {currentMode.icon}
              {currentMode.label}
              <ChevronDown className={cn('h-3 w-3 transition-transform', showModeSelector && 'rotate-180')} />
            </Button>
            
            {showModeSelector && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-popover border rounded-md shadow-lg z-10 py-1">
                {(Object.keys(MODE_CONFIG) as CommandMode[]).map((m) => (
                  <button
                    key={m}
                    className={cn(
                      'w-full px-3 py-2 flex items-center gap-2 hover:bg-accent text-left',
                      mode === m && 'bg-accent'
                    )}
                    onClick={() => {
                      setMode(m);
                      setShowModeSelector(false);
                    }}
                  >
                    <span className={MODE_CONFIG[m].color}>{MODE_CONFIG[m].icon}</span>
                    <div>
                      <div className="text-sm font-medium">{MODE_CONFIG[m].label}</div>
                      <div className="text-xs text-muted-foreground">{MODE_CONFIG[m].description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Decision Preview */}
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
          <div className="space-y-2">
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
              <div className="rounded-md bg-muted/40 border border-border/30 p-3 text-sm text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                {streamingText}
                {execution.status === 'executing' && (
                  <span className="inline-block w-1 h-4 bg-teal-400 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            )}

            {/* Error details (when no streaming text was produced) */}
            {execution.status === 'failed' && execution.error && !streamingText && (
              <div className="rounded-md bg-rose-950/30 border border-rose-800/50 p-3 text-sm text-rose-300 whitespace-pre-wrap">
                {execution.error}
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
          <div className="rounded-md border border-border/50 bg-muted/20 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                      {item.outputPreview || (item.status === 'running' ? 'Running...' : 'No output')}
                    </p>
                  </div>
                  {item.runId && (
                    <button
                      className="text-teal-400 hover:underline"
                      onClick={() => router.push(`/runs/${item.runId}`)}
                    >
                      Run
                    </button>
                  )}
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
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder={
                mode === 'cto' 
                  ? "e.g., Fix hydration errors in login page..."
                  : mode === 'coo'
                  ? "e.g., Send daily 7am summary email..."
                  : "What would you like me to do?"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isProcessing || !!pendingDecision}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={isProcessing || !prompt.trim() || !!pendingDecision}
              size="icon"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        )}

        {/* Quick Suggestions */}
        {!prompt && !isProcessing && !pendingDecision && mode !== 'intake' && (
          <div className="flex flex-wrap gap-2">
            {mode === 'cto' ? (
              <>
                <button
                  className="text-xs px-2 py-1 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition-colors"
                  onClick={() => { setPrompt('Fix hydration errors in the dashboard'); handleSubmitText('Fix hydration errors in the dashboard'); }}
                >
                  Fix hydration errors
                </button>
                <button
                  className="text-xs px-2 py-1 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition-colors"
                  onClick={() => { setPrompt('Create task to implement dark mode toggle'); handleSubmitText('Create task to implement dark mode toggle'); }}
                >
                  Implement dark mode
                </button>
                <button
                  className="text-xs px-2 py-1 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition-colors"
                  onClick={() => { setPrompt('Refactor API client for better error handling'); handleSubmitText('Refactor API client for better error handling'); }}
                >
                  Refactor API client
                </button>
              </>
            ) : mode === 'coo' ? (
              <>
                <button
                  className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded hover:bg-emerald-500/20 transition-colors"
                  onClick={() => { setPrompt('Send daily 7am summary email'); handleSubmitText('Send daily 7am summary email'); }}
                >
                  Daily 7am summary
                </button>
                <button
                  className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded hover:bg-emerald-500/20 transition-colors"
                  onClick={() => { setPrompt('Schedule weekly report every Monday'); handleSubmitText('Schedule weekly report every Monday'); }}
                >
                  Weekly Monday report
                </button>
                <button
                  className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded hover:bg-emerald-500/20 transition-colors"
                  onClick={() => { setPrompt('Monitor system health every hour'); handleSubmitText('Monitor system health every hour'); }}
                >
                  Hourly health check
                </button>
              </>
            ) : (
              <>
                <button
                  className="text-xs px-2 py-1 bg-amber-500/10 text-amber-600 rounded hover:bg-amber-500/20 transition-colors"
                  onClick={() => { setPrompt('Create a new project'); handleSubmitText('Create a new project'); }}
                >
                  Create project
                </button>
                <button
                  className="text-xs px-2 py-1 bg-amber-500/10 text-amber-600 rounded hover:bg-amber-500/20 transition-colors"
                  onClick={() => { setPrompt('Schedule a reminder'); handleSubmitText('Schedule a reminder'); }}
                >
                  Schedule reminder
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
