'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  CommandMode,
  IntentType,
  CommandPlan,
  PlanStep,
  StepResult,
  CommandExecution,
  AgentTrackerState,
  CTODecision,
  COODecision,
  CommandHistoryItem
} from './types';
import { scanPrompt } from '@/lib/ai/prompt-guard';

// Intent detection patterns
const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  create_project: [/create project/i, /new project/i, /start project/i, /project called/i, /launch project/i],
  create_task: [/create task/i, /add task/i, /new task/i, /fix.*bug/i, /implement/i],
  create_cron: [/schedule/i, /cron/i, /daily.*email/i, /weekly.*report/i, /every.*day/i, /every.*hour/i],
  send_email: [/send email/i, /email.*to/i, /notify/i, /remind.*me/i],
  fix_issue: [/fix/i, /debug/i, /solve/i, /resolve/i, /error/i, /bug/i, /hydration/i],
  architect_feature: [/architect/i, /design/i, /plan.*feature/i, /build.*system/i],
  monitor_system: [/monitor/i, /check.*health/i, /watch/i, /alert/i],
  schedule_reminder: [/remind/i, /schedule/i, /set.*reminder/i],
  unknown: []
};

function detectIntent(prompt: string): { intent: IntentType; confidence: number } {
  let bestIntent: IntentType = 'unknown';
  let bestScore = 0;

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (intent === 'unknown') continue;
    
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        score++;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as IntentType;
    }
  }

  // Calculate confidence (0-1)
  const confidence = bestScore > 0 ? Math.min(0.3 + (bestScore * 0.2), 0.95) : 0.1;
  
  return { intent: bestIntent, confidence };
}

function determineMode(intent: IntentType, prompt: string): CommandMode {
  // Check for explicit mode hints
  if (/\b(CTO|architect|implement|build|code|develop)\b/i.test(prompt)) return 'cto';
  if (/\b(COO|schedule|email|notify|monitor|operate|run)\b/i.test(prompt)) return 'coo';
  
  // Default based on intent
  switch (intent) {
    case 'create_task':
    case 'create_project':
    case 'fix_issue':
    case 'architect_feature':
      return 'cto';
    case 'create_cron':
    case 'send_email':
    case 'monitor_system':
    case 'schedule_reminder':
      return 'coo';
    default:
      return 'auto';
  }
}

function generatePlan(intent: IntentType, mode: CommandMode, prompt: string): CommandPlan {
  const steps: PlanStep[] = [];
  let requiresApproval = false;
  let estimatedDuration = 0;

  // Step 1: Log to ledger
  steps.push({
    id: uuidv4(),
    type: 'ledger_log',
    description: 'Log command initiation to ledger',
    status: 'pending'
  });

  switch (intent) {
    case 'create_project':
      steps.push({
        id: uuidv4(),
        type: 'create_project',
        description: 'Create project in workspace',
        status: 'pending'
      });
      steps.push({
        id: uuidv4(),
        type: 'verify',
        description: 'Verify project was created',
        status: 'pending'
      });
      estimatedDuration = 2500;
      break;

    case 'create_cron':
      steps.push({
        id: uuidv4(),
        type: 'create_cron',
        description: 'Create scheduled cron job',
        status: 'pending'
      });
      steps.push({
        id: uuidv4(),
        type: 'verify',
        description: 'Verify cron was created successfully',
        status: 'pending'
      });
      estimatedDuration = 2000;
      break;

    case 'send_email':
      steps.push({
        id: uuidv4(),
        type: 'send_email',
        description: 'Queue email to outbox',
        status: 'pending'
      });
      steps.push({
        id: uuidv4(),
        type: 'verify',
        description: 'Verify email was queued',
        status: 'pending'
      });
      estimatedDuration = 1500;
      break;

    case 'create_task':
    case 'fix_issue':
      steps.push({
        id: uuidv4(),
        type: 'create_task',
        description: `Create ${intent === 'fix_issue' ? 'bug fix' : 'implementation'} task`,
        status: 'pending'
      });
      if (mode === 'cto') {
        steps.push({
          id: uuidv4(),
          type: 'create_run',
          description: 'Create agent run for implementation',
          status: 'pending'
        });
      }
      steps.push({
        id: uuidv4(),
        type: 'verify',
        description: 'Verify task was created',
        status: 'pending'
      });
      requiresApproval = true;
      estimatedDuration = 3000;
      break;

    case 'architect_feature':
      steps.push({
        id: uuidv4(),
        type: 'create_task',
        description: 'Create architecture planning task',
        status: 'pending'
      });
      steps.push({
        id: uuidv4(),
        type: 'create_run',
        description: 'Create agent run for architecture review',
        status: 'pending'
      });
      requiresApproval = true;
      estimatedDuration = 5000;
      break;

    default:
      steps.push({
        id: uuidv4(),
        type: 'report',
        description: 'Provide response to user',
        status: 'pending'
      });
      estimatedDuration = 1000;
  }

  // Final report step
  steps.push({
    id: uuidv4(),
    type: 'report',
    description: 'Report execution results',
    status: 'pending'
  });

  const { confidence } = detectIntent(prompt);

  return {
    intent,
    confidence,
    steps,
    estimatedDuration,
    requiresApproval
  };
}

