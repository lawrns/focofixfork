'use client';

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  CommandMode,
  CommandPlan,
  CommandExecution,
  CTODecision,
  COODecision,
  CommandHistoryItem,
  AgentExecutionEvent,
} from './types';
import { summarizeOutput } from './pipeline-utils';
import { detectIntent, determineMode } from './intent-detection';
import { generatePlan } from './plan-generator';
import { executeStep } from './step-executor';

interface ExecutionDeps {
  setIsProcessing: (v: boolean) => void;
  setStreamingText: (v: string | ((prev: string) => string)) => void;
  setExecutionEvents: React.Dispatch<React.SetStateAction<AgentExecutionEvent[]>>;
  setExecution: (v: CommandExecution | null | ((prev: CommandExecution | null) => CommandExecution | null)) => void;
  upsertHistoryItem: (item: CommandHistoryItem) => void;
  logHistoryEvent: (item: CommandHistoryItem) => void;
  createCommandRun: (prompt: string, mode: CommandMode, projectId?: string | null) => Promise<string | undefined>;
  finalizeCommandRun: (runId: string | undefined, status: 'completed' | 'failed' | 'cancelled', summary?: string) => Promise<void>;
  startRunTracking: (runId: string) => void;
  cancelRequestedRef: React.MutableRefObject<boolean>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
}

type ExecuteResponse = {
  ok?: boolean;
  job_id?: string;
  stream_url?: string;
  error?: string;
  message?: string;
}

type StreamStatus = 'queued' | 'executing' | 'completed' | 'error'

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeStreamEvent(raw: Record<string, unknown>): AgentExecutionEvent | null {
  const type = typeof raw.type === 'string' ? raw.type : '';

  if (type === 'status_update') {
    const statusRaw = typeof raw.status === 'string' ? raw.status : 'executing';
    const status: StreamStatus = (['queued', 'executing', 'completed', 'error'].includes(statusRaw) ? statusRaw : 'executing') as StreamStatus;
    return {
      type: 'status_update',
      status,
      message: typeof raw.message === 'string' ? raw.message : undefined,
      phase: typeof raw.phase === 'string' ? raw.phase : undefined,
      timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : nowIso(),
    };
  }

  if (type === 'output_chunk') {
    return {
      type: 'output_chunk',
      text: typeof raw.text === 'string' ? raw.text : '',
      phase: typeof raw.phase === 'string' ? raw.phase : undefined,
      timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : nowIso(),
    };
  }

  if (type === 'reasoning') {
    return {
      type: 'reasoning',
      text: typeof raw.text === 'string' ? raw.text : '',
      phase: typeof raw.phase === 'string' ? raw.phase : undefined,
      timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : nowIso(),
    };
  }

  if (type === 'error') {
    return {
      type: 'error',
      message: typeof raw.message === 'string' ? raw.message : 'Execution error',
      timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : nowIso(),
    };
  }

  if (type === 'done') {
    return {
      type: 'done',
      exitCode: typeof raw.exitCode === 'number' ? raw.exitCode : 0,
      summary: typeof raw.summary === 'string' ? raw.summary : undefined,
      timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : nowIso(),
    };
  }

  // Legacy command-surface stream compatibility
  if (type === 'text_delta' && typeof raw.text === 'string') {
    return {
      type: 'output_chunk',
      text: raw.text,
      timestamp: nowIso(),
    };
  }

  if (type === 'activity' && typeof raw.message === 'string') {
    return {
      type: 'reasoning',
      text: raw.message,
      phase: typeof raw.phase === 'string' ? raw.phase : undefined,
      timestamp: nowIso(),
    };
  }

  if (type === 'pipeline_error' || type === 'phase_error') {
    return {
      type: 'error',
      message: typeof raw.message === 'string' ? raw.message : 'Pipeline error',
      timestamp: nowIso(),
    };
  }

  return null;
}

