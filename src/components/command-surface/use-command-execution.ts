'use client';

import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  CommandMode,
  CommandPlan,
  PlanStep,
  CommandExecution,
  CTODecision,
  COODecision,
  CommandHistoryItem,
} from './types';
import { summarizeOutput } from './pipeline-utils';
import { detectIntent, determineMode } from './intent-detection';
import { generatePlan } from './plan-generator';
import { executeStep } from './step-executor';

interface ExecutionDeps {
  setIsProcessing: (v: boolean) => void;
  setStreamingText: (v: string | ((prev: string) => string)) => void;
  setExecution: (v: CommandExecution | null | ((prev: CommandExecution | null) => CommandExecution | null)) => void;
  upsertHistoryItem: (item: CommandHistoryItem) => void;
  logHistoryEvent: (item: CommandHistoryItem) => void;
  createCommandRun: (prompt: string, mode: CommandMode, projectId?: string | null) => Promise<string | undefined>;
  finalizeCommandRun: (runId: string | undefined, status: 'completed' | 'failed' | 'cancelled', summary?: string) => Promise<void>;
  startRunTracking: (runId: string) => void;
  cancelRequestedRef: React.MutableRefObject<boolean>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
}

export function useExecuteCommand(deps: ExecutionDeps) {
  const {
    setIsProcessing, setStreamingText, setExecution,
    upsertHistoryItem, logHistoryEvent, createCommandRun,
    finalizeCommandRun, startRunTracking, cancelRequestedRef, abortControllerRef,
  } = deps;

  const executeCommand = useCallback(async (
    prompt: string,
    mode: CommandMode,
    plan: CommandPlan,
    decision?: CTODecision | COODecision,
    options?: { historyId?: string; existingRunId?: string; projectId?: string | null }
  ): Promise<CommandExecution> => {
    setIsProcessing(true);
    setStreamingText('');
    cancelRequestedRef.current = false;

    const historyId = options?.historyId ?? uuidv4();
    const now = new Date().toISOString();
    const bootstrapRunId = options?.existingRunId ?? await createCommandRun(prompt, mode, options?.projectId);
    const historyBase: CommandHistoryItem = {
      id: historyId, prompt, mode, intent: plan.intent, confidence: plan.confidence,
      status: 'running', runId: bootstrapRunId, createdAt: now, updatedAt: now,
    };
    upsertHistoryItem(historyBase);
    logHistoryEvent(historyBase);

    const exec: CommandExecution = {
      id: uuidv4(), prompt, mode, plan, status: 'executing',
      currentStepIndex: 0, createdAt: new Date(), updatedAt: new Date()
    };
    setExecution(exec);

    for (let i = 0; i < plan.steps.length; i++) {
      if (cancelRequestedRef.current) {
        exec.status = 'failed';
        exec.error = 'Cancelled by user';
        setExecution({ ...exec });
        const cancelledItem: CommandHistoryItem = {
          ...historyBase, status: 'failed', error: 'Cancelled by user',
          outputPreview: 'Stopped by user', updatedAt: new Date().toISOString(),
        };
        upsertHistoryItem(cancelledItem);
        logHistoryEvent(cancelledItem);
        await finalizeCommandRun(bootstrapRunId, 'cancelled', 'Stopped by user');
        setIsProcessing(false);
        return exec;
      }
      const step = plan.steps[i];
      exec.currentStepIndex = i;
      step.status = 'in_progress';
      setExecution({ ...exec });

      const result = await executeStep(step, prompt, mode, decision, plan.steps.slice(0, i), options?.projectId);

      if (result.success) {
        step.status = 'completed';
        step.result = result.result;
      } else {
        step.status = 'failed';
        step.error = result.error;
        exec.status = 'failed';
        exec.error = result.error;
        setExecution({ ...exec });
        const failedItem: CommandHistoryItem = {
          ...historyBase, status: 'failed', error: result.error,
          outputPreview: result.error, updatedAt: new Date().toISOString(),
        };
        upsertHistoryItem(failedItem);
        logHistoryEvent(failedItem);
        await finalizeCommandRun(bootstrapRunId, 'failed', summarizeOutput(result.error ?? 'Execution failed'));
        setIsProcessing(false);
        return exec;
      }

      exec.updatedAt = new Date();
      setExecution({ ...exec });
    }

    exec.status = 'completed';
    setExecution({ ...exec });
    setIsProcessing(false);

    const runStep = plan.steps.find(
      s => s.type === 'create_run' && s.result && (s.result as { runId?: string }).runId
    );
    if (runStep?.result) {
      const runId = (runStep.result as { runId: string }).runId;
      if (runId) startRunTracking(runId);
    }

    const completionRunId = (runStep?.result && (runStep.result as { runId?: string }).runId) || bootstrapRunId;
    const completedItem: CommandHistoryItem = {
      ...historyBase,
      status: 'completed',
      runId: completionRunId,
      outputPreview: summarizeOutput(`Completed ${plan.steps.filter(s => s.status === 'completed').length} steps`),
      updatedAt: new Date().toISOString(),
    };
    upsertHistoryItem(completedItem);
    logHistoryEvent(completedItem);
    await finalizeCommandRun(completionRunId, 'completed', summarizeOutput(completedItem.outputPreview ?? 'Completed'));

    return exec;
  }, [setIsProcessing, setStreamingText, setExecution, upsertHistoryItem, logHistoryEvent, createCommandRun, finalizeCommandRun, startRunTracking, cancelRequestedRef]);

  const submitPrompt = useCallback(async (
    prompt: string,
    mode: CommandMode,
    projectId?: string | null,
    decision?: CTODecision | COODecision,
  ): Promise<CommandExecution> => {
    setIsProcessing(true);
    setStreamingText('');
    cancelRequestedRef.current = false;

    const { intent, confidence } = detectIntent(prompt);
    const resolvedMode = mode === 'auto' ? determineMode(intent, prompt) : mode;
    const plan = generatePlan(intent, resolvedMode, prompt);
    const historyId = uuidv4();
    const runId = await createCommandRun(prompt, resolvedMode, projectId);
    const startedAt = new Date().toISOString();
    const historyBase: CommandHistoryItem = {
      id: historyId, prompt, mode: resolvedMode, intent, confidence,
      status: 'running', runId, createdAt: startedAt, updatedAt: startedAt,
    };
    upsertHistoryItem(historyBase);
    logHistoryEvent(historyBase);

    const exec: CommandExecution = {
      id: uuidv4(), prompt, mode: resolvedMode, plan, status: 'executing',
      currentStepIndex: 0, createdAt: new Date(), updatedAt: new Date(),
    };
    setExecution({ ...exec });

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const res = await fetch('/api/command-surface/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode, project_id: projectId ?? null }),
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('text/event-stream')) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const json = await res.json() as { error?: string; message?: string };
          errorMsg = json.error ?? json.message ?? errorMsg;
        } catch { /* ignore */ }

        if (res.status >= 500) {
          setStreamingText(`Agent stream unavailable (${errorMsg}). Running local fallback workflow...`);
          const fallback = await executeCommand(prompt, resolvedMode, plan, decision, { historyId, existingRunId: runId, projectId });
          if (fallback.status === 'failed') {
            fallback.error = `Agent stream unavailable: ${errorMsg}. Local fallback failed: ${fallback.error ?? 'unknown error'}`;
          }
          return fallback;
        }

        exec.status = 'failed';
        exec.error = errorMsg;
        setExecution({ ...exec });
        const failedItem: CommandHistoryItem = {
          ...historyBase, status: 'failed', error: errorMsg,
          outputPreview: summarizeOutput(errorMsg), updatedAt: new Date().toISOString(),
        };
        upsertHistoryItem(failedItem);
        logHistoryEvent(failedItem);
        await finalizeCommandRun(runId, 'failed', summarizeOutput(errorMsg));
        setIsProcessing(false);
        return exec;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let degradedStatus: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as Record<string, unknown>;
            if (event.type === 'text_delta' && typeof event.text === 'string') {
              accumulated += event.text;
              setStreamingText(accumulated);
            } else if (event.type === 'done') {
              if (event.degraded === true && typeof event.status === 'number') {
                degradedStatus = event.status;
              }
              if (typeof event.output === 'string' && event.output.length > accumulated.length) {
                accumulated = event.output;
                setStreamingText(accumulated);
              }
            } else if (event.type === 'error') {
              throw new Error(typeof event.message === 'string' ? event.message : 'Stream error');
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Stream error') continue;
            throw parseErr;
          }
        }
      }

      if (degradedStatus !== null && degradedStatus >= 400) {
        setStreamingText(`Agent stream degraded (HTTP ${degradedStatus}). Running local fallback workflow...`);
        const fallback = await executeCommand(prompt, resolvedMode, plan, decision, { historyId, existingRunId: runId });
        if (fallback.status === 'failed') {
          fallback.error = `Agent stream degraded: HTTP ${degradedStatus}. Local fallback failed: ${fallback.error ?? 'unknown error'}`;
        }
        return fallback;
      }

      exec.status = 'completed';
      exec.updatedAt = new Date();
      setExecution({ ...exec });
      abortControllerRef.current = null;
      const completedItem: CommandHistoryItem = {
        ...historyBase, status: 'completed',
        outputPreview: summarizeOutput(accumulated), updatedAt: new Date().toISOString(),
      };
      upsertHistoryItem(completedItem);
      logHistoryEvent(completedItem);
      await finalizeCommandRun(runId, 'completed', summarizeOutput(accumulated));
      setIsProcessing(false);
      return exec;

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const cancelled = err instanceof Error && err.name === 'AbortError';
      exec.status = 'failed';
      exec.error = cancelled ? 'Cancelled by user' : message;
      setExecution({ ...exec });
      const failedItem: CommandHistoryItem = {
        ...historyBase,
        status: 'failed',
        error: cancelled ? 'Cancelled by user' : message,
        outputPreview: summarizeOutput(cancelled ? 'Stopped by user' : message),
        updatedAt: new Date().toISOString(),
      };
      upsertHistoryItem(failedItem);
      logHistoryEvent(failedItem);
      await finalizeCommandRun(runId, cancelled ? 'cancelled' : 'failed', summarizeOutput(cancelled ? 'Stopped by user' : message));
      abortControllerRef.current = null;
      setIsProcessing(false);
      return exec;
    }
  }, [setIsProcessing, setStreamingText, setExecution, upsertHistoryItem, logHistoryEvent, createCommandRun, finalizeCommandRun, executeCommand, abortControllerRef, cancelRequestedRef]);

  return { executeCommand, submitPrompt };
}