// Parse cron schedule from natural language
function parseCronSchedule(prompt: string): { name: string; schedule: string; handler: string } | null {
  const dailyMatch = prompt.match(/(?:send|create)?\s*(?:daily|every day).*?(?:at)?\s*(\d+)(?::(\d+))?\s*(am|pm)?/i);
  const weeklyMatch = prompt.match(/(?:send|create)?\s*(?:weekly|every week|every monday|every friday)/i);
  const hourlyMatch = prompt.match(/(?:send|create)?\s*(?:every hour|hourly)/i);
  
  let schedule = '0 9 * * *'; // Default 9am daily
  let name = 'Daily Summary';
  let handler = 'jobs/daily-summary';

  if (dailyMatch) {
    let hour = parseInt(dailyMatch[1]);
    const minute = dailyMatch[2] ? parseInt(dailyMatch[2]) : 0;
    const ampm = dailyMatch[3]?.toLowerCase();
    
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    
    schedule = `${minute} ${hour} * * *`;
    name = `Daily at ${hour}:${minute.toString().padStart(2, '0')}`;
    
    if (prompt.includes('summary')) {
      handler = 'jobs/daily-summary';
      name = 'Daily Summary Email';
    } else if (prompt.includes('report')) {
      handler = 'jobs/daily-report';
      name = 'Daily Report';
    }
  } else if (weeklyMatch) {
    schedule = '0 9 * * 1'; // Monday 9am
    name = 'Weekly Report';
    handler = 'jobs/weekly-report';
  } else if (hourlyMatch) {
    schedule = '0 * * * *';
    name = 'Hourly Check';
    handler = 'jobs/hourly-check';
  }

  // Check for 7am specifically
  if (prompt.includes('7am') || prompt.includes('7 am') || prompt.includes('7:00')) {
    schedule = '0 7 * * *';
    name = 'Daily 7AM Summary';
  }

  return { name, schedule, handler };
}

// Parse email from prompt
function parseEmailIntent(prompt: string): { to: string[]; subject: string; body: string } | null {
  // Extract email recipient
  const emailMatch = prompt.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  const to = emailMatch ? [emailMatch[0]] : ['user@example.com'];
  
  // Generate subject based on context
  let subject = 'Notification';
  if (prompt.includes('summary')) subject = 'Daily Summary';
  if (prompt.includes('report')) subject = 'Status Report';
  if (prompt.includes('alert')) subject = 'System Alert';
  
  const body = `Automated message based on your request: "${prompt}"`;
  
  return { to, subject, body };
}

