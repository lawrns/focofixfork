'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  CommandMode,
  CommandPlan,
  CommandExecution,
  AgentTrackerState,
  CTODecision,
  COODecision,
  CommandHistoryItem
} from './types';
import { scanPrompt } from '@/lib/ai/prompt-guard';
import { HISTORY_STORAGE_KEY } from './pipeline-utils';
import { detectIntent, determineMode } from './intent-detection';
import { generatePlan } from './plan-generator';
import { parseProjectIntent, parseTaskIntent, parseCronSchedule, parseEmailIntent } from './intent-parsers';
import { useExecuteCommand } from './use-command-execution';

export function useCommandPipeline() {
  const [execution, setExecution] = useState<CommandExecution | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelRequestedRef = useRef(false);

  const persistHistory = useCallback((items: CommandHistoryItem[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
    } catch { /* ignore */ }
  }, []);

  const upsertHistoryItem = useCallback((item: CommandHistoryItem) => {
    setHistory(prev => {
      const next = [item, ...prev.filter(h => h.id !== item.id)].slice(0, 50);
      persistHistory(next);
      return next;
    });
  }, [persistHistory]);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory(prev => {
      const next = prev.filter(item => item.id !== id);
      persistHistory(next);
      return next;
    });
  }, [persistHistory]);

  const removeHistoryByRunId = useCallback((runId: string) => {
    setHistory(prev => {
      const next = prev.filter(item => item.runId !== runId);
      persistHistory(next);
      return next;
    });
  }, [persistHistory]);

  const logHistoryEvent = useCallback(async (item: CommandHistoryItem) => {
    try {
      await fetch('/api/command-surface/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    } catch { /* telemetry is non-fatal */ }
  }, []);

  const deleteHistoryEvent = useCallback(async (args: { historyId?: string; runId?: string }) => {
    const params = new URLSearchParams();
    if (args.historyId) params.set('history_id', args.historyId);
    if (args.runId) params.set('run_id', args.runId);

    const res = await fetch(`/api/command-surface/history?${params.toString()}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 404) {
      throw new Error('Failed to delete command history');
    }

    if (args.historyId) {
      removeHistoryItem(args.historyId);
    } else if (args.runId) {
      removeHistoryByRunId(args.runId);
    }
  }, [removeHistoryByRunId, removeHistoryItem]);

  const createCommandRun = useCallback(async (prompt: string, mode: CommandMode, projectId?: string | null): Promise<string | undefined> => {
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runner: 'command-surface',
          status: 'running',
          summary: `[${mode.toUpperCase()}] ${prompt.slice(0, 140)}`,
          project_id: projectId ?? null,
        }),
      });
      if (!res.ok) return undefined;
      const json = await res.json();
      return json?.data?.id;
    } catch {
      return undefined;
    }
  }, []);

  const finalizeCommandRun = useCallback(async (
    runId: string | undefined,
    status: 'completed' | 'failed' | 'cancelled',
    summary?: string,
  ) => {
    if (!runId) return;
    try {
      await fetch(`/api/runs/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, summary }),
      });
    } catch { /* non-fatal */ }
  }, []);

  const startRunTracking = useCallback((runId: string) => {
    setExecution(prev => {
      if (!prev) return prev;
      return { ...prev, agentTracker: { runId, status: 'pending', pollCount: 0 } };
    });

    const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`);
        if (!res.ok) return;
        const json = await res.json();
        const data = json?.data as {
          status?: string; runner?: string; started_at?: string;
          run_steps?: Array<{ description?: string }>;
        } | undefined;
        if (!data) return;

        const status = (data.status ?? 'pending') as AgentTrackerState['status'];
        const runner = data.runner;
        const startedAt = data.started_at;
        const currentStep = data.run_steps?.slice(-1)[0]?.description;

        setExecution(prev => {
          if (!prev) return prev;
          const prevTracker = prev.agentTracker;
          const pollCount = (prevTracker?.pollCount ?? 0) + 1;
          return {
            ...prev,
            agentTracker: { runId, status, runner, startedAt, currentStep, outputPreview: prevTracker?.outputPreview, pollCount }
          };
        });

        if (TERMINAL_STATUSES.has(status)) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch { /* non-fatal polling error */ }
    }, 3000);
  }, []);

  const clearExecution = useCallback(() => {
    cancelRequestedRef.current = false;
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    setExecution(null);
    setStreamingText('');
  }, []);

  const cancelExecution = useCallback(() => {
    cancelRequestedRef.current = true;
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
    setIsProcessing(false);
    setExecution(prev => prev ? { ...prev, status: 'failed', error: 'Cancelled by user', updatedAt: new Date() } : prev);
    setStreamingText(prev => prev ? `${prev}\n\n[Stopped by user]` : '[Stopped by user]');
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CommandHistoryItem[];
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, 25));
      }
    } catch { /* ignore */ }

    const hydrateFromServer = async () => {
      try {
        const res = await fetch('/api/command-surface/history?limit=25');
        if (!res.ok) return;
        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data as CommandHistoryItem[] : [];
        if (!mountedRef.current || items.length === 0) return;
        setHistory(prev => {
          const merged = [...items, ...prev]
            .filter((item, idx, arr) => arr.findIndex(i => i.id === item.id) === idx)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 50);
          persistHistory(merged);
          return merged;
        });
      } catch { /* keep local cache */ }
    };

    hydrateFromServer();
  }, [persistHistory]);

  const { executeCommand, submitPrompt } = useExecuteCommand({
    setIsProcessing,
    setStreamingText,
    setExecution: setExecution as any,
    upsertHistoryItem,
    logHistoryEvent,
    createCommandRun,
    finalizeCommandRun,
    startRunTracking,
    cancelRequestedRef,
    abortControllerRef,
  });

  const analyzePrompt = useCallback((rawPrompt: string, defaultMode?: CommandMode): {
    mode: CommandMode;
    plan: CommandPlan;
    decision?: CTODecision | COODecision;
    injectionDetected?: boolean;
  } => {
    const guard = scanPrompt(rawPrompt);
    const prompt = guard.sanitized;

    if (!guard.safe) {
      console.warn('[PromptGuard] Injection pattern detected:', guard.matches);
    }

    const { intent } = detectIntent(prompt);
    let mode = defaultMode === 'auto' || !defaultMode ? determineMode(intent, prompt) : defaultMode;
    let plannedIntent = intent;
    let plan = generatePlan(plannedIntent, mode, prompt);

    let decision: CTODecision | COODecision | undefined;

    if (mode === 'cto' && (intent === 'create_project' || intent === 'create_task' || intent === 'fix_issue' || intent === 'architect_feature')) {
      if (intent === 'create_project') {
        const projectInfo = parseProjectIntent(prompt);
        decision = {
          id: uuidv4(), type: 'implementation', title: `Create project: ${projectInfo.name}`,
          description: projectInfo.description, projects: [projectInfo], tasks: [], runs: [], status: 'pending'
        };
      } else {
        const taskInfo = parseTaskIntent(prompt);
        if (taskInfo) {
          decision = {
            id: uuidv4(),
            type: intent === 'fix_issue' ? 'refactor' : intent === 'architect_feature' ? 'architecture' : 'implementation',
            title: taskInfo.title,
            description: taskInfo.description || `Task created from prompt: "${prompt}"`,
            tasks: [{ title: taskInfo.title, description: taskInfo.description, priority: taskInfo.priority, estimatedHours: taskInfo.priority === 'urgent' ? 2 : taskInfo.priority === 'high' ? 4 : 8 }],
            runs: mode === 'cto' ? [{ runner: 'openclaw', task: `Implement: ${taskInfo.title}` }] : [],
            status: 'pending'
          };
        }
      }
    }

    if (mode === 'coo' && (intent === 'create_cron' || intent === 'send_email')) {
      if (intent === 'create_cron') {
        const cronInfo = parseCronSchedule(prompt);
        if (cronInfo) {
          decision = {
            id: uuidv4(), type: 'schedule', title: cronInfo.name,
            description: `Scheduled job: ${cronInfo.name} (${cronInfo.schedule})`,
            crons: [cronInfo],
            emails: prompt.includes('email') ? [{ to: ['user@example.com'], subject: cronInfo.name, body: 'Automated scheduled email' }] : [],
            status: 'pending'
          };
        }
      } else {
        const emailInfo = parseEmailIntent(prompt);
        if (emailInfo) {
          decision = {
            id: uuidv4(), type: 'notify', title: `Send: ${emailInfo.subject}`,
            description: `Email notification to ${emailInfo.to.join(', ')}`,
            crons: [], emails: [emailInfo], status: 'pending'
          };
        }
      }
    }

    if (!decision && guard.safe) {
      const taskInfo = parseTaskIntent(prompt);
      if (taskInfo) {
        mode = defaultMode === 'auto' || !defaultMode ? 'cto' : mode;
        plannedIntent = 'create_task';
        plan = generatePlan(plannedIntent, mode, prompt);
        decision = {
          id: uuidv4(), type: 'implementation', title: taskInfo.title,
          description: taskInfo.description || `Action generated from prompt: "${prompt}"`,
          tasks: [{ title: taskInfo.title, description: taskInfo.description, priority: taskInfo.priority, estimatedHours: taskInfo.priority === 'urgent' ? 2 : taskInfo.priority === 'high' ? 4 : 8 }],
          runs: [{ runner: 'openclaw', task: `Execute action plan for: ${taskInfo.title}` }],
          status: 'pending',
        };
      }
    }

    return { mode, plan, decision, injectionDetected: !guard.safe };
  }, []);

  return {
    execution, isProcessing, streamingText,
    analyzePrompt, executeCommand, submitPrompt,
    clearExecution, cancelExecution, history, deleteHistoryEvent,
  };
}
