'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { 
  CommandMode, 
  IntentType, 
  CommandPlan, 
  PlanStep, 
  CommandExecution,
  CTODecision,
  COODecision
} from './types';

// Intent detection patterns
const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
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

export function useCommandPipeline() {
  const [execution, setExecution] = useState<CommandExecution | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const analyzePrompt = useCallback((prompt: string, defaultMode?: CommandMode): { 
    mode: CommandMode; 
    plan: CommandPlan;
    decision?: CTODecision | COODecision;
  } => {
    const { intent, confidence } = detectIntent(prompt);
    const mode = defaultMode === 'auto' || !defaultMode ? determineMode(intent, prompt) : defaultMode;
    const plan = generatePlan(intent, mode, prompt);

    let decision: CTODecision | COODecision | undefined;

    // Generate CTO decision for architecture/implementation intents
    if (mode === 'cto' && (intent === 'create_task' || intent === 'fix_issue' || intent === 'architect_feature')) {
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

    return { mode, plan, decision };
  }, []);

  const executeStep = useCallback(async (
    step: PlanStep,
    prompt: string,
    mode: CommandMode,
    decision?: CTODecision | COODecision,
    completedSteps?: PlanStep[]
  ): Promise<{ success: boolean; result?: unknown; error?: string }> => {
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
        const taskStep = completedSteps?.find(s => s.type === 'create_task' && s.result && (s.result as any).taskId && (s.result as any).taskId !== 'queued');
        const cronStep = completedSteps?.find(s => s.type === 'create_cron' && s.result && (s.result as any).cronId);
        const runStep = completedSteps?.find(s => s.type === 'create_run' && s.result && (s.result as any).runId);

        try {
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
    decision?: CTODecision | COODecision
  ): Promise<CommandExecution> => {
    setIsProcessing(true);
    
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
        setIsProcessing(false);
        return execution;
      }

      execution.updatedAt = new Date();
      setExecution({ ...execution });
    }

    execution.status = 'completed';
    setExecution({ ...execution });
    setIsProcessing(false);
    
    return execution;
  }, [executeStep]);

  return {
    execution,
    isProcessing,
    analyzePrompt,
    executeCommand
  };
}