// Parse task creation intent
function parseTaskIntent(prompt: string): { title: string; description: string; priority: 'urgent' | 'high' | 'medium' | 'low'; type: string } | null {
  let title = prompt;
  let description = '';
  let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium';
  let type = 'feature';

  // Extract title from "create task to..." or "fix..."
  const titleMatch = prompt.match(/(?:create task to|fix|implement|build|solve)\s+(.+?)(?:\.|$)/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Detect priority
  if (/urgent|critical|asap|p0|p1/i.test(prompt)) priority = 'urgent';
  else if (/high priority|important/i.test(prompt)) priority = 'high';
  else if (/low priority|minor/i.test(prompt)) priority = 'low';

  // Detect type
  if (/bug|error|fix|crash|broken/i.test(prompt)) type = 'bug';
  if (/hydrat/i.test(prompt)) {
    type = 'bug';
    title = title || 'Fix hydration errors';
    description = 'Investigate and resolve React hydration mismatches in the application';
    priority = 'high';
  }

  return { title, description, priority, type };
}

function parseProjectIntent(prompt: string): { name: string; description: string } {
  const normalized = prompt.trim();
  const nameMatch =
    normalized.match(/(?:create|start|launch|new)\s+project(?:\s+called|\s+named)?\s+["']?([^"'.\n]+)["']?/i) ||
    normalized.match(/project(?:\s+called|\s+named)\s+["']?([^"'.\n]+)["']?/i);
  const extracted = nameMatch?.[1]?.trim();

  const rawName = extracted && extracted.length > 0 ? extracted : normalized;
  const cleanName = rawName
    .replace(/^(create|start|launch|new)\s+project\s*/i, '')
    .trim();
  const safeName = (cleanName || 'New Project').slice(0, 100);

  return {
    name: safeName.charAt(0).toUpperCase() + safeName.slice(1),
    description: `Created from Command Surface prompt: "${prompt.trim()}"`,
  };
}

const HISTORY_STORAGE_KEY = 'command_surface_history_v1';

function summarizeOutput(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

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
    } catch {
      // Ignore storage issues
    }
  }, []);

  const upsertHistoryItem = useCallback((item: CommandHistoryItem) => {
    setHistory(prev => {
      const next = [item, ...prev.filter(h => h.id !== item.id)].slice(0, 50);
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
    } catch {
      // History telemetry should never break execution
    }
  }, []);

  const createCommandRun = useCallback(async (prompt: string, mode: CommandMode): Promise<string | undefined> => {
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runner: 'command-surface',
          status: 'running',
          summary: `[${mode.toUpperCase()}] ${prompt.slice(0, 140)}`,
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
        body: JSON.stringify({
          status,
          summary,
        }),
      });
    } catch {
      // Non-fatal
    }
  }, []);

  const clearExecution = useCallback(() => {
    cancelRequestedRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setExecution(null);
    setStreamingText('');
  }, []);

  const cancelExecution = useCallback(() => {
    cancelRequestedRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setExecution(prev => prev ? {
      ...prev,
      status: 'failed',
      error: 'Cancelled by user',
      updatedAt: new Date(),
    } : prev);
    setStreamingText(prev => prev ? `${prev}\n\n[Stopped by user]` : '[Stopped by user]');
  }, []);

  // Clear poll interval on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CommandHistoryItem[];
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, 25));
        }
      }
    } catch {
      // ignore invalid storage payload
    }

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
      } catch {
        // keep local cache
      }
    };

    hydrateFromServer();
  }, [persistHistory]);

  const startRunTracking = useCallback((runId: string) => {
    // Initialise the tracker on the current execution
    setExecution(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        agentTracker: {
          runId,
          status: 'pending',
          pollCount: 0
        }
      };
    });

    const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`);
        if (!res.ok) return;
        const json = await res.json();
        const data = json?.data as {
          status?: string;
          runner?: string;
          started_at?: string;
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
            agentTracker: {
              runId,
              status,
              runner,
              startedAt,
              currentStep,
              outputPreview: prevTracker?.outputPreview,
              pollCount
            }
          };
        });

        if (TERMINAL_STATUSES.has(status)) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch {
        // Non-fatal — keep polling
      }
    }, 3000);
  }, []);

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

    const { intent, confidence } = detectIntent(prompt);
    let mode = defaultMode === 'auto' || !defaultMode ? determineMode(intent, prompt) : defaultMode;
    let plannedIntent: IntentType = intent;
    let plan = generatePlan(plannedIntent, mode, prompt);

    let decision: CTODecision | COODecision | undefined;

    // Generate CTO decision for architecture/implementation intents
    if (mode === 'cto' && (intent === 'create_project' || intent === 'create_task' || intent === 'fix_issue' || intent === 'architect_feature')) {
      if (intent === 'create_project') {
        const projectInfo = parseProjectIntent(prompt);
        decision = {
          id: uuidv4(),
          type: 'implementation',
          title: `Create project: ${projectInfo.name}`,
          description: projectInfo.description,
          projects: [projectInfo],
          tasks: [],
          runs: [],
          status: 'pending'
        };
      } else {
      const taskInfo = parseTaskIntent(prompt);
      if (taskInfo) {
        decision = {
          id: uuidv4(),
          type: intent === 'fix_issue' ? 'refactor' : intent === 'architect_feature' ? 'architecture' : 'implementation',
          title: taskInfo.title,
          description: taskInfo.description || `Task created from prompt: "${prompt}"`,
          tasks: [{
            title: taskInfo.title,
            description: taskInfo.description,
            priority: taskInfo.priority,
            estimatedHours: taskInfo.priority === 'urgent' ? 2 : taskInfo.priority === 'high' ? 4 : 8
          }],
          runs: mode === 'cto' ? [{
            runner: 'openclaw',
            task: `Implement: ${taskInfo.title}`
          }] : [],
          status: 'pending'
        };
      }
      }
    }

    // Generate COO decision for scheduling/notification intents
    if (mode === 'coo' && (intent === 'create_cron' || intent === 'send_email')) {
      if (intent === 'create_cron') {
        const cronInfo = parseCronSchedule(prompt);
        if (cronInfo) {
          decision = {
            id: uuidv4(),
            type: 'schedule',
            title: cronInfo.name,
            description: `Scheduled job: ${cronInfo.name} (${cronInfo.schedule})`,
            crons: [cronInfo],
            emails: prompt.includes('email') ? [{
              to: ['user@example.com'],
              subject: cronInfo.name,
              body: 'Automated scheduled email'
            }] : [],
            status: 'pending'
          };
        }
      } else if (intent === 'send_email') {
        const emailInfo = parseEmailIntent(prompt);
        if (emailInfo) {
          decision = {
            id: uuidv4(),
            type: 'notify',
            title: `Send: ${emailInfo.subject}`,
            description: `Email notification to ${emailInfo.to.join(', ')}`,
            crons: [],
            emails: [emailInfo],
            status: 'pending'
          };
        }
      }
    }

    // Fallback action-first behavior:
    // if no explicit decision was produced, convert input into an actionable task + run.
    if (!decision && guard.safe) {
      const taskInfo = parseTaskIntent(prompt);
      if (taskInfo) {
        mode = defaultMode === 'auto' || !defaultMode ? 'cto' : mode;
        plannedIntent = 'create_task';
        plan = generatePlan(plannedIntent, mode, prompt);
        decision = {
          id: uuidv4(),
          type: 'implementation',
          title: taskInfo.title,
          description: taskInfo.description || `Action generated from prompt: "${prompt}"`,
          tasks: [{
            title: taskInfo.title,
            description: taskInfo.description,
            priority: taskInfo.priority,
            estimatedHours: taskInfo.priority === 'urgent' ? 2 : taskInfo.priority === 'high' ? 4 : 8,
          }],
          runs: [{
            runner: 'openclaw',
            task: `Execute action plan for: ${taskInfo.title}`,
          }],
          status: 'pending',
        };
      }
    }

    return { mode, plan, decision, injectionDetected: !guard.safe };
  }, []);

  const executeStep = useCallback(async (
    step: PlanStep,
    prompt: string,
    mode: CommandMode,
    decision?: CTODecision | COODecision,
    completedSteps?: PlanStep[]
  ): Promise<{ success: boolean; result?: StepResult; error?: string }> => {
    switch (step.type) {
      case 'ledger_log':
        try {
          await fetch('/api/ledger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'command_initiated',
              source: 'command_surface',
              payload: { prompt, mode, step: step.id }
            })
          });
          return { success: true, result: { logged: true } };
        } catch (error) {
          return { success: false, error: String(error) };
        }

      case 'create_cron':
        if (decision && 'crons' in decision && decision.crons.length > 0) {
          const cron = decision.crons[0];
          try {
            const res = await fetch('/api/crons', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: cron.name,
                schedule: cron.schedule,
                handler: cron.handler,
                enabled: true
              })
            });
            const data = await res.json();
            if (res.ok) {
              return { success: true, result: { cronId: data.data?.id } };
            }
            return { success: false, error: data.error };
          } catch (error) {
            return { success: false, error: String(error) };
          }
        }
        return { success: false, error: 'No cron configuration found' };

      case 'send_email':
        if (decision && 'emails' in decision && decision.emails.length > 0) {
          const email = decision.emails[0];
          try {
            const res = await fetch('/api/emails/outbox', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: email.to[0],
                subject: email.subject,
                body_md: email.body
              })
            });
            const data = await res.json();
            if (res.ok) {
              return { success: true, result: { emailId: data.data?.id } };
            }
            return { success: false, error: data.error };
          } catch (error) {
            return { success: false, error: String(error) };
          }
        }
        return { success: false, error: 'No email configuration found' };

      case 'create_task':
        if (decision && 'tasks' in decision && decision.tasks.length > 0) {
          const task = decision.tasks[0];
          try {
            const res = await fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: task.title,
                description: task.description,
                priority: task.priority,
                status: 'backlog'
              })
            });
            const data = await res.json();
            if (res.ok || data.queued) {
              return { success: true, result: { taskId: data.data?.id || 'queued', queued: data.queued } };
            }
            return { success: false, error: data.error };
          } catch (error) {
            return { success: false, error: String(error) };
          }
        }
        return { success: false, error: 'No task configuration found' };

      case 'create_project':
        if (decision && 'projects' in decision && decision.projects && decision.projects.length > 0) {
          const project = decision.projects[0];
          try {
            const workspaceRes = await fetch('/api/user/workspace');
            const workspaceJson = await workspaceRes.json();
            const workspaceId = workspaceJson?.data?.workspace_id ?? workspaceJson?.workspace_id;

            if (!workspaceRes.ok || !workspaceId) {
              return { success: false, error: workspaceJson?.error || 'No workspace found for project creation' };
            }

            const res = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: project.name,
                description: project.description,
                workspace_id: workspaceId,
                status: 'active',
              })
            });
            const data = await res.json();
            if (res.ok) {
              return {
                success: true,
                result: {
                  projectId: data.data?.id,
                  slug: data.data?.slug
                }
              };
            }
            return { success: false, error: data.error || 'Project creation failed' };
          } catch (error) {
            return { success: false, error: String(error) };
          }
        }
        return { success: false, error: 'No project configuration found' };

      case 'create_run':
        if (decision && 'runs' in decision && decision.runs.length > 0) {
          const run = decision.runs[0];
          try {
            const res = await fetch('/api/runs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                runner: run.runner,
                status: 'pending',
                summary: run.task
              })
            });
            const data = await res.json();
            if (res.ok) {
              return { success: true, result: { runId: data.data?.id } };
            }
            return { success: false, error: data.error };
          } catch (error) {
            return { success: false, error: String(error) };
          }
        }
        return { success: true, result: { skipped: true } };

      case 'verify': {
        // Verify by checking the resource actually exists in the DB
        const projectStep = completedSteps?.find(s => s.type === 'create_project' && s.result && (s.result as any).projectId);
        const taskStep = completedSteps?.find(s => s.type === 'create_task' && s.result && (s.result as any).taskId && (s.result as any).taskId !== 'queued');
        const cronStep = completedSteps?.find(s => s.type === 'create_cron' && s.result && (s.result as any).cronId);
        const runStep = completedSteps?.find(s => s.type === 'create_run' && s.result && (s.result as any).runId);

        try {
          if (projectStep?.result) {
            const projectId = (projectStep.result as any).projectId;
            const res = await fetch(`/api/projects?id=${projectId}`);
            if (!res.ok) return { success: false, error: 'Project not found in database after creation' };
            return { success: true, result: { verified: true, type: 'project', id: projectId } };
          }
          if (taskStep?.result) {
            const taskId = (taskStep.result as any).taskId;
            const res = await fetch(`/api/tasks/${taskId}`);
            if (!res.ok) return { success: false, error: 'Task not found in database after creation' };
            return { success: true, result: { verified: true, type: 'task', id: taskId } };
          }
          if (cronStep?.result) {
            const cronId = (cronStep.result as any).cronId;
            const res = await fetch(`/api/crons/${cronId}`);
            if (!res.ok) return { success: false, error: 'Cron not found in database after creation' };
            return { success: true, result: { verified: true, type: 'cron', id: cronId } };
          }
          if (runStep?.result) {
            const runId = (runStep.result as any).runId;
            const res = await fetch(`/api/runs/${runId}`);
            if (!res.ok) return { success: false, error: 'Run not found in database after creation' };
            return { success: true, result: { verified: true, type: 'run', id: runId } };
          }
          // No verifiable resource — treat as verified
          return { success: true, result: { verified: true } };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }

      case 'report': {
        // Post execution summary to ledger
        try {
          const completedTypes = completedSteps?.map(s => s.type) || [];
          const resourceId = completedSteps?.find(s => s.result && (s.result as any).taskId || (s.result as any)?.cronId || (s.result as any)?.runId)?.result;
          await fetch('/api/ledger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'command_completed',
              source: 'command_surface',
              payload: {
                prompt,
                mode,
                steps_completed: completedTypes,
                resource: resourceId || null
              }
            })
          });
          return { success: true, result: { reported: true } };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }

      default:
        return { success: false, error: 'Unknown step type' };
    }
  }, []);

  const executeCommand = useCallback(async (
    prompt: string, 
    mode: CommandMode,
    plan: CommandPlan,
    decision?: CTODecision | COODecision,
    options?: { historyId?: string; existingRunId?: string }
  ): Promise<CommandExecution> => {
    setIsProcessing(true);
    setStreamingText('');
    cancelRequestedRef.current = false;

    const historyId = options?.historyId ?? uuidv4();
    const now = new Date().toISOString();
    const bootstrapRunId = options?.existingRunId ?? await createCommandRun(prompt, mode);
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
    
    const execution: CommandExecution = {
      id: uuidv4(),
      prompt,
      mode,
      plan,
      status: 'executing',
      currentStepIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setExecution(execution);

    // Execute each step
    for (let i = 0; i < plan.steps.length; i++) {
      if (cancelRequestedRef.current) {
        execution.status = 'failed';
        execution.error = 'Cancelled by user';
        setExecution({ ...execution });
        const cancelledItem: CommandHistoryItem = {
          ...historyBase,
          status: 'failed',
          error: 'Cancelled by user',
          outputPreview: 'Stopped by user',
          updatedAt: new Date().toISOString(),
        };
        upsertHistoryItem(cancelledItem);
        logHistoryEvent(cancelledItem);
        await finalizeCommandRun(bootstrapRunId, 'cancelled', 'Stopped by user');
        setIsProcessing(false);
        return execution;
      }
      const step = plan.steps[i];
      execution.currentStepIndex = i;
      step.status = 'in_progress';
      setExecution({ ...execution });

      const result = await executeStep(step, prompt, mode, decision, plan.steps.slice(0, i));
      
      if (result.success) {
        step.status = 'completed';
        step.result = result.result;
      } else {
        step.status = 'failed';
        step.error = result.error;
        execution.status = 'failed';
        execution.error = result.error;
        setExecution({ ...execution });
        const failedItem: CommandHistoryItem = {
          ...historyBase,
          status: 'failed',
          error: result.error,
          outputPreview: result.error,
          updatedAt: new Date().toISOString(),
        };
        upsertHistoryItem(failedItem);
        logHistoryEvent(failedItem);
        await finalizeCommandRun(bootstrapRunId, 'failed', summarizeOutput(result.error ?? 'Execution failed'));
        setIsProcessing(false);
        return execution;
      }

      execution.updatedAt = new Date();
      setExecution({ ...execution });
    }

    execution.status = 'completed';
    setExecution({ ...execution });
    setIsProcessing(false);

    // Start polling the run if a create_run step produced a runId
    const runStep = plan.steps.find(
      s => s.type === 'create_run' && s.result && (s.result as { runId?: string }).runId
    );
    if (runStep?.result) {
      const runId = (runStep.result as { runId: string }).runId;
      if (runId) {
        startRunTracking(runId);
      }
    }

    const completionRunId =
      (runStep?.result && (runStep.result as { runId?: string }).runId) || bootstrapRunId;
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

    return execution;
  }, [createCommandRun, executeStep, finalizeCommandRun, logHistoryEvent, startRunTracking, upsertHistoryItem]);

  /**
   * submitPrompt — streaming-first command execution.
   *
   * Calls /api/command-surface/execute, reads the SSE stream from ClawdBot,
   * and updates streamingText as tokens arrive.  Falls back to the existing
   * step-execution engine if the streaming endpoint returns a non-SSE response
   * (e.g. 503 JSON error).
   */
  const submitPrompt = useCallback(async (
    prompt: string,
    mode: CommandMode,
    decision?: CTODecision | COODecision,
  ): Promise<CommandExecution> => {
    setIsProcessing(true);
    setStreamingText('');
    cancelRequestedRef.current = false;

    // Build a minimal execution shell so the UI renders immediately
    const { intent, confidence } = detectIntent(prompt);
    const resolvedMode = mode === 'auto' ? determineMode(intent, prompt) : mode;
    const plan = generatePlan(intent, resolvedMode, prompt);
    const historyId = uuidv4();
    const runId = await createCommandRun(prompt, resolvedMode);
    const startedAt = new Date().toISOString();
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

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const res = await fetch('/api/command-surface/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode }),
        signal: controller.signal,
      });

      // Non-SSE response means ClawdBot is down or auth failed
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('text/event-stream')) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const json = await res.json() as { error?: string; message?: string };
          errorMsg = json.error ?? json.message ?? errorMsg;
        } catch { /* ignore */ }

        // Retry with the local step engine for transient service outages.
        if (res.status >= 500) {
          setStreamingText(`Agent stream unavailable (${errorMsg}). Running local fallback workflow...`);
          const fallback = await executeCommand(prompt, resolvedMode, plan, decision, {
            historyId,
            existingRunId: runId,
          });
          if (fallback.status === 'failed') {
            fallback.error = `Agent stream unavailable: ${errorMsg}. Local fallback failed: ${fallback.error ?? 'unknown error'}`;
          }
          return fallback;
        }

        exec.status = 'failed';
        exec.error = errorMsg;
        setExecution({ ...exec });
        const failedItem: CommandHistoryItem = {
          ...historyBase,
          status: 'failed',
          error: errorMsg,
          outputPreview: summarizeOutput(errorMsg),
          updatedAt: new Date().toISOString(),
        };
        upsertHistoryItem(failedItem);
        logHistoryEvent(failedItem);
        await finalizeCommandRun(runId, 'failed', summarizeOutput(errorMsg));
        setIsProcessing(false);
        return exec;
      }

      // Read SSE stream
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
              // ClawdBot may send final full output in done event
              if (typeof event.output === 'string' && event.output.length > accumulated.length) {
                accumulated = event.output;
                setStreamingText(accumulated);
              }
            } else if (event.type === 'error') {
              throw new Error(typeof event.message === 'string' ? event.message : 'Stream error');
            }
          } catch (parseErr) {
            // Skip malformed SSE lines unless they carry an error message
            if (parseErr instanceof Error && parseErr.message !== 'Stream error') continue;
            throw parseErr;
          }
        }
      }

      if (degradedStatus !== null && degradedStatus >= 400) {
        setStreamingText(`Agent stream degraded (HTTP ${degradedStatus}). Running local fallback workflow...`);
        const fallback = await executeCommand(prompt, resolvedMode, plan, decision, {
          historyId,
          existingRunId: runId,
        });
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
        ...historyBase,
        status: 'completed',
        outputPreview: summarizeOutput(accumulated),
        updatedAt: new Date().toISOString(),
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
      await finalizeCommandRun(
        runId,
        cancelled ? 'cancelled' : 'failed',
        summarizeOutput(cancelled ? 'Stopped by user' : message),
      );
      abortControllerRef.current = null;
      setIsProcessing(false);
      return exec;
    }
  }, [createCommandRun, executeCommand, finalizeCommandRun, logHistoryEvent, upsertHistoryItem]);

  return {
    execution,
    isProcessing,
    streamingText,
    analyzePrompt,
    executeCommand,
    submitPrompt,
    clearExecution,
    cancelExecution,
    history,
  };
}