export function useExecuteCommand(deps: ExecutionDeps) {
  const {
    setIsProcessing,
    setStreamingText,
    setExecutionEvents,
    setExecution,
    upsertHistoryItem,
    logHistoryEvent,
    createCommandRun,
    finalizeCommandRun,
    startRunTracking,
    cancelRequestedRef,
    abortControllerRef,
  } = deps;

  const appendExecutionEvent = useCallback((event: AgentExecutionEvent) => {
    setExecutionEvents((prev) => [...prev, event].slice(-400));
  }, [setExecutionEvents]);

  const executeCommand = useCallback(async (
    prompt: string,
    mode: CommandMode,
    plan: CommandPlan,
    decision?: CTODecision | COODecision,
    options?: { historyId?: string; existingRunId?: string; projectId?: string | null }
  ): Promise<CommandExecution> => {
    setIsProcessing(true);
    setStreamingText('');
    setExecutionEvents([
      { type: 'status_update', status: 'queued', message: 'Starting local workflow', timestamp: nowIso() },
      { type: 'status_update', status: 'executing', message: 'Executing fallback steps', timestamp: nowIso() },
    ]);
    cancelRequestedRef.current = false;

    const historyId = options?.historyId ?? uuidv4();
    const now = nowIso();
    const bootstrapRunId = options?.existingRunId ?? await createCommandRun(prompt, mode, options?.projectId);
    const historyBase: CommandHistoryItem = {
      id: historyId,
      prompt,
      mode,
      intent: plan.intent,
      confidence: plan.confidence,
      status: 'running',
      runId: bootstrapRunId,
      createdAt: now,
      updatedAt: now,
    };
    upsertHistoryItem(historyBase);
    logHistoryEvent(historyBase);

    const exec: CommandExecution = {
      id: uuidv4(),
      prompt,
      mode,
      plan,
      status: 'executing',
      currentStepIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setExecution(exec);

    for (let i = 0; i < plan.steps.length; i++) {
      if (cancelRequestedRef.current) {
        exec.status = 'failed';
        exec.error = 'Cancelled by user';
        setExecution({ ...exec });
        appendExecutionEvent({ type: 'error', message: 'Cancelled by user', timestamp: nowIso() });
        appendExecutionEvent({ type: 'done', exitCode: 1, summary: 'Cancelled by user', timestamp: nowIso() });

        const cancelledItem: CommandHistoryItem = {
          ...historyBase,
          status: 'failed',
          error: 'Cancelled by user',
          outputPreview: 'Stopped by user',
          updatedAt: nowIso(),
        };
        upsertHistoryItem(cancelledItem);
        logHistoryEvent(cancelledItem);
        await finalizeCommandRun(bootstrapRunId, 'cancelled', 'Stopped by user');
        setIsProcessing(false);
        return exec;
      }

      const step = plan.steps[i];
      if (step.type === 'create_run' && bootstrapRunId) {
        step.status = 'completed';
        step.result = { runId: bootstrapRunId };
        setExecution({ ...exec });
        continue;
      }

      exec.currentStepIndex = i;
      step.status = 'in_progress';
      setExecution({ ...exec });

      const result = await executeStep(step, prompt, mode, decision, plan.steps.slice(0, i), options?.projectId);

      if (result.success) {
        step.status = 'completed';
        step.result = result.result;
        appendExecutionEvent({
          type: 'reasoning',
          text: `Step completed: ${step.description}`,
          timestamp: nowIso(),
        });
      } else {
        step.status = 'failed';
        step.error = result.error;
        exec.status = 'failed';
        exec.error = result.error;
        setExecution({ ...exec });
        appendExecutionEvent({
          type: 'error',
          message: result.error ?? 'Execution failed',
          timestamp: nowIso(),
        });
        appendExecutionEvent({ type: 'done', exitCode: 1, summary: result.error, timestamp: nowIso() });

        const failedItem: CommandHistoryItem = {
          ...historyBase,
          status: 'failed',
          error: result.error,
          outputPreview: result.error,
          updatedAt: nowIso(),
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
    appendExecutionEvent({ type: 'status_update', status: 'completed', message: 'Fallback workflow complete', timestamp: nowIso() });
    appendExecutionEvent({ type: 'done', exitCode: 0, summary: 'Fallback workflow complete', timestamp: nowIso() });

    const runStep = plan.steps.find(
      (s) => s.type === 'create_run' && s.result && (s.result as { runId?: string }).runId
    );
    if (runStep?.result) {
      const trackedRunId = (runStep.result as { runId: string }).runId;
      if (trackedRunId) startRunTracking(trackedRunId);
    }

    const completionRunId = (runStep?.result && (runStep.result as { runId?: string }).runId) || bootstrapRunId;
    const completedItem: CommandHistoryItem = {
      ...historyBase,
      status: 'completed',
      runId: completionRunId,
      outputPreview: summarizeOutput(`Completed ${plan.steps.filter((s) => s.status === 'completed').length} steps`),
      updatedAt: nowIso(),
    };
    upsertHistoryItem(completedItem);
    logHistoryEvent(completedItem);
    await finalizeCommandRun(completionRunId, 'completed', summarizeOutput(completedItem.outputPreview ?? 'Completed'));

    return exec;
  }, [
    appendExecutionEvent,
    cancelRequestedRef,
    createCommandRun,
    finalizeCommandRun,
    logHistoryEvent,
    setExecution,
    setExecutionEvents,
    setIsProcessing,
    setStreamingText,
    startRunTracking,
    upsertHistoryItem,
  ]);

  const submitPrompt = useCallback(async (
    prompt: string,
    mode: CommandMode,
    projectId?: string | null,
    decision?: CTODecision | COODecision,
  ): Promise<CommandExecution> => {
    setIsProcessing(true);
    setStreamingText('');
    setExecutionEvents([{ type: 'status_update', status: 'queued', message: 'Preparing execution', timestamp: nowIso() }]);
    cancelRequestedRef.current = false;

    const { intent, confidence } = detectIntent(prompt);
    const resolvedMode = mode === 'auto' ? determineMode(intent, prompt) : mode;
    const plan = generatePlan(intent, resolvedMode, prompt);
    const historyId = uuidv4();
    const runId = await createCommandRun(prompt, resolvedMode, projectId);
    const startedAt = nowIso();

    const historyBase: CommandHistoryItem = {
      id: historyId,
      prompt,
      mode: resolvedMode,
      intent,
      confidence,
      status: 'running',
      runId,
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    upsertHistoryItem(historyBase);
    logHistoryEvent(historyBase);

    const exec: CommandExecution = {
      id: uuidv4(),
      prompt,
      mode: resolvedMode,
      plan,
      status: 'executing',
      currentStepIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setExecution({ ...exec });

    const completeWithFailure = async (errorMsg: string) => {
      exec.status = 'failed';
      exec.error = errorMsg;
      setExecution({ ...exec });
      appendExecutionEvent({ type: 'error', message: errorMsg, timestamp: nowIso() });
      appendExecutionEvent({ type: 'done', exitCode: 1, summary: errorMsg, timestamp: nowIso() });
      const failedItem: CommandHistoryItem = {
        ...historyBase,
        status: 'failed',
        error: errorMsg,
        outputPreview: summarizeOutput(errorMsg),
        updatedAt: nowIso(),
      };
      upsertHistoryItem(failedItem);
      logHistoryEvent(failedItem);
      await finalizeCommandRun(runId, 'failed', summarizeOutput(errorMsg));
      setIsProcessing(false);
      return exec;
    };

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const executeRes = await fetch('/api/command-surface/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode, project_id: projectId ?? null }),
        signal: controller.signal,
      });

      const executeContentType = executeRes.headers.get('content-type') ?? '';
      let streamRes: Response | null = null;
      let accumulated = '';

      // Backward compatibility for older execute route that streamed directly.
      if (executeContentType.includes('text/event-stream')) {
        streamRes = executeRes;
      } else {
        const payload = await executeRes.json().catch(() => ({} as ExecuteResponse)) as ExecuteResponse;
        if (!executeRes.ok || !payload.ok || !payload.stream_url) {
          const errorMsg = payload.error ?? payload.message ?? `HTTP ${executeRes.status}`;

          if (executeRes.status >= 500) {
            setStreamingText(`Agent stream unavailable (${errorMsg}). Running local fallback workflow...`);
            const fallback = await executeCommand(prompt, resolvedMode, plan, decision, {
              historyId,
              existingRunId: runId,
              projectId,
            });
            if (fallback.status === 'failed') {
              fallback.error = `Agent stream unavailable: ${errorMsg}. Local fallback failed: ${fallback.error ?? 'unknown error'}`;
            }
            return fallback;
          }

          return completeWithFailure(errorMsg);
        }

        streamRes = await fetch(payload.stream_url, {
          headers: { Accept: 'text/event-stream' },
          signal: controller.signal,
        });
      }

      if (!streamRes) return completeWithFailure('Stream URL not provided by execution endpoint');

      appendExecutionEvent({ type: 'status_update', status: 'executing', message: 'Connecting to stream', timestamp: nowIso() });

      if (!streamRes.ok || !streamRes.body) {
        const errorText = `Stream endpoint failed (HTTP ${streamRes.status})`;
        if (streamRes.status >= 500) {
          setStreamingText(`${errorText}. Running local fallback workflow...`);
          const fallback = await executeCommand(prompt, resolvedMode, plan, decision, {
            historyId,
            existingRunId: runId,
            projectId,
          });
          if (fallback.status === 'failed') {
            fallback.error = `${errorText}. Local fallback failed: ${fallback.error ?? 'unknown error'}`;
          }
          return fallback;
        }
        return completeWithFailure(errorText);
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let exitCode = 0;
      let doneSeen = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          let raw: Record<string, unknown>;
          try {
            raw = JSON.parse(line.slice(6)) as Record<string, unknown>;
          } catch {
            continue;
          }

          const event = normalizeStreamEvent(raw);
          if (!event) continue;

          appendExecutionEvent(event);

          if (event.type === 'output_chunk') {
            accumulated += event.text;
            setStreamingText(accumulated);
            continue;
          }

          if (event.type === 'reasoning') {
            const prefix = event.phase ? `[${event.phase}] ` : '';
            setStreamingText((prev) => `${prev}${prev ? '\n' : ''}${prefix}${event.text}`);
            continue;
          }

          if (event.type === 'error') {
            throw new Error(event.message);
          }

          if (event.type === 'done') {
            doneSeen = true;
            exitCode = event.exitCode;
          }
        }
      }

      if (!doneSeen) {
        appendExecutionEvent({ type: 'done', exitCode: 0, summary: 'Stream completed', timestamp: nowIso() });
      }

      if (exitCode !== 0) {
        return completeWithFailure('Execution stream ended with a non-zero exit code');
      }

      exec.status = 'completed';
      exec.updatedAt = new Date();
      setExecution({ ...exec });
      abortControllerRef.current = null;
      appendExecutionEvent({ type: 'status_update', status: 'completed', message: 'Execution finished', timestamp: nowIso() });

      const completedItem: CommandHistoryItem = {
        ...historyBase,
        status: 'completed',
        outputPreview: summarizeOutput(accumulated || 'Execution completed'),
        updatedAt: nowIso(),
      };
      upsertHistoryItem(completedItem);
      logHistoryEvent(completedItem);
      await finalizeCommandRun(runId, 'completed', summarizeOutput(accumulated || 'Execution completed'));
      setIsProcessing(false);
      return exec;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const cancelled = err instanceof Error && err.name === 'AbortError';
      const failedMessage = cancelled ? 'Cancelled by user' : message;
      exec.status = 'failed';
      exec.error = failedMessage;
      setExecution({ ...exec });
      appendExecutionEvent({ type: 'error', message: failedMessage, timestamp: nowIso() });
      appendExecutionEvent({ type: 'done', exitCode: 1, summary: failedMessage, timestamp: nowIso() });

      const failedItem: CommandHistoryItem = {
        ...historyBase,
        status: 'failed',
        error: failedMessage,
        outputPreview: summarizeOutput(cancelled ? 'Stopped by user' : failedMessage),
        updatedAt: nowIso(),
      };
      upsertHistoryItem(failedItem);
      logHistoryEvent(failedItem);
      await finalizeCommandRun(runId, cancelled ? 'cancelled' : 'failed', summarizeOutput(cancelled ? 'Stopped by user' : failedMessage));
      abortControllerRef.current = null;
      setIsProcessing(false);
      return exec;
    }
  }, [
    abortControllerRef,
    appendExecutionEvent,
    cancelRequestedRef,
    createCommandRun,
    executeCommand,
    finalizeCommandRun,
    logHistoryEvent,
    setExecution,
    setExecutionEvents,
    setIsProcessing,
    setStreamingText,
    upsertHistoryItem,
  ]);

  return { executeCommand, submitPrompt };
}
